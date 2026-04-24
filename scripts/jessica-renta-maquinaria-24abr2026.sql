-- 24-Abr-2026 Jessica Gallardo pide RENTA MAQUINARIA como subcategoria nueva.
INSERT INTO public.catalogos_requisiciones (tipo, valor, activo)
VALUES ('SUBCATEGORIA', 'RENTA MAQUINARIA', true)
ON CONFLICT DO NOTHING;

SELECT tipo, valor, activo
FROM public.catalogos_requisiciones
WHERE tipo = 'SUBCATEGORIA' AND valor = 'RENTA MAQUINARIA';
