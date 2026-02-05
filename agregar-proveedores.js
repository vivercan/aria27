const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://yhylkvpynzyorqortbkk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo'
);

// Primero ver estructura de la tabla
async function verEstructura() {
  const { data, error } = await supabase.from('suppliers').select('*').limit(1);
  if (data && data[0]) {
    console.log('Columnas de suppliers:', Object.keys(data[0]));
  }
}

const nuevosProveedores = [
  // EPP Y SEGURIDAD
  { name: 'SPUL Industrial', categories: ['EPP', 'SEÑALIZACION', 'LIMPIEZA'], estado: 'AGS' },
  { name: 'Protegga EPP', categories: ['EPP'], estado: 'AGS' },
  { name: 'Cleaning Supplies N EPP', categories: ['EPP', 'LIMPIEZA'], estado: 'AGS' },
  { name: 'Alver Equipo de Seguridad', categories: ['EPP'], estado: 'AGS' },
  { name: 'Vinssa EPP', categories: ['EPP'], estado: 'NAC' },
  
  // TUBERIAS Y PLOMERIA
  { name: 'DTC Distribuidora de Tubos', categories: ['TUBERIAS', 'PLOMERIA'], estado: 'NAC' },
  { name: 'Plásticos Russell', categories: ['TUBERIAS', 'PLOMERIA'], estado: 'AGS' },
  { name: 'Euroval Aguascalientes', categories: ['TUBERIAS', 'PLOMERIA'], estado: 'AGS' },
  { name: 'EMMSA Tuberías', categories: ['TUBERIAS', 'PLOMERIA'], estado: 'AGS' },
  { name: 'Conexiones Plásticas AGS (Conplasa)', categories: ['TUBERIAS', 'PLOMERIA'], estado: 'AGS' },
  { name: 'Central de PVC', categories: ['TUBERIAS', 'PLOMERIA'], estado: 'NAC' },
  
  // MATERIALES CONSTRUCCION Y BLOCKS
  { name: 'Tabique Rojo AGS', categories: ['CONSTRUCCION', 'AGREGADOS', 'BLOCKS'], estado: 'AGS' },
  { name: 'Ravazu Materiales', categories: ['CONSTRUCCION', 'FERRETERIA', 'AGREGADOS'], estado: 'AGS' },
  { name: 'MEZA Materiales', categories: ['CONSTRUCCION', 'AGREGADOS', 'MAQUINARIA'], estado: 'AGS' },
  { name: 'Obra Total AGS', categories: ['CONSTRUCCION', 'AGREGADOS'], estado: 'AGS' },
  
  // FERRETERIA Y HERRAMIENTAS
  { name: 'VIMA Ferretera (Truper)', categories: ['FERRETERIA', 'HERRAMIENTAS', 'ELECTRICO', 'PLOMERIA'], estado: 'AGS' },
  { name: 'Ferretera Nuevo Mundo (Truper)', categories: ['FERRETERIA', 'HERRAMIENTAS', 'ELECTRICO', 'PLOMERIA'], estado: 'NAC' },
  { name: 'Continente Ferretero', categories: ['FERRETERIA', 'HERRAMIENTAS'], estado: 'NAC' },
  
  // MULTIPRODUCTO
  { name: 'Home Depot AGS Galerías', categories: ['FERRETERIA', 'HERRAMIENTAS', 'PINTURA', 'PLOMERIA', 'ELECTRICO', 'CONSTRUCCION', 'MADERA'], estado: 'AGS' },
  { name: 'Home Depot AGS Chávez', categories: ['FERRETERIA', 'HERRAMIENTAS', 'PINTURA', 'PLOMERIA', 'ELECTRICO', 'CONSTRUCCION', 'MADERA'], estado: 'AGS' },
];

async function agregarProveedores() {
  console.log('========================================');
  console.log('   AGREGANDO NUEVOS PROVEEDORES');
  console.log('========================================\n');

  await verEstructura();
  console.log('');

  let agregados = 0;
  let existentes = 0;

  for (const prov of nuevosProveedores) {
    // Verificar si ya existe
    const { data: existe } = await supabase
      .from('suppliers')
      .select('id, name')
      .ilike('name', `%${prov.name.split(' ')[0]}%`)
      .limit(1);

    if (existe && existe.length > 0) {
      console.log(`⚠️  Ya existe: "${existe[0].name}" - Saltando "${prov.name}"`);
      existentes++;
      continue;
    }

    // Insertar nuevo proveedor (solo columnas que existen)
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        name: prov.name,
        categories: prov.categories,
        estado: prov.estado
      })
      .select();

    if (error) {
      console.log(`❌ Error: "${prov.name}": ${error.message}`);
    } else {
      console.log(`✅ Agregado: ${prov.name} - ${prov.categories.join(', ')}`);
      agregados++;
    }
  }

  console.log(`\n========================================`);
  console.log(`  ✅ Nuevos: ${agregados}`);
  console.log(`  ⚠️  Existentes: ${existentes}`);
  console.log(`========================================`);

  // Mostrar total
  const { data: total } = await supabase.from('suppliers').select('id', { count: 'exact' });
  console.log(`\nTotal proveedores ahora: ${total.length}`);

  // Mostrar categorías
  const { data: suppliers } = await supabase.from('suppliers').select('id, categories');
  const catCount = {};
  suppliers.forEach(s => {
    const cats = Array.isArray(s.categories) ? s.categories : [];
    cats.forEach(c => {
      const cu = c.toUpperCase();
      catCount[cu] = (catCount[cu] || 0) + 1;
    });
  });
  
  console.log('\nProveedores por categoría:');
  Object.entries(catCount).sort((a,b) => b[1] - a[1]).forEach(([cat, n]) => {
    console.log(`  ${cat}: ${n}`);
  });
}

agregarProveedores().catch(err => console.error('Error:', err));
