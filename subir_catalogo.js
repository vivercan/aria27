const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://yhylkvpynzyorqortbkk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function iniciarCarga() {
    const rutaExcel = path.join(__dirname, 'catalogo.xlsx');

    if (!fs.existsSync(rutaExcel)) {
        console.error('\n❌ ERROR: Archivo catalogo.xlsx NO encontrado. Subida de datos cancelada. Asegúrate de que el archivo esté en el mismo directorio donde ejecutas el script.');
        return;
    }

    console.log('📖 Subiendo datos, por favor espera...');
    const workbook = XLSX.readFile(rutaExcel);
    const sheetName = workbook.SheetNames[0];
    const datos = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const items = datos.map(fila => ({
        sku: fila['SKU'],
        category: fila['Categoría'] || fila['Categoria'], 
        subcategory: fila['Subcategoría'] || fila['Subcategoria'],
        name: fila['Nombre Producto'],
        short_description: fila['Descripción Corta'],
        long_description: fila['Descripción Larga'],
        unit: fila['Unidad Medida'],
        commercial_presentation: fila['Presentación Comercial'],
        type: fila['Tipo']
    })).filter(i => i.name);

    let subidos = 0;
    for (let i = 0; i < items.length; i += 50) {
        const lote = items.slice(i, i + 50);
        const { error } = await supabase.from('products').insert(lote);
        if (error) { console.error('⚠️ Error en lote ' + i + ': ' + error.message); } 
        else { subidos += lote.length; process.stdout.write('.'); }
    }
    
    console.log('\n✅ CARGA FINALIZADA. Se subieron ' + subidos + ' productos.');
}

iniciarCarga();
