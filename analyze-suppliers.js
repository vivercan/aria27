const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://yhylkvpynzyorqortbkk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo'
);

async function analyzeSuppliers() {
  console.log('========================================');
  console.log('   ANÁLISIS DE PROVEEDORES');
  console.log('========================================\n');

  // 1. Ver estructura de tablas relacionadas con proveedores
  const tables = ['suppliers', 'proveedores', 'vendors', 'supplier_products', 'product_suppliers', 'producto_proveedor'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error && data) {
      console.log(`✅ Tabla "${table}" existe - Columnas: ${Object.keys(data[0] || {}).join(', ')}`);
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      console.log(`   Registros: ${count}\n`);
    }
  }

  // 2. Analizar proveedores
  const { data: suppliers, error: suppError } = await supabase.from('suppliers').select('*');
  
  if (suppError) {
    console.log('Error con suppliers:', suppError.message);
    // Intentar con otro nombre
    const { data: proveedores } = await supabase.from('proveedores').select('*');
    if (proveedores) {
      console.log('\n=== PROVEEDORES (tabla: proveedores) ===');
      console.log(`Total: ${proveedores.length}`);
      proveedores.slice(0, 10).forEach(p => console.log(`  ${p.id}: ${p.nombre || p.name}`));
    }
  } else if (suppliers) {
    console.log('\n=== PROVEEDORES (tabla: suppliers) ===');
    console.log(`Total: ${suppliers.length}\n`);
    
    // Mostrar columnas disponibles
    if (suppliers[0]) {
      console.log('Columnas:', Object.keys(suppliers[0]).join(', '));
    }
    
    console.log('\nLista de proveedores:');
    suppliers.forEach(s => {
      const name = s.name || s.nombre || s.razon_social || 'Sin nombre';
      const city = s.city || s.ciudad || s.estado || '';
      const cats = s.categories || s.categorias || '';
      console.log(`  ${s.id}: ${name} ${city ? '('+city+')' : ''} ${cats ? '- '+cats : ''}`);
    });
  }

  // 3. Ver relación producto-proveedor
  console.log('\n=== RELACIÓN PRODUCTO-PROVEEDOR ===');
  const relTables = ['supplier_products', 'product_suppliers', 'producto_proveedor', 'suppliers_products'];
  
  for (const table of relTables) {
    const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' }).limit(5);
    if (!error) {
      console.log(`\nTabla "${table}":`);
      console.log(`  Total registros: ${count}`);
      if (data && data[0]) {
        console.log(`  Columnas: ${Object.keys(data[0]).join(', ')}`);
        console.log(`  Ejemplo:`, data[0]);
      }
    }
  }

  // 4. Analizar categorías de productos
  console.log('\n=== CATEGORÍAS DE PRODUCTOS ===');
  const { data: products } = await supabase.from('products').select('category').limit(5000);
  if (products) {
    const categories = {};
    products.forEach(p => {
      const cat = p.category || 'Sin categoría';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    
    console.log('Categorías y cantidad de productos:');
    Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count} productos`);
    });
  }

  console.log('\n========================================');
}

analyzeSuppliers();
