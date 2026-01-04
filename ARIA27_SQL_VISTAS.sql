-- EJECUTAR EN SUPABASE SQL EDITOR
-- https://supabase.com/dashboard/project/yhylkvpynzyorqortbkk/sql

CREATE OR REPLACE VIEW "Personal" AS SELECT * FROM employees;
CREATE OR REPLACE VIEW "Productos" AS SELECT * FROM products;
CREATE OR REPLACE VIEW "Proveedores" AS SELECT * FROM suppliers;
CREATE OR REPLACE VIEW "Requisiciones" AS SELECT * FROM requisitions;

-- Verificar
SELECT table_name FROM information_schema.views WHERE table_schema = 'public';
