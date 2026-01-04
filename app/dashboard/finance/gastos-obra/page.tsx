"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  DollarSign, Plus, Search, Download, Upload, X,
  Building, CreditCard, Banknote, AlertTriangle,
  CheckCircle, Clock, TrendingUp, Edit, Trash2, Eye, Save
} from "lucide-react";

interface GastoObra {
  id: string;
  fecha: string;
  semana: number;
  obra: string;
  solicitante: string;
  descripcion: string;
  proveedor: string;
  razon: string;
  monto: number;
  forma_pago: string;
  es_urgente: boolean;
  estatus: string;
}

const gastosIniciales: GastoObra[] = [
  { id: '1', fecha: '2025-09-02', semana: 36, obra: 'OFICINA', solicitante: 'DEYANIRA MONTALVO', descripcion: 'PAGOS OF.', proveedor: 'DEYANIRA MONTALVO', razon: 'CREDENCIAL CERTIFICADA + DEPOSITO LADRILLOS', monto: 700, forma_pago: 'TRANSFERENCIA', es_urgente: false, estatus: 'PAGADO' },
  { id: '2', fecha: '2025-09-02', semana: 36, obra: 'OFICINA', solicitante: 'DAISY SANCHEZ', descripcion: 'AGUA', proveedor: 'OXXO', razon: '3 GARRAFONES DE AGUA OFICINA', monto: 180, forma_pago: 'EFECTIVO', es_urgente: false, estatus: 'PAGADO' },
  { id: '3', fecha: '2025-09-03', semana: 36, obra: 'JESUS TERAN', solicitante: 'DAISY SANCHEZ', descripcion: 'DESTAJO', proveedor: 'ING. FRANCISCO HERRERA', razon: 'COLADO DE ZAPATA - 5 PERSONAS', monto: 4000, forma_pago: 'EFECTIVO', es_urgente: false, estatus: 'VIERNES' },
  { id: '4', fecha: '2025-09-02', semana: 36, obra: 'MIRAVALLE', solicitante: 'MIGUEL JIMENEZ', descripcion: 'MATERIAL', proveedor: 'MATRA CONCRETOS', razon: 'CONCRETO PREMEZCLADO 40M3', monto: 52000, forma_pago: 'TRANSFERENCIA', es_urgente: false, estatus: 'PENDIENTE' },
  { id: '5', fecha: '2025-08-15', semana: 36, obra: 'JESUS TERAN', solicitante: 'DAISY SANCHEZ', descripcion: 'PERSONAL', proveedor: 'LUIS GARCIA', razon: '4 DIAS MAISTROS $666.66 C/U', monto: 2666.64, forma_pago: 'EFECTIVO', es_urgente: false, estatus: 'VIERNES' },
  { id: '6', fecha: '2025-09-01', semana: 36, obra: 'PINAR DEL LAGO', solicitante: 'JOSE ARMANDO REYES', descripcion: 'MATERIAL', proveedor: 'MATERIALES HERRERA', razon: 'CEMENTO GRIS 50KG X 20 BULTOS', monto: 3400, forma_pago: 'TRANSFERENCIA', es_urgente: true, estatus: 'REEMBOLSAR' },
  { id: '7', fecha: '2025-09-05', semana: 36, obra: 'PINAR DEL LAGO', solicitante: 'DAISY SANCHEZ', descripcion: 'DESTAJO', proveedor: 'ANTONIO CARREON', razon: 'DESTAJOS 80 ML AFINE, TUBERIA 12"', monto: 8908, forma_pago: 'EFECTIVO', es_urgente: false, estatus: 'VIERNES' },
  { id: '8', fecha: '2025-09-04', semana: 36, obra: 'JESUS TERAN', solicitante: 'DAISY SANCHEZ', descripcion: 'TOPOGRAFIA', proveedor: 'ING. JULIO ZAPATA', razon: 'SEMANA 35 Y 36 DE TOPOGRAFIA', monto: 11000, forma_pago: 'TRANSFERENCIA', es_urgente: false, estatus: 'PENDIENTE' },
];

const obrasResumen = [
  { nombre: 'MIRAVALLE AP MIAA', total: 856512, porcentaje: 20.3, registros: 145 },
  { nombre: 'JESUS TERAN', total: 719033, porcentaje: 17.1, registros: 98 },
  { nombre: 'PINAR DEL LAGO', total: 539911, porcentaje: 12.8, registros: 87 },
  { nombre: 'JUSTO SIERRA', total: 398956, porcentaje: 9.5, registros: 65 },
  { nombre: 'LAB SEMICONDUCTORES', total: 377014, porcentaje: 8.9, registros: 54 },
  { nombre: 'OFICINA', total: 255559, porcentaje: 6.1, registros: 120 },
];

export default function GastosObraPage() {
  const [gastos, setGastos] = useState<GastoObra[]>(gastosIniciales);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterObra, setFilterObra] = useState("TODAS");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showModal, setShowModal] = useState(false);
  const [editingGasto, setEditingGasto] = useState<GastoObra | null>(null);
  const [formData, setFormData] = useState({
    fecha: '', obra: '', solicitante: '', descripcion: '', proveedor: '',
    razon: '', monto: 0, forma_pago: 'EFECTIVO', es_urgente: false, estatus: 'PENDIENTE'
  });

  const stats = {
    totalSemana: gastos.reduce((sum, g) => sum + g.monto, 0),
    porTransferir: gastos.filter(g => g.forma_pago === 'TRANSFERENCIA' && g.estatus === 'PENDIENTE').reduce((sum, g) => sum + g.monto, 0),
    efectivoViernes: gastos.filter(g => g.estatus === 'VIERNES').reduce((sum, g) => sum + g.monto, 0),
    porReembolsar: gastos.filter(g => g.estatus === 'REEMBOLSAR').reduce((sum, g) => sum + g.monto, 0),
  };

  const filteredGastos = gastos.filter(g => {
    const matchSearch = searchTerm === "" || 
      g.proveedor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.razon?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchObra = filterObra === "TODAS" || g.obra === filterObra;
    return matchSearch && matchObra;
  });

  const obras = [...new Set(gastos.map(g => g.obra))];

  const handleNew = () => {
    setEditingGasto(null);
    setFormData({ fecha: new Date().toISOString().split('T')[0], obra: '', solicitante: '', descripcion: '', proveedor: '', razon: '', monto: 0, forma_pago: 'EFECTIVO', es_urgente: false, estatus: 'PENDIENTE' });
    setShowModal(true);
  };

  const handleEdit = (gasto: GastoObra) => {
    setEditingGasto(gasto);
    setFormData({ ...gasto });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar este gasto?')) {
      setGastos(gastos.filter(g => g.id !== id));
    }
  };

  const handleSave = () => {
    if (editingGasto) {
      setGastos(gastos.map(g => g.id === editingGasto.id ? { ...g, ...formData } : g));
    } else {
      const newGasto: GastoObra = { ...formData, id: Date.now().toString(), semana: 1 };
      setGastos([newGasto, ...gastos]);
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/20">
            <DollarSign className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Gastos de Obra</h1>
            <p className="text-slate-400 text-sm">Control integral de gastos, pagos y conciliación</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-sm">
            <Download className="w-4 h-4" />Exportar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 text-sm">
            <Upload className="w-4 h-4" />Importar
          </button>
          <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 text-sm">
            <Plus className="w-4 h-4" />Nuevo Gasto
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 border-b border-white/10 pb-4">
        {[
          { id: 'dashboard', label: '📊 Dashboard' },
          { id: 'transferir', label: '💳 Por Transferir' },
          { id: 'viernes', label: '💵 Efectivo Viernes' },
          { id: 'urgentes', label: '🔥 Urgentes' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === tab.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20"><DollarSign className="w-4 h-4 text-emerald-400" /></div>
            <span className="text-slate-400 text-xs">Total</span>
          </div>
          <p className="text-xl font-bold text-white">${stats.totalSemana.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-blue-500/20"><CreditCard className="w-4 h-4 text-blue-400" /></div>
            <span className="text-slate-400 text-xs">Por Transferir</span>
          </div>
          <p className="text-xl font-bold text-blue-400">${stats.porTransferir.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20"><Banknote className="w-4 h-4 text-amber-400" /></div>
            <span className="text-slate-400 text-xs">Viernes</span>
          </div>
          <p className="text-xl font-bold text-amber-400">${stats.efectivoViernes.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-red-500/20"><AlertTriangle className="w-4 h-4 text-red-400" /></div>
            <span className="text-slate-400 text-xs">Reembolsar</span>
          </div>
          <p className="text-xl font-bold text-red-400">${stats.porReembolsar.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-violet-500/20"><Building className="w-4 h-4 text-violet-400" /></div>
            <span className="text-slate-400 text-xs">Registros</span>
          </div>
          <p className="text-xl font-bold text-violet-400">{gastos.length}</p>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Resumen por Obra */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-400" />Gastos por Obra
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {obrasResumen.map((obra, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] cursor-pointer">
                  <div className="flex justify-between mb-2">
                    <p className="text-sm font-medium truncate">{obra.nombre}</p>
                    <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400">{obra.porcentaje}%</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-400">${obra.total.toLocaleString()}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{width: `${(obra.porcentaje/20.3)*100}%`}}></div></div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Gastos Registrados</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 w-48" />
                </div>
                <select value={filterObra} onChange={(e) => setFilterObra(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white">
                  <option value="TODAS">Todas</option>
                  {obras.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-3 py-2 text-xs text-slate-400">Fecha</th>
                  <th className="text-left px-3 py-2 text-xs text-slate-400">Obra</th>
                  <th className="text-left px-3 py-2 text-xs text-slate-400">Concepto</th>
                  <th className="text-left px-3 py-2 text-xs text-slate-400">Proveedor</th>
                  <th className="text-left px-3 py-2 text-xs text-slate-400">Pago</th>
                  <th className="text-right px-3 py-2 text-xs text-slate-400">Monto</th>
                  <th className="text-center px-3 py-2 text-xs text-slate-400">Estado</th>
                  <th className="text-center px-3 py-2 text-xs text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredGastos.map((g) => (
                  <tr key={g.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-3 py-3 text-slate-300">{g.fecha}</td>
                    <td className="px-3 py-3"><span className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-xs">{g.obra}</span></td>
                    <td className="px-3 py-3 text-white">{g.descripcion}</td>
                    <td className="px-3 py-3 text-slate-300 truncate max-w-[100px]">{g.proveedor}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-1 rounded-md text-xs ${g.forma_pago === 'TRANSFERENCIA' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {g.forma_pago === 'TRANSFERENCIA' ? '💳' : '💵'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-white">${g.monto.toLocaleString()}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        g.estatus === 'PAGADO' ? 'bg-emerald-500/20 text-emerald-400' :
                        g.estatus === 'VIERNES' ? 'bg-amber-500/20 text-amber-400' :
                        g.estatus === 'REEMBOLSAR' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>{g.estatus}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleEdit(g)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-blue-400"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(g.id)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
            <h2 className="text-lg font-semibold mb-4">💵 Viernes</h2>
            <div className="space-y-2">
              {gastos.filter(g => g.estatus === 'VIERNES').map(g => (
                <div key={g.id} className="flex justify-between p-2 rounded-lg bg-white/5">
                  <span className="text-slate-300 truncate max-w-[120px]">{g.proveedor}</span>
                  <span className="text-amber-400 font-medium">${g.monto.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-amber-500/20 flex justify-between">
              <span className="font-medium">TOTAL</span>
              <span className="text-amber-400 font-bold">${stats.efectivoViernes.toLocaleString()}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-red-500/10 to-rose-500/10 border border-red-500/20">
            <h2 className="text-lg font-semibold mb-4">🔥 Por Reembolsar</h2>
            <div className="space-y-2">
              {gastos.filter(g => g.estatus === 'REEMBOLSAR').map(g => (
                <div key={g.id} className="p-2 rounded-lg bg-white/5">
                  <div className="flex justify-between">
                    <span className="text-slate-300">{g.solicitante}</span>
                    <span className="text-red-400 font-medium">${g.monto.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{g.razon}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{editingGasto ? 'Editar Gasto' : 'Nuevo Gasto'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400">Fecha</label>
                  <input type="date" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                </div>
                <div>
                  <label className="text-sm text-slate-400">Obra</label>
                  <select value={formData.obra} onChange={e => setFormData({...formData, obra: e.target.value})}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white">
                    <option value="">Seleccionar</option>
                    <option>MIRAVALLE</option><option>JESUS TERAN</option><option>PINAR DEL LAGO</option>
                    <option>OFICINA</option><option>LAB SEMICONDUCTORES</option><option>JUSTO SIERRA</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-400">Solicitante</label>
                <input type="text" value={formData.solicitante} onChange={e => setFormData({...formData, solicitante: e.target.value})}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
              </div>
              <div>
                <label className="text-sm text-slate-400">Proveedor</label>
                <input type="text" value={formData.proveedor} onChange={e => setFormData({...formData, proveedor: e.target.value})}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
              </div>
              <div>
                <label className="text-sm text-slate-400">Descripción</label>
                <input type="text" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
              </div>
              <div>
                <label className="text-sm text-slate-400">Razón/Detalle</label>
                <textarea value={formData.razon} onChange={e => setFormData({...formData, razon: e.target.value})}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white h-20" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-slate-400">Monto</label>
                  <input type="number" value={formData.monto} onChange={e => setFormData({...formData, monto: parseFloat(e.target.value)})}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
                </div>
                <div>
                  <label className="text-sm text-slate-400">Forma Pago</label>
                  <select value={formData.forma_pago} onChange={e => setFormData({...formData, forma_pago: e.target.value})}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white">
                    <option>EFECTIVO</option><option>TRANSFERENCIA</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-400">Estado</label>
                  <select value={formData.estatus} onChange={e => setFormData({...formData, estatus: e.target.value})}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white">
                    <option>PENDIENTE</option><option>VIERNES</option><option>PAGADO</option><option>REEMBOLSAR</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-2">
                <Save className="w-4 h-4" />Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
