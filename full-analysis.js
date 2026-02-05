const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://yhylkvpynzyorqortbkk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo'
);

async function fullAnalysis() {
  console.log('Cargando TODOS los productos...\n');
  
  // Obtener todos con paginación
  let allProducts = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, category, unit')
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('id');
    
    if (error) { console.error(error); break; }
    if (!data || data.length === 0) break;
    
    allProducts = allProducts.concat(data);
    console.log(`  Cargados: ${allProducts.length} productos...`);
    page++;
  }
  
  console.log(`\n========================================`);
  console.log(`TOTAL PRODUCTOS EN BD: ${allProducts.length}`);
  console.log(`========================================\n`);
  
  // Análisis de problemas
  const issues = {
    minuscula: [],
    articulos: [],
    espaciosDobles: [],
    espaciosExtremos: [],
    muyCortos: [],
    vacios: [],
    duplicados: [],
    caracteresRaros: [],
  };
  
  const nameCount = {};
  
  allProducts.forEach(p => {
    const name = p.name || '';
    const nameLower = name.toLowerCase().trim();
    
    // Contar para duplicados
    nameCount[nameLower] = (nameCount[nameLower] || 0) + 1;
    
    // Vacíos o null
    if (!name || name.trim() === '') {
      issues.vacios.push({ id: p.id, name: '(vacío)', sku: p.sku });
      return;
    }
    
    // Empieza con minúscula
    if (/^[a-záéíóúñü]/.test(name)) {
      issues.minuscula.push({ id: p.id, name, category: p.category });
    }
    
    // Empieza con artículo/preposición
    if (/^(el |la |los |las |un |una |de |del |para |con )/i.test(name)) {
      issues.articulos.push({ id: p.id, name, category: p.category });
    }
    
    // Espacios dobles
    if (name.includes('  ')) {
      issues.espaciosDobles.push({ id: p.id, name });
    }
    
    // Espacios al inicio o final
    if (name !== name.trim()) {
      issues.espaciosExtremos.push({ id: p.id, name: `"${name}"` });
    }
    
    // Muy cortos
    if (name.trim().length < 3) {
      issues.muyCortos.push({ id: p.id, name });
    }
    
    // Caracteres raros
    if (/[<>{}[\]\\|]/.test(name)) {
      issues.caracteresRaros.push({ id: p.id, name });
    }
  });
  
  // Encontrar duplicados
  Object.entries(nameCount).forEach(([name, count]) => {
    if (count > 1) {
      const prods = allProducts.filter(p => (p.name || '').toLowerCase().trim() === name);
      issues.duplicados.push({ name, count, ids: prods.map(p => p.id).join(', ') });
    }
  });
  
  // Mostrar resultados
  console.log('=== ANÁLISIS COMPLETO DE CALIDAD ===\n');
  
  console.log(`1. VACÍOS/NULL: ${issues.vacios.length}`);
  issues.vacios.forEach(p => console.log(`   ID ${p.id}: SKU=${p.sku || 'sin sku'}`));
  
  console.log(`\n2. EMPIEZAN CON MINÚSCULA: ${issues.minuscula.length}`);
  issues.minuscula.forEach(p => console.log(`   ${p.id}: "${p.name}"`));
  
  console.log(`\n3. EMPIEZAN CON ARTÍCULO (de, el, la, para, con): ${issues.articulos.length}`);
  issues.articulos.forEach(p => console.log(`   ${p.id}: "${p.name}"`));
  
  console.log(`\n4. ESPACIOS DOBLES: ${issues.espaciosDobles.length}`);
  issues.espaciosDobles.slice(0, 10).forEach(p => console.log(`   ${p.id}: "${p.name}"`));
  if (issues.espaciosDobles.length > 10) console.log(`   ... y ${issues.espaciosDobles.length - 10} más`);
  
  console.log(`\n5. ESPACIOS AL INICIO/FINAL: ${issues.espaciosExtremos.length}`);
  issues.espaciosExtremos.slice(0, 10).forEach(p => console.log(`   ${p.id}: ${p.name}`));
  
  console.log(`\n6. MUY CORTOS (<3 chars): ${issues.muyCortos.length}`);
  issues.muyCortos.forEach(p => console.log(`   ${p.id}: "${p.name}"`));
  
  console.log(`\n7. CARACTERES RAROS: ${issues.caracteresRaros.length}`);
  issues.caracteresRaros.forEach(p => console.log(`   ${p.id}: "${p.name}"`));
  
  console.log(`\n8. NOMBRES DUPLICADOS: ${issues.duplicados.length}`);
  issues.duplicados.slice(0, 20).forEach(d => console.log(`   "${d.name}" (${d.count}x) IDs: ${d.ids}`));
  if (issues.duplicados.length > 20) console.log(`   ... y ${issues.duplicados.length - 20} más`);
  
  // Resumen
  const totalIssues = issues.vacios.length + issues.minuscula.length + issues.articulos.length + 
                      issues.espaciosDobles.length + issues.espaciosExtremos.length + 
                      issues.muyCortos.length + issues.caracteresRaros.length;
  
  console.log(`\n========================================`);
  console.log(`RESUMEN:`);
  console.log(`  Total productos: ${allProducts.length}`);
  console.log(`  Con problemas: ${totalIssues}`);
  console.log(`  Duplicados: ${issues.duplicados.length} nombres repetidos`);
  console.log(`  Calidad: ${((allProducts.length - totalIssues) / allProducts.length * 100).toFixed(1)}%`);
  console.log(`========================================`);
}

fullAnalysis();
