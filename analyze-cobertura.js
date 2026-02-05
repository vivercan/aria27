const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://yhylkvpynzyorqortbkk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo'
);

async function analyzeCobertura() {
  console.log('========================================');
  console.log('   ANALISIS DE COBERTURA DE PROVEEDORES');
  console.log('========================================\n');

  // 1. Cargar todos los productos
  let products = [];
  let page = 0;
  while (true) {
    const { data } = await supabase.from('products').select('id, name, category').range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    products = products.concat(data);
    page++;
  }
  console.log('Total productos: ' + products.length);

  // 2. Cargar todas las relaciones
  const { data: relations } = await supabase.from('product_suppliers').select('product_id, supplier_id');
  console.log('Total relaciones: ' + (relations ? relations.length : 0) + '\n');

  if (!relations || relations.length === 0) {
    console.log('⚠️  NO HAY RELACIONES product_suppliers');
    console.log('Todos los ' + products.length + ' productos necesitan proveedores asignados');
    
    // Mostrar categorías
    const cats = {};
    products.forEach(p => {
      const cat = p.category || 'Sin categoria';
      cats[cat] = (cats[cat] || 0) + 1;
    });
    console.log('\n=== PRODUCTOS POR CATEGORIA ===\n');
    Object.entries(cats).sort((a,b) => b[1] - a[1]).forEach(([cat, count]) => {
      console.log('  ' + cat + ': ' + count + ' productos');
    });
    return;
  }

  // 3. Contar proveedores por producto
  const proveedoresPorProducto = {};
  relations.forEach(r => {
    proveedoresPorProducto[r.product_id] = (proveedoresPorProducto[r.product_id] || 0) + 1;
  });

  // 4. Clasificar productos
  const stats = {
    sinProveedor: [],
    con1: [],
    con2: [],
    con3: [],
    con4: [],
    con5mas: []
  };

  products.forEach(p => {
    const count = proveedoresPorProducto[p.id] || 0;
    if (count === 0) stats.sinProveedor.push(p);
    else if (count === 1) stats.con1.push(p);
    else if (count === 2) stats.con2.push(p);
    else if (count === 3) stats.con3.push(p);
    else if (count === 4) stats.con4.push(p);
    else stats.con5mas.push(p);
  });

  console.log('=== COBERTURA DE PROVEEDORES ===\n');
  console.log('❌ Sin proveedor:     ' + stats.sinProveedor.length + ' productos (' + (stats.sinProveedor.length/products.length*100).toFixed(1) + '%)');
  console.log('⚠️  Con 1 proveedor:   ' + stats.con1.length + ' productos');
  console.log('⚠️  Con 2 proveedores: ' + stats.con2.length + ' productos');
  console.log('⚠️  Con 3 proveedores: ' + stats.con3.length + ' productos');
  console.log('⚠️  Con 4 proveedores: ' + stats.con4.length + ' productos');
  console.log('✅ Con 5+ proveedores: ' + stats.con5mas.length + ' productos (' + (stats.con5mas.length/products.length*100).toFixed(1) + '%)');

  const necesitanMas = stats.sinProveedor.length + stats.con1.length + stats.con2.length + stats.con3.length + stats.con4.length;
  console.log('\n🎯 PRODUCTOS QUE NECESITAN MAS PROVEEDORES: ' + necesitanMas);

  // 5. Por categoría - productos que necesitan proveedores
  console.log('\n=== PRODUCTOS SIN 5 PROVEEDORES POR CATEGORIA ===\n');
  const necesitanPorCat = {};
  [...stats.sinProveedor, ...stats.con1, ...stats.con2, ...stats.con3, ...stats.con4].forEach(p => {
    const cat = p.category || 'Sin categoria';
    necesitanPorCat[cat] = (necesitanPorCat[cat] || 0) + 1;
  });
  Object.entries(necesitanPorCat).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log('  ' + cat + ': ' + count + ' productos');
  });

  // 6. Proveedores actuales
  console.log('\n=== PROVEEDORES REGISTRADOS ===\n');
  const { data: suppliers } = await supabase.from('suppliers').select('id, name, categories, estado').eq('estado', 'ACTIVO');
  if (suppliers) {
    console.log('Total proveedores activos: ' + suppliers.length + '\n');
    suppliers.forEach(s => {
      console.log('  [' + s.id + '] ' + s.name + ' - Categorias: ' + (s.categories || 'N/A'));
    });
  }

  console.log('\n========================================');
  console.log('RESUMEN:');
  console.log('  ✅ Con 5+ proveedores: ' + stats.con5mas.length + '/' + products.length);
  console.log('  ❌ Necesitan mas:      ' + necesitanMas + '/' + products.length);
  console.log('  🎯 OBJETIVO: 100% con 5+ proveedores');
  console.log('========================================');
}

analyzeCobertura();
