import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// --- CONFIGURACIÓN SEGURA ---
// Usamos las variables de entorno que Vercel ya tiene configuradas por defecto
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function CargaMasivaBtn({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        // --- MAPEO DE TUS COLUMNAS (EXACTO A TU EXCEL) ---
        const items = data.map((row: any) => {
            return {
              // Base de Datos (Supabase)  <--  Tu Excel (CSV)
              sku:                     row['SKU'] || row['sku'],
              category:                row['Categoría'] || row['Category'] || row['category'],
              subcategory:             row['Subcategoría'] || row['Subcategory'] || row['subcategory'],
              name:                    row['Nombre Producto'] || row['Name'] || row['name'],
              short_description:       row['Descripción Corta'] || row['Short Description'],
              long_description:        row['Descripción Larga'] || row['Long Description'],
              unit:                    row['Unidad Medida'] || row['Unit'] || row['unit'],
              commercial_presentation: row['Presentación Comercial'] || row['Commercial Presentation'],
              type:                    row['Tipo'] || row['Type'] || row['type']
            };
        }).filter((item: any) => item.name); // Validamos que tenga nombre

        if (items.length === 0) {
          alert('⚠️ No se encontraron datos. Verifica que tu Excel tenga las columnas correctas (SKU, Nombre Producto, etc).');
          setLoading(false);
          return;
        }

        // Insertar en la tabla 'products'
        const { error } = await supabase.from('products').insert(items);

        if (error) throw error;
        
        alert('✅ ¡ÉXITO! Se cargaron ' + items.length + ' productos.');
        if (onUploadSuccess) onUploadSuccess();

      } catch (err: any) {
        console.error(err);
        alert('❌ Error al subir: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <label className={lex items-center gap-2 px-4 py-2 text-white rounded cursor-pointer transition shadow-md \}>
      <span>{loading ? 'Subiendo...' : '📥 Carga Masiva (Excel)'}</span>
      <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={loading} onChange={handleFileUpload} />
    </label>
  );
}
