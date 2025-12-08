"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Plus, Upload, Building, Trash, Check, MessageSquare, X, Package } from "lucide-react";

export default function RequisitionsPage() {
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [selectedCenter, setSelectedCenter] = useState("");
  const [generalComments, setGeneralComments] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const searchTimeout = useRef<any>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualItem, setManualItem] = useState({ name: "", unit: "Pza", qty: 1, comments: "" });
  const [isSubmitting, setIsSubmitting] = useState(false); // Estado de carga

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('cost_centers').select('*');
      if (data) setCostCenters(data);
    }
    load();
  }, []);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (text.length < 2) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      const { data } = await supabase.from('products').select('*').ilike('name', `%${text}%`).limit(5);
      setSearchResults(data || []);
    }, 500);
  };

  const addToCart = (p: any) => {
    const exists = cart.find(c => c.id === p.id);
    if (exists) return;
    setCart([...cart, { ...p, qty: 1, isManual: false }]);
    setSearchQuery(""); setSearchResults([]);
  };

  const saveManualItem = () => {
    if (!manualItem.name) return alert("Escribe una descripción");
    setCart([...cart, { id: `manual-${Date.now()}`, sku: 'MANUAL', name: manualItem.name, unit: manualItem.unit, qty: manualItem.qty, comments: manualItem.comments, isManual: true }]);
    setManualItem({ name: "", unit: "Pza", qty: 1, comments: "" });
    setIsManualOpen(false);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const updateQty = (index: number, val: string) => {
    const newCart = [...cart];
    newCart[index].qty = Number(val);
    setCart(newCart);
  };

  // --- FUNCIÓN DE ENVÍO REAL ---
  const handleFinalize = async () => {
    if (cart.length === 0) return alert("La lista está vacía.");
    if (!selectedCenter) return alert("Selecciona una Obra / Centro de Costos.");
    
    if (!confirm("¿Confirmar requisición y notificar a RH?")) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/requisicion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: { nombre: 'Deya Montalvo', email: 'deya@gcuavante.com' }, // Usuario Fijo Admin
          obra: selectedCenter,
          comentarios: generalComments,
          materiales: cart
        })
      });
      
      const data = await res.json();
      if (data.success) {
        alert(`✅ REQUISICIÓN EXITOSA\nFolio: ${data.folio}\n\nSe ha enviado el correo de confirmación.`);
        window.location.reload();
      } else {
        alert("❌ Error: " + (data.error || "Error desconocido"));
      }
    } catch (err) {
      alert("Error de conexión con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300 relative">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Nueva Requisición</h1>
          <p className="text-slate-400 text-sm">Agrega productos del catálogo o partidas manuales.</p>
        </div>
        <div className="flex gap-2">
           <button className="bg-white/5 hover:bg-white/10 text-xs text-slate-300 px-3 py-2 rounded-lg border border-white/10 flex gap-2 items-center">
             <Upload size={14} /> Carga Masiva
           </button>
           <button onClick={() => setIsManualOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-lg flex gap-2 items-center shadow-lg shadow-blue-500/20 transition-all">
             <Plus size={14} /> Agregar Manualmente
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md h-fit">
          <h3 className="text-sm font-bold text-blue-300 mb-4 uppercase tracking-wider">1. Configuración</h3>
          <div className="space-y-5">
             <div>
               <label className="text-xs text-slate-400 mb-1 block">Obra / Centro de Costos</label>
               <div className="relative">
                 <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                 <select className="w-full bg-white text-gray-900 font-medium rounded-lg py-2.5 pl-10 pr-3 text-sm outline-none shadow-lg"
                    value={selectedCenter} onChange={(e) => setSelectedCenter(e.target.value)}>
                   <option value="">Seleccione una obra...</option>
                   {costCenters.map(cc => <option key={cc.id} value={cc.name}>{cc.name} ({cc.code})</option>)}
                 </select>
               </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Comentarios Generales</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 text-slate-500" size={16} />
                <textarea className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white text-sm outline-none min-h-[100px]"
                  placeholder="Instrucciones generales..." value={generalComments} onChange={(e) => setGeneralComments(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
           <h3 className="text-sm font-bold text-blue-300 mb-4 uppercase tracking-wider">2. Lista de Materiales</h3>
           <div className="relative mb-6">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input type="text" placeholder="Buscar en catálogo..." className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 px-4 text-white focus:border-blue-500 transition-all"
               value={searchQuery} onChange={(e) => handleSearch(e.target.value)} />
             {searchResults.length > 0 && (
               <div className="absolute top-full mt-2 w-full bg-[#020617] border border-blue-500/30 rounded-xl shadow-2xl z-50 overflow-hidden">
                 {searchResults.map(p => (
                   <div key={p.id} className="p-3 hover:bg-blue-600/20 cursor-pointer text-white border-b border-white/5 flex justify-between items-center" onClick={() => addToCart(p)}>
                      <span>{p.name}</span><span className="text-xs bg-white/10 px-2 py-1 rounded text-slate-300">{p.unit}</span>
                   </div>
                 ))}
               </div>
             )}
           </div>

           <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden min-h-[250px]">
             <table className="w-full text-left text-sm text-slate-300">
               <thead className="bg-white/5 text-slate-100 text-xs font-bold uppercase">
                  <tr><th className="p-3">Descripción</th><th className="p-3 text-center">Unidad</th><th className="p-3 text-center w-24">Cantidad</th><th className="p-3 w-10"></th></tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {cart.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-500 italic text-xs">Tu lista está vacía.</td></tr>
                 ) : cart.map((item, idx) => (
                   <tr key={idx} className="hover:bg-white/5 transition-colors">
                     <td className="p-3 text-white">
                        <div className="font-medium flex items-center gap-2">{item.isManual && <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1 rounded">MANUAL</span>}{item.name}</div>
                        <div className="text-[10px] text-slate-500">{item.sku} {item.comments}</div>
                     </td>
                     <td className="p-3 text-center text-xs">{item.unit}</td>
                     <td className="p-3 text-center">
                       <input type="number" className="w-16 bg-white/10 border border-white/20 text-white text-center rounded py-1 outline-none" value={item.qty} onChange={(e) => updateQty(idx, e.target.value)} />
                     </td>
                     <td className="p-3 text-center"><button onClick={() => removeFromCart(idx)} className="text-slate-500 hover:text-rose-400"><Trash size={16}/></button></td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>

           <div className="mt-6 flex justify-end">
             <button onClick={handleFinalize} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
               {isSubmitting ? "Procesando..." : <><Check size={16} /> Finalizar Requisición</>}
             </button>
           </div>
        </div>
      </div>

      {isManualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-white font-bold flex items-center gap-2"><Package size={18} className="text-blue-400"/> Agregar Partida</h3>
              <button onClick={() => setIsManualOpen(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="text-xs text-slate-400 block">Descripción</label><input autoFocus type="text" className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" value={manualItem.name} onChange={e => setManualItem({...manualItem, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-slate-400 block">Unidad</label><select className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" value={manualItem.unit} onChange={e => setManualItem({...manualItem, unit: e.target.value})}><option>Pza</option><option>Kg</option><option>Mto</option><option>Lt</option><option>Servicio</option></select></div>
                <div><label className="text-xs text-slate-400 block">Cantidad</label><input type="number" className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" value={manualItem.qty} onChange={e => setManualItem({...manualItem, qty: Number(e.target.value)})} /></div>
              </div>
              <div><label className="text-xs text-slate-400 block">Comentarios</label><input type="text" className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" value={manualItem.comments} onChange={e => setManualItem({...manualItem, comments: e.target.value})} /></div>
            </div>
            <div className="p-4 bg-white/5 border-t border-white/10 flex justify-end gap-3">
              <button onClick={() => setIsManualOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Cancelar</button>
              <button onClick={saveManualItem} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">Agregar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
