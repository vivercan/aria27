const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://yhylkvpynzyorqortbkk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo'
);

async function verificarCobertura() {
  console.log('========================================');
  console.log('   VERIFICACIÓN DE COBERTURA');
  console.log('========================================\n');

  // 1. Cargar TODAS las relaciones (paginando)
  let allRelations = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('product_suppliers')
      .select('product_id, supplier_id')
      .range(page * 1000, (page + 1) * 1000 - 1);
    
    if (error) {
      console.log(`Error cargando relaciones: ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;
    allRelations = allRelations.concat(data);
    page++;
  }
  console.log(`Total relaciones en BD: ${allRelations.length}`);

  // 2. Cargar todos los productos
  let products = [];
  page = 0;
  while (true) {
    const { data } = await supabase.from('products').select('id, name, category').range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    products = products.concat(data);
    page++;
  }
  console.log(`Total productos: ${products.length}`);

  // 3. Contar proveedores por producto
  const provsPorProducto = {};
  allRelations.forEach(r => {
    provsPorProducto[r.product_id] = (provsPorProducto[r.product_id] || 0) + 1;
  });

  // 4. Clasificar
  const stats = { sin: 0, con1: 0, con2: 0, con3: 0, con4: 0, con5mas: 0 };
  const sinProveedor = [];

  products.forEach(p => {
    const count = provsPorProducto[p.id] || 0;
    if (count === 0) {
      stats.sin++;
      sinProveedor.push(p);
    }
    else if (count === 1) stats.con1++;
    else if (count === 2) stats.con2++;
    else if (count === 3) stats.con3++;
    else if (count === 4) stats.con4++;
    else stats.con5mas++;
  });

  console.log('\n========================================');
  console.log('   COBERTURA ACTUAL');
  console.log('========================================\n');
  console.log(`❌ Sin proveedor:     ${stats.sin} (${(stats.sin/products.length*100).toFixed(1)}%)`);
  console.log(`⚠️  Con 1 proveedor:   ${stats.con1} (${(stats.con1/products.length*100).toFixed(1)}%)`);
  console.log(`⚠️  Con 2 proveedores: ${stats.con2} (${(stats.con2/products.length*100).toFixed(1)}%)`);
  console.log(`⚠️  Con 3 proveedores: ${stats.con3} (${(stats.con3/products.length*100).toFixed(1)}%)`);
  console.log(`⚠️  Con 4 proveedores: ${stats.con4} (${(stats.con4/products.length*100).toFixed(1)}%)`);
  console.log(`✅ Con 5+ proveedores: ${stats.con5mas} (${(stats.con5mas/products.length*100).toFixed(1)}%)`);

  // 5. Productos sin proveedor por categoría
  if (sinProveedor.length > 0) {
    console.log('\n=== PRODUCTOS SIN PROVEEDOR POR CATEGORÍA ===\n');
    const sinProvPorCat = {};
    sinProveedor.forEach(p => {
      const cat = p.category || 'Sin categoría';
      sinProvPorCat[cat] = (sinProvPorCat[cat] || 0) + 1;
    });
    Object.entries(sinProvPorCat).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });
  }

  console.log('\n========================================');
  console.log(`RESUMEN: ${products.length - stats.sin} de ${products.length} productos tienen proveedor (${((products.length - stats.sin)/products.length*100).toFixed(1)}%)`);
  console.log('========================================');
}

verificarCobertura().catch(err => console.error('Error:', err));
