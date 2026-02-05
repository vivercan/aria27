const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://yhylkvpynzyorqortbkk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo'
);

async function fullCheck() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category')
    .order('name')
    .limit(5000);
  
  if (error) { console.error(error); return; }
  
  console.log('TOTAL PRODUCTOS:', data.length);
  console.log('');
  
  // Detectar patrones problemáticos
  const issues = {
    minuscula: [],      // empiezan con minúscula
    articulos: [],      // empiezan con "el ", "la ", "los ", "un "
    numeros: [],        // empiezan con número
    espacios: [],       // tienen espacios dobles o al inicio/final
    muyCortos: [],      // menos de 3 caracteres
  };
  
  data.forEach(p => {
    const name = p.name || '';
    
    // Empieza con minúscula (y no es número)
    if (/^[a-záéíóúñ]/.test(name)) {
      issues.minuscula.push({ id: p.id, name });
    }
    
    // Empieza con artículo
    if (/^(el |la |los |las |un |una |de |del |para )/i.test(name)) {
      issues.articulos.push({ id: p.id, name });
    }
    
    // Espacios problemáticos
    if (name !== name.trim() || name.includes('  ')) {
      issues.espacios.push({ id: p.id, name });
    }
    
    // Muy cortos
    if (name.length < 3) {
      issues.muyCortos.push({ id: p.id, name });
    }
  });
  
  console.log('=== PROBLEMAS DETECTADOS ===\n');
  
  console.log(`📝 Empiezan con MINÚSCULA: ${issues.minuscula.length}`);
  issues.minuscula.slice(0, 10).forEach(p => console.log(`   ${p.id}: "${p.name}"`));
  if (issues.minuscula.length > 10) console.log(`   ... y ${issues.minuscula.length - 10} más`);
  
  console.log(`\n📝 Empiezan con ARTÍCULO (de, el, la, para): ${issues.articulos.length}`);
  issues.articulos.slice(0, 10).forEach(p => console.log(`   ${p.id}: "${p.name}"`));
  
  console.log(`\n📝 ESPACIOS problemáticos: ${issues.espacios.length}`);
  issues.espacios.slice(0, 5).forEach(p => console.log(`   ${p.id}: "${p.name}"`));
  
  console.log(`\n📝 MUY CORTOS (<3 chars): ${issues.muyCortos.length}`);
  issues.muyCortos.forEach(p => console.log(`   ${p.id}: "${p.name}"`));
}

fullCheck();
