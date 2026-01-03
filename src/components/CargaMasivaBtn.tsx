import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// Usamos las variables de entorno de Vercel (NEXT_PUBLIC)
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

        // Mapeo (Excel -> DB) para el botón web
        const items = data.map((row: any) => ({
            sku: row['SKU'],
            category: row['Categoría'] || row['Categoria'],
            subcategory: row['Subcategoría'] || row['Subcategoria'],
            name: row['Nombre Producto'],
            short_description: row['Descripción Corta'],
            long_description: row['Descripción Larga'],
            unit: row['Unidad Medida'],
            commercial_presentation: row['Presentación Comercial'],
            type: row['Tipo']
        })).filter((i: any) => i.name);

        const { error } = await supabase.from('Productos').insert(items);
        if (error) throw error;
        
        alert('✅ ¡Carga Exitosa desde la web! ' + items.length + ' productos agregados.');
        if (onUploadSuccess) onUploadSuccess();
      } catch (err: any) {
        alert('❌ Error: ' + err.message);
      } finally { setLoading(false); }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <label className={'flex items-center gap-2 px-4 py-2 text-white rounded cursor-pointer transition shadow-md ' + (loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700')}>
      <span>{loading ? 'Subiendo...' : '📥 Carga Masiva (Excel)'}</span>
      <input type="file" accept='.xlsx,.xls,.csv' className='hidden' disabled={loading} onChange={handleFileUpload} />
    </label>
  );
}
