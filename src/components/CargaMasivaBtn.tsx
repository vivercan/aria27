import React, { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import * as XLSX from 'xlsx';

export default function CargaMasivaBtn({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const supabase = createClientComponentClient();
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

        // --- MAPEO DE TUS ENCABEZADOS DE EXCEL A SUPABASE ---
        const items = data.map((row: any) => {
            return {
              // Columnas de Supabase  <--  Encabezados de tu Excel
              sku:                     row['SKU'],
              category:                row['Categoría'] || row['Categoria'],
              subcategory:             row['Subcategoría'] || row['Subcategoria'],
              name:                    row['Nombre Producto'],
              short_description:       row['Descripción Corta'] || row['Descripcion Corta'],
              long_description:        row['Descripción Larga'] || row['Descripcion Larga'],
              unit:                    row['Unidad Medida'],
              commercial_presentation: row['Presentación Comercial'] || row['Presentacion Comercial'],
              type:                    row['Tipo']
            };
        // Filtramos para asegurarnos que al menos tengan nombre
        }).filter((item: any) => item.name);

        if (items.length === 0) {
          alert('⚠️ No se encontraron datos válidos. Revisa que tu Excel tenga las columnas: SKU, Categoría, Nombre Producto, etc.');
          setLoading(false);
          return;
        }

        // Insertar en la tabla 'products' de Supabase
        const { error } = await supabase.from('products').insert(items);

        if (error) throw error;
        
        alert('✅ ¡ÉXITO! Se cargaron ' + items.length + ' productos al catálogo.');
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
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15V3m0 0L8.5 6.5M12 3l3.5 3.5M2 17l.62 2.48A2 2 0 004.56 21h14.88a2 2 0 001.94-1.52L22 17"/></svg>
      <span>{loading ? 'Subiendo...' : 'Carga Masiva (Excel)'}</span>
      <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={loading} onChange={handleFileUpload} />
    </label>
  );
}
