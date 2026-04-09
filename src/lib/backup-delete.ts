import { supabase } from "@/lib/supabase";

interface BackupDeleteOptions {
  table: string;
  id: string;
  userEmail: string;
  relatedData?: Record<string, unknown[]>;
  restoreNotes?: string;
}

export async function backupAndDelete({ table, id, userEmail, relatedData, restoreNotes }: BackupDeleteOptions) {
  // 1. Fetch the record before deletion
  const { data: record, error: fetchErr } = await supabase.from(table).select("*").eq("id", id).single();
  if (fetchErr || !record) throw new Error(`No se encontró el registro en ${table}: ${id}`);

  // 2. Insert backup into deleted_records
  const { error: backupErr } = await supabase.from("deleted_records").insert({
    source_table: table,
    source_id: id,
    data: record,
    related_data: relatedData || null,
    deleted_by: userEmail,
    restore_notes: restoreNotes || `Tabla: ${table} | ID: ${id}`,
  });
  if (backupErr) throw new Error(`Error al respaldar: ${backupErr.message}`);

  // 3. Delete the record
  const { error: delErr } = await supabase.from(table).delete().eq("id", id);
  if (delErr) throw new Error(`Error al eliminar: ${delErr.message}`);

  return true;
}
