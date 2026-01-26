-- =====================================================
-- MIGRACIÓN COMPLETA: CAMPOS PARA REQUISICIONES
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. AGREGAR CAMPOS A SUPPLIERS (datos bancarios)
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS banco VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS numero_cuenta VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS clabe VARCHAR(20);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS nombre_cuenta VARCHAR(200);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS rfc VARCHAR(15);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);

-- 2. AGREGAR CAMPOS A REQUISICIONES
ALTER TABLE "Requisiciones" ADD COLUMN IF NOT EXISTS categoria VARCHAR(100);
ALTER TABLE "Requisiciones" ADD COLUMN IF NOT EXISTS subcategoria VARCHAR(100);
ALTER TABLE "Requisiciones" ADD COLUMN IF NOT EXISTS proveedor_id UUID REFERENCES suppliers(id);
ALTER TABLE "Requisiciones" ADD COLUMN IF NOT EXISTS proveedor_nombre VARCHAR(200);
ALTER TABLE "Requisiciones" ADD COLUMN IF NOT EXISTS forma_pago VARCHAR(50) DEFAULT 'TRANSFERENCIA';
ALTER TABLE "Requisiciones" ADD COLUMN IF NOT EXISTS tipo_pago VARCHAR(50) DEFAULT 'ANTICIPADO';
ALTER TABLE "Requisiciones" ADD COLUMN IF NOT EXISTS fecha_pago DATE;
ALTER TABLE "Requisiciones" ADD COLUMN IF NOT EXISTS forma_entrega VARCHAR(100) DEFAULT 'UNA EXHIBICIÓN';
ALTER TABLE "Requisiciones" ADD COLUMN IF NOT EXISTS fecha_entrega DATE;
ALTER TABLE "Requisiciones" ADD COLUMN IF NOT EXISTS uso TEXT;
ALTER TABLE "Requisiciones" ADD COLUMN IF NOT EXISTS notas TEXT;
ALTER TABLE "Requisiciones" ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "Requisiciones" ADD COLUMN IF NOT EXISTS iva_porcentaje DECIMAL(5,2) DEFAULT 16;
ALTER TABLE "Requisiciones" ADD COLUMN IF NOT EXISTS iva_monto DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "Requisiciones" ADD COLUMN IF NOT EXISTS total DECIMAL(12,2) DEFAULT 0;

-- 3. AGREGAR CAMPOS A REQUISITION_ITEMS (precios)
ALTER TABLE requisition_items ADD COLUMN IF NOT EXISTS precio_unitario DECIMAL(12,2) DEFAULT 0;
ALTER TABLE requisition_items ADD COLUMN IF NOT EXISTS precio_total DECIMAL(12,2) DEFAULT 0;

-- 4. CREAR PROVEEDOR DE EJEMPLO (materiales construcción)
INSERT INTO suppliers (id, name, contact_name, email, phone, banco, numero_cuenta, clabe, nombre_cuenta, rfc, active)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'MATERIALES PÉREZ S.A. DE C.V.',
  'Lic. Roberto Pérez',
  'ventas@materialesperez.com',
  '4499991234',
  'BBVA',
  '0123456789',
  '012345678901234567',
  'MATERIALES PÉREZ SA DE CV',
  'MPE200115ABC',
  true
) ON CONFLICT (id) DO UPDATE SET
  banco = EXCLUDED.banco,
  numero_cuenta = EXCLUDED.numero_cuenta,
  clabe = EXCLUDED.clabe,
  nombre_cuenta = EXCLUDED.nombre_cuenta,
  rfc = EXCLUDED.rfc;

-- 5. ACTUALIZAR REQUISICIÓN 1 (REQ-2025-00001) CON DATOS COMPLETOS
UPDATE "Requisiciones" 
SET 
  categoria = 'OBRA OFICINA MATRIZ',
  subcategoria = 'MATERIALES DE CONSTRUCCIÓN',
  proveedor_nombre = 'MATERIALES PÉREZ S.A. DE C.V.',
  forma_pago = 'TRANSFERENCIA',
  tipo_pago = 'ANTICIPADO',
  fecha_pago = CURRENT_DATE + INTERVAL '3 days',
  forma_entrega = 'UNA EXHIBICIÓN',
  fecha_entrega = required_date,
  uso = 'Reparación de instalaciones oficina',
  notas = 'Entregar en horario de 9:00 a 14:00 hrs. Preguntar por Ing. Reyes.',
  subtotal = 2850.00,
  iva_porcentaje = 16.00,
  iva_monto = 456.00,
  total = 3306.00
WHERE folio = 'REQ-2025-00001';

-- 6. ACTUALIZAR REQUISICIÓN 2 (REQ-2025-00002) CON DATOS COMPLETOS  
UPDATE "Requisiciones"
SET 
  categoria = 'OBRA JESÚS FLORES',
  subcategoria = 'GASTOS OPERATIVOS',
  proveedor_nombre = 'FERRETERÍA EL MARTILLO',
  forma_pago = 'EFECTIVO (REBAJAN IVA)',
  tipo_pago = 'CONTRA ENTREGA',
  fecha_pago = CURRENT_DATE,
  forma_entrega = 'UNA EXHIBICIÓN',
  fecha_entrega = required_date,
  uso = 'Mantenimiento equipo de obra',
  notas = 'Material urgente para reparación de maquinaria.',
  subtotal = 1580.00,
  iva_porcentaje = 0.00,
  iva_monto = 0.00,
  total = 1580.00
WHERE folio = 'REQ-2025-00002';

-- 7. ACTUALIZAR ITEMS DE REQ-2025-00001 CON PRECIOS
UPDATE requisition_items ri
SET 
  precio_unitario = CASE 
    WHEN ri.product_name ILIKE '%cemento%' THEN 185.00
    WHEN ri.product_name ILIKE '%varilla%' THEN 95.00
    WHEN ri.product_name ILIKE '%arena%' THEN 450.00
    WHEN ri.product_name ILIKE '%grava%' THEN 520.00
    ELSE 150.00
  END,
  precio_total = ri.quantity * CASE 
    WHEN ri.product_name ILIKE '%cemento%' THEN 185.00
    WHEN ri.product_name ILIKE '%varilla%' THEN 95.00
    WHEN ri.product_name ILIKE '%arena%' THEN 450.00
    WHEN ri.product_name ILIKE '%grava%' THEN 520.00
    ELSE 150.00
  END
FROM "Requisiciones" r
WHERE ri.requisition_id = r.id AND r.folio = 'REQ-2025-00001';

-- 8. ACTUALIZAR ITEMS DE REQ-2025-00002 CON PRECIOS
UPDATE requisition_items ri
SET 
  precio_unitario = CASE 
    WHEN ri.product_name ILIKE '%aceite%' THEN 180.00
    WHEN ri.product_name ILIKE '%filtro%' THEN 250.00
    WHEN ri.product_name ILIKE '%tornillo%' THEN 5.00
    WHEN ri.product_name ILIKE '%tuerca%' THEN 3.50
    ELSE 100.00
  END,
  precio_total = ri.quantity * CASE 
    WHEN ri.product_name ILIKE '%aceite%' THEN 180.00
    WHEN ri.product_name ILIKE '%filtro%' THEN 250.00
    WHEN ri.product_name ILIKE '%tornillo%' THEN 5.00
    WHEN ri.product_name ILIKE '%tuerca%' THEN 3.50
    ELSE 100.00
  END
FROM "Requisiciones" r
WHERE ri.requisition_id = r.id AND r.folio = 'REQ-2025-00002';

-- 9. VERIFICAR RESULTADOS
SELECT folio, categoria, subcategoria, proveedor_nombre, subtotal, iva_porcentaje, total, status
FROM "Requisiciones"
WHERE folio IN ('REQ-2025-00001', 'REQ-2025-00002');

-- 10. VER ITEMS CON PRECIOS
SELECT r.folio, ri.product_name, ri.quantity, ri.unit, ri.precio_unitario, ri.precio_total
FROM requisition_items ri
JOIN "Requisiciones" r ON ri.requisition_id = r.id
WHERE r.folio IN ('REQ-2025-00001', 'REQ-2025-00002');
