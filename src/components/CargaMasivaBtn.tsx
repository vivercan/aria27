import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// Usamos variables de entorno o strings vacíos si no están definidas
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

        const items = data.map((row: any) => {
            return {
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
        }).filter((item: any) => item.name);

        if (items.length === 0) {
          alert('⚠️ No se encontraron datos válidos.');
          setLoading(false);
          return;
        }

        const { error } = await supabase.from('products').insert(items);
        if (error) throw error;
        
        alert('✅ ¡Éxito! ' + items.length + ' productos cargados.');
        if (onUploadSuccess) onUploadSuccess();

      } catch (err: any) {
        console.error(err);
        alert('❌ Error: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // AQUÍ ESTABA EL ERROR: Usamos concatenación simple para evitar bugs de PowerShell
  return (
    <label className={"flex items-center gap-2 px-4 py-2 text-white rounded cursor-pointer transition shadow-md " + (loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700")}>
      <span>{loading ? 'Subiendo...' : '📥 Carga Masiva (Excel)'}</span>
      <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={loading} onChange={handleFileUpload} />
    </label>
  );
}
