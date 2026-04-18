-- =============================================================================
-- PL06 + PL07 — RPCs atómicos para delete requisiciones y registrar entrega
-- Fecha: 17-Abr-2026
-- Autor: Auditoría ARIA27
--
-- PROBLEMAS QUE CIERRA:
--   PL06: /api/requisicion/delete hacía 6 pasos secuenciales sin transacción.
--         Si pasos 2-5 fallaban parcialmente, backup existía pero los hijos
--         quedaban huérfanos.
--   PL07: /api/requisicion/registrar-entrega leía inventario_obra luego hacía
--         update o insert. Dos entregas concurrentes del mismo producto
--         causaban doble inserción o pérdida de stock por race condition.
--
-- CÓMO APLICAR (desde Supabase SQL editor o CLI):
--   1) Pegar este archivo completo.
--   2) Verificar que retorna NOTICE OK.
--   3) Probar en staging (si existe) antes de prod.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PL06 — delete_requisition_cascade(p_req_id UUID, p_deleted_by TEXT)
-- Ejecuta en una transacción única: lock → gather → backup → cascade delete.
-- Retorna JSONB con { ok: bool, folio: text, error?: text, code?: text }.
-- SECURITY DEFINER para que service role la pueda llamar sin RLS interference.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION delete_requisition_cascade(
  p_req_id UUID,
  p_deleted_by TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req_data       JSONB;
  v_items_data     JSONB;
  v_quotes_data    JSONB;
  v_pos_data       JSONB;
  v_entregas_data  JSONB;
  v_folio          TEXT;
  v_cost_center    TEXT;
  v_created_by     TEXT;
  v_status         TEXT;
  v_item_ids       UUID[];
BEGIN
  -- 1. Lock row + read
  SELECT to_jsonb(r),
         r.folio, r.cost_center_name, r.created_by, r.status
    INTO v_req_data, v_folio, v_cost_center, v_created_by, v_status
    FROM requisitions r
   WHERE r.id = p_req_id
     FOR UPDATE;

  IF v_req_data IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  -- 2. Gather related (items + ids + quotes + POs + entregas)
  SELECT COALESCE(jsonb_agg(to_jsonb(ri)), '[]'::jsonb),
         COALESCE(array_agg(ri.id), ARRAY[]::uuid[])
    INTO v_items_data, v_item_ids
    FROM requisition_items ri
   WHERE ri.requisition_id = p_req_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb)
    INTO v_quotes_data
    FROM requisition_item_quotes q
   WHERE q.requisition_item_id = ANY(v_item_ids);

  SELECT COALESCE(jsonb_agg(to_jsonb(po)), '[]'::jsonb)
    INTO v_pos_data
    FROM purchase_orders po
   WHERE po.requisition_id = p_req_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(e)), '[]'::jsonb)
    INTO v_entregas_data
    FROM entregas e
   WHERE e.requisition_id = p_req_id;

  -- 3. Backup en deleted_records
  INSERT INTO deleted_records (source_table, source_id, data, related_data, deleted_by, restore_notes)
  VALUES (
    'requisitions',
    p_req_id,
    v_req_data,
    jsonb_build_object(
      'items', v_items_data,
      'item_quotes', v_quotes_data,
      'purchase_orders', v_pos_data,
      'entregas', v_entregas_data
    ),
    p_deleted_by,
    format('Folio: %s | Obra: %s | Solicitante: %s | Status: %s',
           COALESCE(v_folio, 'N/A'),
           COALESCE(v_cost_center, 'N/A'),
           COALESCE(v_created_by, 'N/A'),
           COALESCE(v_status, 'N/A'))
  );

  -- 4. Cascade delete (nietos → hijos → padre, misma transacción)
  DELETE FROM entregas                WHERE requisition_id      = p_req_id;
  DELETE FROM requisition_item_quotes WHERE requisition_item_id = ANY(v_item_ids);
  DELETE FROM purchase_orders         WHERE requisition_id      = p_req_id;
  DELETE FROM requisition_items       WHERE requisition_id      = p_req_id;
  DELETE FROM requisitions            WHERE id                  = p_req_id;

  RETURN jsonb_build_object('ok', true, 'folio', COALESCE(v_folio, ''));
EXCEPTION WHEN OTHERS THEN
  -- ROLLBACK automático: la función entera es una transacción implícita.
  RETURN jsonb_build_object(
    'ok', false,
    'error', SQLERRM,
    'code', SQLSTATE
  );
END;
$$;

COMMENT ON FUNCTION delete_requisition_cascade(UUID, TEXT) IS
  'PL06 17-Abr-2026: delete atómico de requisición con backup + cascade. Reemplaza los 6 pasos secuenciales del handler, que dejaban estado inconsistente ante fallas parciales.';


-- ─────────────────────────────────────────────────────────────────────────────
-- PL07 — aplicar_entrega_inventario(p_obra_id INT, p_obra_nombre TEXT, p_materiales JSONB)
-- Aplica lista de materiales a inventario_obra de forma atómica:
--   Para cada material: SELECT FOR UPDATE sobre la fila (si existe) → UPDATE,
--   o INSERT si no existe. Todo en una transacción → sin race condition.
-- Retorna { ok: int, errors: int, details: [...] }.
--
-- REQUIERE: índice único en (obra_id, producto_nombre) para el ON CONFLICT.
-- Si no existe, crearlo primero (ver ÍNDICE CRÍTICO abajo).
-- ─────────────────────────────────────────────────────────────────────────────

-- ÍNDICE CRÍTICO (idempotente): habilita el ON CONFLICT del UPSERT.
CREATE UNIQUE INDEX IF NOT EXISTS inventario_obra_uniq_obra_producto
  ON inventario_obra (obra_id, producto_nombre);

CREATE OR REPLACE FUNCTION aplicar_entrega_inventario(
  p_obra_id      INT,
  p_obra_nombre  TEXT,
  p_materiales   JSONB     -- [{product_name,quantity,unit}, ...]
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok         INT := 0;
  v_err        INT := 0;
  v_item       JSONB;
  v_prod       TEXT;
  v_cant       NUMERIC;
  v_unidad     TEXT;
BEGIN
  IF p_materiales IS NULL OR jsonb_typeof(p_materiales) <> 'array' THEN
    RETURN jsonb_build_object('ok', 0, 'errors', 0, 'skipped', 'materiales_no_array');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_materiales) LOOP
    v_prod   := COALESCE(v_item->>'product_name', v_item->>'producto', '');
    v_cant   := COALESCE((v_item->>'quantity')::numeric,
                         (v_item->>'cantidad_recibida')::numeric, 0);
    v_unidad := COALESCE(v_item->>'unit', v_item->>'unidad', 'PZA');

    IF v_prod = '' OR v_cant <= 0 THEN
      CONTINUE;
    END IF;

    BEGIN
      -- UPSERT atómico: si existe (obra_id, producto_nombre), suma cantidad;
      -- si no, inserta fila nueva. El índice único garantiza concurrencia segura.
      INSERT INTO inventario_obra (
        obra_id, obra_nombre, producto_nombre, unidad,
        cantidad_disponible, cantidad_usada, ultimo_movimiento
      ) VALUES (
        p_obra_id, p_obra_nombre, v_prod, v_unidad,
        v_cant, 0, NOW()
      )
      ON CONFLICT (obra_id, producto_nombre) DO UPDATE
      SET cantidad_disponible = inventario_obra.cantidad_disponible + EXCLUDED.cantidad_disponible,
          ultimo_movimiento   = NOW();

      v_ok := v_ok + 1;
    EXCEPTION WHEN OTHERS THEN
      v_err := v_err + 1;
      RAISE NOTICE 'aplicar_entrega_inventario item fail: % (%) — %', v_prod, SQLSTATE, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object('ok', v_ok, 'errors', v_err);
END;
$$;

COMMENT ON FUNCTION aplicar_entrega_inventario(INT, TEXT, JSONB) IS
  'PL07 17-Abr-2026: UPSERT atómico de materiales a inventario_obra. Reemplaza el read-then-write del handler, que tenía race condition bajo entregas concurrentes.';


-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'PL06 + PL07 RPCs creadas OK. Probar con:';
  RAISE NOTICE '  SELECT delete_requisition_cascade(''<uuid>'', ''test@example.com'');';
  RAISE NOTICE '  SELECT aplicar_entrega_inventario(1, ''OBRA-TEST'', ''[{"product_name":"X","quantity":10,"unit":"PZA"}]''::jsonb);';
END $$;
