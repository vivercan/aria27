const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://yhylkvpynzyorqortbkk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo'
);

async function verify() {
  let all = [];
  let page = 0;
  while (true) {
    const { data } = await supabase.from('products').select('id, name').range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    page++;
  }

  const minuscula = all.filter(p => /^[a-záéíóúñü]/.test(p.name || ''));
  const duplicados = {};
  all.forEach(p => {
    const n = (p.name || '').toLowerCase().trim();
    duplicados[n] = (duplicados[n] || 0) + 1;
  });
  const dups = Object.entries(duplicados).filter(([k, v]) => v > 1);

  console.log('========================================');
  console.log('   VERIFICACIÓN FINAL');
  console.log('========================================');
  console.log(`Total productos: ${all.length}`);
  console.log(`Con minúscula: ${minuscula.length}`);
  console.log(`Duplicados: ${dups.length}`);
  
  if (minuscula.length === 0 && dups.length === 0) {
    console.log('\n✅ BASE DE DATOS PERFECTA');
  } else {
    if (minuscula.length > 0) {
      console.log('\nAún con minúscula:');
      minuscula.slice(0, 5).forEach(p => console.log(`  ${p.id}: "${p.name}"`));
    }
    if (dups.length > 0) {
      console.log('\nAún duplicados:');
      dups.slice(0, 5).forEach(([n, c]) => console.log(`  "${n}" (${c}x)`));
    }
  }
  console.log('========================================');
}
verify();
