const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://yhylkvpynzyorqortbkk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo'
);

async function cleanDatabase() {
  console.log('========================================');
  console.log('   LIMPIEZA COMPLETA DE PRODUCTOS');
  console.log('========================================\n');

  // Cargar todos los productos
  let allProducts = [];
  let page = 0;
  while (true) {
    const { data } = await supabase.from('products').select('*').range(page * 1000, (page + 1) * 1000 - 1).order('id');
    if (!data || data.length === 0) break;
    allProducts = allProducts.concat(data);
    page++;
  }
  console.log(`Total productos cargados: ${allProducts.length}\n`);

  // ============ PASO 1: IDENTIFICAR BASURA ============
  // Productos que claramente NO son productos de catálogo
  const basuraPatterns = [
    /^a las \d/i,                    // "a las 10:00 am"
    /^de gasolina$/i,                // "de gasolina" solo
    /^de diesel/i,                   // "de diesel para..."
    /^de gasolina para/i,            // "de gasolina para..."
    /para antes de colar/i,          // frases de trabajo
    /para colado de/i,
    /para limpiar el area/i,
    /para la cimbra/i,
    /pagados por/i,                  // "pagados por Daisy"
    /cambio de la junta/i,           // servicios mecánicos
    /turno de camion/i,
    /colados$/i,                     // solo "colados"
    /muros$/i,                       // solo "muros"
    /bombeado\.$/i,                  // "bombeado."
  ];

  const basuraIds = [];
  allProducts.forEach(p => {
    const name = p.name || '';
    if (basuraPatterns.some(pattern => pattern.test(name))) {
      basuraIds.push(p.id);
      console.log(`  BASURA: ${p.id} - "${name}"`);
    }
  });

  // ============ PASO 2: IDENTIFICAR DUPLICADOS ============
  const nameMap = {};
  const duplicateIds = [];
  
  allProducts.forEach(p => {
    if (basuraIds.includes(p.id)) return; // Ya marcado como basura
    
    const nameLower = (p.name || '').toLowerCase().trim();
    if (!nameLower) return;
    
    if (nameMap[nameLower]) {
      // Ya existe, este es duplicado - eliminar el de ID más alto
      duplicateIds.push(p.id);
      console.log(`  DUPLICADO: ${p.id} - "${p.name}" (original: ${nameMap[nameLower]})`);
    } else {
      nameMap[nameLower] = p.id;
    }
  });

  // ============ PASO 3: IDENTIFICAR PARA CAPITALIZAR ============
  const toCapitalize = [];
  allProducts.forEach(p => {
    if (basuraIds.includes(p.id) || duplicateIds.includes(p.id)) return;
    
    const name = p.name || '';
    if (/^[a-záéíóúñü]/.test(name)) {
      const newName = name.charAt(0).toUpperCase() + name.slice(1);
      toCapitalize.push({ id: p.id, oldName: name, newName });
    }
  });

  console.log('\n========================================');
  console.log('RESUMEN DE CAMBIOS:');
  console.log(`  🗑️  Eliminar basura: ${basuraIds.length}`);
  console.log(`  🗑️  Eliminar duplicados: ${duplicateIds.length}`);
  console.log(`  ✏️  Capitalizar: ${toCapitalize.length}`);
  console.log(`  TOTAL A ELIMINAR: ${basuraIds.length + duplicateIds.length}`);
  console.log('========================================\n');

  // ============ EJECUTAR CAMBIOS ============
  console.log('Ejecutando limpieza...\n');

  // Eliminar basura
  if (basuraIds.length > 0) {
    const { error: e1 } = await supabase.from('products').delete().in('id', basuraIds);
    if (e1) console.log('Error eliminando basura:', e1.message);
    else console.log(`✅ Eliminados ${basuraIds.length} productos basura`);
  }

  // Eliminar duplicados
  if (duplicateIds.length > 0) {
    const { error: e2 } = await supabase.from('products').delete().in('id', duplicateIds);
    if (e2) console.log('Error eliminando duplicados:', e2.message);
    else console.log(`✅ Eliminados ${duplicateIds.length} productos duplicados`);
  }

  // Capitalizar
  let capitalized = 0;
  for (const item of toCapitalize) {
    const { error } = await supabase.from('products').update({ name: item.newName }).eq('id', item.id);
    if (!error) capitalized++;
  }
  console.log(`✅ Capitalizados ${capitalized} productos`);

  // ============ VERIFICACIÓN FINAL ============
  const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
  
  console.log('\n========================================');
  console.log('LIMPIEZA COMPLETADA');
  console.log(`  Productos antes: ${allProducts.length}`);
  console.log(`  Productos ahora: ${count}`);
  console.log(`  Eliminados: ${allProducts.length - count}`);
  console.log('========================================');
}

cleanDatabase();
