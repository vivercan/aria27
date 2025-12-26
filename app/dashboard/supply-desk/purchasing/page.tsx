"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Building2, Phone, Mail, CreditCard } from "lucide-react";

type Supplier = {
  id: number;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  payment_method: string;
  credit_days: number;
  bank_name: string;
  products_offered: string;
};

export default function PurchasingPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("suppliers").select("*").eq("active", true).order("name");
      setSuppliers((data || []) as Supplier[]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-white/5 hover:bg-white/10">
          <ArrowLeft size={20} className="text-slate-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Comparador de Cotizaciones</h1>
          <p className="text-slate-400 text-sm">Compara precios entre proveedores</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-20 text-slate-400">Cargando...</div>
        ) : suppliers.length === 0 ? (
          <div className="col-span-3 text-center py-20 text-slate-400">No hay proveedores</div>
        ) : (
          suppliers.map((s, i) => (
            <div key={s.id} className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-xl ${i === 0 ? "bg-green-500" : i === 1 ? "bg-blue-500" : "bg-purple-500"}`}>
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{s.name}</h3>
                  <p className="text-xs text-slate-400">{s.contact_name}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Phone className="w-4 h-4" /> {s.phone}
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Mail className="w-4 h-4" /> {s.email}
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <CreditCard className="w-4 h-4" /> {s.bank_name}
                </div>
              </div>
              <div className="flex gap-2 mb-3">
                <span className={`px-2 py-1 rounded text-xs ${s.credit_days === 0 ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>
                  {s.credit_days === 0 ? "CONTADO" : `${s.credit_days} días crédito`}
                </span>
                <span className="px-2 py-1 rounded text-xs bg-white/10 text-slate-300">
                  {s.payment_method}
                </span>
              </div>
              <p className="text-xs text-slate-500">{s.products_offered}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
