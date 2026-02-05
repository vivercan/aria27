const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://yhylkvpynzyorqortbkk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo'
);

async function checkProducts() {
  // Buscar productos que empiezan con "de " (minúscula)
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category')
    .ilike('name', 'de %')
    .limit(50);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('=== PRODUCTOS CON NOMBRES INCORRECTOS (empiezan con "de ") ===');
  console.log('Total encontrados:', data.length);
  console.log('');
  data.forEach(p => {
    console.log(`ID: ${p.id} | ${p.name}`);
  });
}

checkProducts();
