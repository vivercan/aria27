const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://yhylkvpynzyorqortbkk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo'
);

async function analizar() {
  // Cargar productos
  let products = [];
  let page = 0;
  while (true) {
    const { data } = await supabase.from('products').select('id, category').range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    products = products.concat(data);
    page++;
  }

  // Cargar relaciones
  let rels = [];
  page = 0;
  while (true) {
    const { data } = await supabase.from('product_suppliers').select('product_id').range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    rels = rels.concat(data);
    page++;
  }

  const countByProduct = {};
  rels.forEach(r => {
    countByProduct[r.product_id] = (countByProduct[r.product_id] || 0) + 1;
  });

  // Productos con menos de 5 proveedores por categoría
  const catProblemas = {};
  products.forEach(p => {
    const count = countByProduct[p.id] || 0;
    if (count < 5) {
      const cat = p.category || 'Sin categoría';
      if (!catProblemas[cat]) catProblemas[cat] = { total: 0, provs: [] };
      catProblemas[cat].total++;
      catProblemas[cat].provs.push(count);
    }
  });

  console.log('========================================');
  console.log('CATEGORÍAS QUE NECESITAN MÁS PROVEEDORES');
  console.log('(Productos con menos de 5 proveedores)');
  console.log('========================================\n');

  Object.entries(catProblemas)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([cat, data]) => {
      const avg = (data.provs.reduce((a,b) => a+b, 0) / data.provs.length).toFixed(1);
      console.log(`${cat}: ${data.total} productos (promedio ${avg} proveedores)`);
    });

  const totalProblemas = Object.values(catProblemas).reduce((a, b) => a + b.total, 0);
  console.log(`\n========================================`);
  console.log(`TOTAL: ${totalProblemas} productos necesitan más proveedores`);
  console.log(`========================================`);
}

analizar();
