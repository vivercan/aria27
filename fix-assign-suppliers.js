const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://yhylkvpynzyorqortbkk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo'
);

// MAPEO DE CATEGORÍAS DE PRODUCTOS A CATEGORÍAS DE PROVEEDORES
const categoryMapping = {
  // Aceros
  'ACERO Y PRODUCTOS METALICOS': ['ACEROS', 'ACERO', 'PERFILES', 'LAMINAS'],
  'ACERO Y PRODUCTOS METÁLICOS': ['ACEROS', 'ACERO', 'PERFILES', 'LAMINAS'],
  'ACERO ESTRUCTURAL': ['ACEROS', 'ACERO', 'PERFILES'],
  
  // Agregados y concretos
  'AGREGADOS Y MATERIALES DE BANCO': ['AGREGADOS', 'BLOCKS', 'CONSTRUCCION'],
  'AGREGADOS Y MATERIALES': ['AGREGADOS', 'BLOCKS', 'CONSTRUCCION'],
  'CONCRETOS ASFALTOS Y ESTABILIZANTES': ['CONCRETOS'],
  'CONCRETOS ASFALTOS': ['CONCRETOS'],
  
  // Eléctrico
  'MATERIAL ELECTRICO': ['ELECTRICO'],
  'ELECTRICIDAD': ['ELECTRICO'],
  'ELÉCTRICO': ['ELECTRICO'],
  
  // Ferretería
  'FERRETERIA Y FIJACION': ['FERRETERIA', 'HERRAMIENTAS'],
  'FERRETERÍA': ['FERRETERIA', 'HERRAMIENTAS'],
  'TORNILLERIA': ['FERRETERIA'],
  
  // Herramientas
  'HERRAMIENTA Y EQUIPO': ['HERRAMIENTAS', 'FERRETERIA', 'MAQUINARIA'],
  'HERRAMIENTA ELECTRICA': ['HERRAMIENTAS', 'ELECTRICO'],
  
  // EPP
  'EPP Y SEGURIDAD': ['EPP'],
  'EPP ADICIONAL': ['EPP'],
  'SENALIZACION Y SEGURIDAD': ['EPP', 'SEÑALIZACION'],
  'SENALIZACION VIAL': ['SEÑALIZACION'],
  'SEÑALIZACIÓN': ['SEÑALIZACION'],
  
  // Combustibles
  'COMBUSTIBLES Y LUBRICANTES': ['COMBUSTIBLES'],
  
  // Tuberías y plomería
  'TUBERIAS Y CONEXIONES': ['TUBERIAS', 'PLOMERIA'],
  'PLOMERIA': ['PLOMERIA', 'TUBERIAS'],
  
  // Pintura
  'PINTURA Y ACABADOS': ['PINTURA'],
  'PINTURA': ['PINTURA'],
  
  // Madera
  'MADERAS Y TABLEROS': ['MADERA'],
  
  // Papelería y oficina
  'PAPELERIA Y OFICINA': ['PAPELERIA'],
  'PAPELERÍA Y OFICINA': ['PAPELERIA'],
  'TECNOLOGIA': ['COMPUTO'],
  'EQUIPO DE CÓMPUTO': ['COMPUTO'],
  'MOBILIARIO OFICINA': ['PAPELERIA'],
  
  // Alimentos
  'CAFETERIA': ['ALIMENTOS'],
  'ALIMENTOS Y BEBIDAS': ['ALIMENTOS'],
  
  // Construcción general
  'MATERIALES DE CONSTRUCCION': ['CONSTRUCCION', 'AGREGADOS', 'BLOCKS', 'FERRETERIA'],
  'ALBANILERIA': ['CONSTRUCCION', 'FERRETERIA'],
  'TABLAROCA Y PLAFONES': ['CONSTRUCCION'],
  'PISOS Y AZULEJOS': ['CONSTRUCCION'],
  'VIDRIO Y ALUMINIO': ['CONSTRUCCION'],
  'PUERTAS Y HERRAJES': ['FERRETERIA'],
  'CERRAJERIA': ['FERRETERIA'],
  'MUEBLES DE BANO': ['PLOMERIA'],
  'QUIMICOS CONSTRUCCION': ['CONSTRUCCION', 'PINTURA'],
  
  // Prefabricados
  'PREFABRICADOS': ['PREFABRICADOS', 'CONCRETOS'],
  
  // Maquinaria
  'ANDAMIOS Y EQUIPO': ['MAQUINARIA'],
  'SERVICIOS Y RENTAS': ['MAQUINARIA'],
  
  // Otros
  'LIMPIEZA': ['FERRETERIA'],
  'JARDINERIA': ['FERRETERIA'],
  'MANTENIMIENTO EDIFICIO': ['FERRETERIA', 'ELECTRICO'],
  'MISCELANEOS DE OBRA': ['FERRETERIA', 'CONSTRUCCION']
};

async function fixAndAssign() {
  console.log('========================================');
  console.log('   CORRECCIÓN Y ASIGNACIÓN MASIVA');
  console.log('========================================\n');

  // 1. Cargar proveedores con categorías
  const { data: suppliers } = await supabase.from('suppliers').select('id, name, categories');
  console.log(`Proveedores cargados: ${suppliers.length}`);

  // 2. Crear mapa de categoría de proveedor -> IDs de proveedores
  const suppliersByCategory = {};
  
  suppliers.forEach(s => {
    let cats = [];
    if (Array.isArray(s.categories)) {
      cats = s.categories.map(c => c.toUpperCase().trim());
    } else if (typeof s.categories === 'string' && s.categories) {
      cats = s.categories.split(',').map(c => c.toUpperCase().trim());
    }
    
    cats.forEach(cat => {
      if (!cat) return;
      if (!suppliersByCategory[cat]) suppliersByCategory[cat] = [];
      suppliersByCategory[cat].push(s.id);
    });
  });

  console.log('\nCategorías de proveedores disponibles:');
  Object.keys(suppliersByCategory).sort().forEach(cat => {
    console.log(`  ${cat}: ${suppliersByCategory[cat].length} proveedores`);
  });

  // 3. Cargar todos los productos
  let products = [];
  let page = 0;
  while (true) {
    const { data } = await supabase.from('products').select('id, name, category').range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    products = products.concat(data);
    page++;
  }
  console.log(`\nProductos cargados: ${products.length}`);

  // 4. Cargar relaciones existentes
  const { data: existingRels } = await supabase.from('product_suppliers').select('product_id, supplier_id');
  const existingSet = new Set((existingRels || []).map(r => `${r.product_id}-${r.supplier_id}`));
  console.log(`Relaciones existentes: ${existingSet.size}`);

  // 5. Crear nuevas relaciones
  const newRelations = [];
  let productosSinMatch = 0;
  let productosConMatch = 0;

  products.forEach(p => {
    const productCategory = (p.category || '').toUpperCase().trim();
    const supplierCategories = categoryMapping[productCategory] || [];
    
    if (supplierCategories.length === 0) {
      productosSinMatch++;
      return;
    }

    // Encontrar proveedores para este producto
    const supplierIds = new Set();
    supplierCategories.forEach(supCat => {
      const sups = suppliersByCategory[supCat] || [];
      sups.forEach(id => supplierIds.add(id));
    });

    if (supplierIds.size === 0) {
      productosSinMatch++;
      return;
    }

    productosConMatch++;
    
    // Crear relaciones (evitar duplicados)
    supplierIds.forEach(supplierId => {
      const key = `${p.id}-${supplierId}`;
      if (!existingSet.has(key)) {
        newRelations.push({
          product_id: p.id,
          supplier_id: supplierId
        });
        existingSet.add(key); // Para evitar duplicados en el mismo batch
      }
    });
  });

  console.log(`\nProductos con match de categoría: ${productosConMatch}`);
  console.log(`Productos sin match: ${productosSinMatch}`);
  console.log(`Nuevas relaciones a crear: ${newRelations.length}`);

  // 6. Insertar en batches de 500
  if (newRelations.length > 0) {
    console.log('\nInsertando relaciones...');
    let inserted = 0;
    const batchSize = 500;
    
    for (let i = 0; i < newRelations.length; i += batchSize) {
      const batch = newRelations.slice(i, i + batchSize);
      const { error } = await supabase.from('product_suppliers').insert(batch);
      
      if (error) {
        console.log(`  Error en batch ${Math.floor(i/batchSize) + 1}: ${error.message}`);
      } else {
        inserted += batch.length;
        console.log(`  Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} insertadas (total: ${inserted})`);
      }
    }
    
    console.log(`\n✅ Total insertadas: ${inserted}`);
  }

  // 7. Verificar resultado final
  console.log('\n========================================');
  console.log('   VERIFICACIÓN FINAL');
  console.log('========================================\n');

  const { data: finalRels } = await supabase.from('product_suppliers').select('product_id, supplier_id');
  
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

  console.log('COBERTURA ACTUALIZADA:');
  console.log(`  ❌ Sin proveedor:     ${stats.sin} (${(stats.sin/products.length*100).toFixed(1)}%)`);
  console.log(`  ⚠️  Con 1 proveedor:   ${stats.con1}`);
  console.log(`  ⚠️  Con 2 proveedores: ${stats.con2}`);
  console.log(`  ⚠️  Con 3 proveedores: ${stats.con3}`);
  console.log(`  ⚠️  Con 4 proveedores: ${stats.con4}`);
  console.log(`  ✅ Con 5+ proveedores: ${stats.con5mas} (${(stats.con5mas/products.length*100).toFixed(1)}%)`);
  console.log(`\nTotal relaciones: ${finalRels.length}`);
}

fixAndAssign().catch(err => console.error('Error:', err));
