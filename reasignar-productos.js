const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://yhylkvpynzyorqortbkk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo'
);

const categoryMapping = {
  'ACERO Y PRODUCTOS METALICOS': ['ACEROS', 'ACERO', 'PERFILES', 'LAMINAS'],
  'ACERO Y PRODUCTOS METÁLICOS': ['ACEROS', 'ACERO', 'PERFILES', 'LAMINAS'],
  'ACERO ESTRUCTURAL': ['ACEROS', 'ACERO', 'PERFILES'],
  'AGREGADOS Y MATERIALES DE BANCO': ['AGREGADOS', 'BLOCKS', 'CONSTRUCCION'],
  'AGREGADOS Y MATERIALES': ['AGREGADOS', 'BLOCKS', 'CONSTRUCCION'],
  'CONCRETOS ASFALTOS Y ESTABILIZANTES': ['CONCRETOS'],
  'CONCRETOS ASFALTOS': ['CONCRETOS'],
  'MATERIAL ELECTRICO': ['ELECTRICO'],
  'ELECTRICIDAD': ['ELECTRICO'],
  'ELÉCTRICO': ['ELECTRICO'],
  'FERRETERIA Y FIJACION': ['FERRETERIA', 'HERRAMIENTAS'],
  'FERRETERÍA': ['FERRETERIA', 'HERRAMIENTAS'],
  'TORNILLERIA': ['FERRETERIA'],
  'HERRAMIENTA Y EQUIPO': ['HERRAMIENTAS', 'FERRETERIA', 'MAQUINARIA'],
  'HERRAMIENTA ELECTRICA': ['HERRAMIENTAS', 'ELECTRICO'],
  'EPP Y SEGURIDAD': ['EPP'],
  'EPP ADICIONAL': ['EPP'],
  'SENALIZACION Y SEGURIDAD': ['EPP', 'SEÑALIZACION'],
  'SENALIZACION VIAL': ['SEÑALIZACION'],
  'SEÑALIZACIÓN': ['SEÑALIZACION'],
  'COMBUSTIBLES Y LUBRICANTES': ['COMBUSTIBLES'],
  'TUBERIAS Y CONEXIONES': ['TUBERIAS', 'PLOMERIA'],
  'PLOMERIA': ['PLOMERIA', 'TUBERIAS'],
  'PINTURA Y ACABADOS': ['PINTURA'],
  'PINTURA': ['PINTURA'],
  'MADERAS Y TABLEROS': ['MADERA'],
  'PAPELERIA Y OFICINA': ['PAPELERIA'],
  'PAPELERÍA Y OFICINA': ['PAPELERIA'],
  'TECNOLOGIA': ['COMPUTO'],
  'EQUIPO DE CÓMPUTO': ['COMPUTO'],
  'MOBILIARIO OFICINA': ['PAPELERIA'],
  'CAFETERIA': ['ALIMENTOS'],
  'ALIMENTOS Y BEBIDAS': ['ALIMENTOS'],
  'MATERIALES DE CONSTRUCCION': ['CONSTRUCCION', 'AGREGADOS', 'BLOCKS', 'FERRETERIA'],
  'ALBANILERIA': ['CONSTRUCCION', 'FERRETERIA'],
  'TABLAROCA Y PLAFONES': ['CONSTRUCCION'],
  'PISOS Y AZULEJOS': ['CONSTRUCCION'],
  'VIDRIO Y ALUMINIO': ['CONSTRUCCION'],
  'PUERTAS Y HERRAJES': ['FERRETERIA'],
  'CERRAJERIA': ['FERRETERIA'],
  'MUEBLES DE BANO': ['PLOMERIA'],
  'QUIMICOS CONSTRUCCION': ['CONSTRUCCION', 'PINTURA'],
  'PREFABRICADOS': ['PREFABRICADOS', 'CONCRETOS'],
  'ANDAMIOS Y EQUIPO': ['MAQUINARIA'],
  'SERVICIOS Y RENTAS': ['MAQUINARIA'],
  'LIMPIEZA': ['FERRETERIA', 'LIMPIEZA'],
  'JARDINERIA': ['FERRETERIA'],
  'MANTENIMIENTO EDIFICIO': ['FERRETERIA', 'ELECTRICO'],
  'MISCELANEOS DE OBRA': ['FERRETERIA', 'CONSTRUCCION']
};

async function reasignarProductos() {
  console.log('========================================');
  console.log('   REASIGNANDO PRODUCTOS A PROVEEDORES');
  console.log('========================================\n');

  // 1. Cargar proveedores
  const { data: suppliers } = await supabase.from('suppliers').select('id, name, categories');
  console.log(`Proveedores: ${suppliers.length}`);

  // 2. Mapa categoría -> proveedores
  const suppliersByCategory = {};
  suppliers.forEach(s => {
    const cats = Array.isArray(s.categories) ? s.categories : [];
    cats.forEach(cat => {
      const catUpper = cat.toUpperCase().trim();
      if (!suppliersByCategory[catUpper]) suppliersByCategory[catUpper] = [];
      suppliersByCategory[catUpper].push(s.id);
    });
  });

  // 3. Cargar productos
  let products = [];
  let page = 0;
  while (true) {
    const { data } = await supabase.from('products').select('id, category').range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    products = products.concat(data);
    page++;
  }
  console.log(`Productos: ${products.length}`);

  // 4. Cargar relaciones existentes
  let existingRels = [];
  page = 0;
  while (true) {
    const { data } = await supabase.from('product_suppliers').select('product_id, supplier_id').range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    existingRels = existingRels.concat(data);
    page++;
  }
  const existingSet = new Set(existingRels.map(r => `${r.product_id}-${r.supplier_id}`));
  console.log(`Relaciones existentes: ${existingRels.length}`);

  // 5. Crear nuevas relaciones
  const newRelations = [];
  products.forEach(p => {
    const productCategory = (p.category || '').toUpperCase().trim();
    const supplierCategories = categoryMapping[productCategory] || [];
    
    const supplierIds = new Set();
    supplierCategories.forEach(supCat => {
      const sups = suppliersByCategory[supCat] || [];
      sups.forEach(id => supplierIds.add(id));
    });

    supplierIds.forEach(supplierId => {
      const key = `${p.id}-${supplierId}`;
      if (!existingSet.has(key)) {
        newRelations.push({ product_id: p.id, supplier_id: supplierId });
        existingSet.add(key);
      }
    });
  });

  console.log(`Nuevas relaciones a crear: ${newRelations.length}`);

  // 6. Insertar
  if (newRelations.length > 0) {
    let inserted = 0;
    for (let i = 0; i < newRelations.length; i += 500) {
      const batch = newRelations.slice(i, i + 500);
      const { error } = await supabase.from('product_suppliers').insert(batch);
      if (!error) {
        inserted += batch.length;
        console.log(`  Batch ${Math.floor(i/500) + 1}: +${batch.length} (total: ${inserted})`);
      }
    }
    console.log(`\n✅ Insertadas: ${inserted}`);
  }

  // 7. Verificar
  console.log('\n========================================');
  console.log('   VERIFICACIÓN FINAL');
  console.log('========================================\n');

  let finalRels = [];
  page = 0;
  while (true) {
    const { data } = await supabase.from('product_suppliers').select('product_id, supplier_id').range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    finalRels = finalRels.concat(data);
    page++;
  }

  const provsPorProducto = {};
  finalRels.forEach(r => {
    provsPorProducto[r.product_id] = (provsPorProducto[r.product_id] || 0) + 1;
  });

  const stats = { sin: 0, con1: 0, con2: 0, con3: 0, con4: 0, con5mas: 0 };
  products.forEach(p => {
    const count = provsPorProducto[p.id] || 0;
    if (count === 0) stats.sin++;
    else if (count === 1) stats.con1++;
    else if (count === 2) stats.con2++;
    else if (count === 3) stats.con3++;
    else if (count === 4) stats.con4++;
    else stats.con5mas++;
  });

  console.log('COBERTURA FINAL:');
  console.log(`  ❌ Sin proveedor:     ${stats.sin} (${(stats.sin/products.length*100).toFixed(1)}%)`);
  console.log(`  ⚠️  Con 1 proveedor:   ${stats.con1} (${(stats.con1/products.length*100).toFixed(1)}%)`);
  console.log(`  ⚠️  Con 2 proveedores: ${stats.con2} (${(stats.con2/products.length*100).toFixed(1)}%)`);
  console.log(`  ⚠️  Con 3 proveedores: ${stats.con3} (${(stats.con3/products.length*100).toFixed(1)}%)`);
  console.log(`  ⚠️  Con 4 proveedores: ${stats.con4} (${(stats.con4/products.length*100).toFixed(1)}%)`);
  console.log(`  ✅ Con 5+ proveedores: ${stats.con5mas} (${(stats.con5mas/products.length*100).toFixed(1)}%)`);
  console.log(`\nTotal relaciones: ${finalRels.length}`);
}

reasignarProductos().catch(err => console.error('Error:', err));
