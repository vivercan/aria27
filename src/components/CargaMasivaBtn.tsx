import React from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import * as XLSX from 'xlsx';

export default function CargaMasivaBtn({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const supabase = createClientComponentClient();

  const handleFileUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        // --- LÓGICA INTELIGENTE: FILTRAR SOLO LO NECESARIO ---
        const items = data.map((row: any) => ({
          description: row['Descripción'] || row['Descripcion'] || row['Material'] || row['Item'],
          unit: row['Unidad'] || row['U.M.'] || row['Medida'] || 'Pza',
          quantity: row['Cantidad'] || row['Cant'] || row['Qty'] || 1,
        })).filter((item: any) => item.description); // Quitar vacíos

        if (items.length === 0) {
          alert('No se encontraron columnas válidas (Descripción, Cantidad, Unidad).');
          return;
        }

        const { error } = await supabase.from('requisition_items').insert(items);

        if (error) throw error;
        alert('✅ ¡Éxito! Se cargaron ' + items.length + ' partidas a la base de datos.');
        if (onUploadSuccess) onUploadSuccess();

      } catch (err: any) {
        alert('Error: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 transition">
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15V3m0 0L8.5 6.5M12 3l3.5 3.5M2 17l.62 2.48A2 2 0 004.56 21h14.88a2 2 0 001.94-1.52L22 17"/></svg>
      <span>Subir Excel (Carga Masiva)</span>
      <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
    </label>
  );
}
