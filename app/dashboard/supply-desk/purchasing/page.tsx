"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Building2, CreditCard, Clock, DollarSign, 
  CheckCircle2, Truck, Phone, Mail, MapPin, Star,
  FileText, TrendingUp, Percent
} from "lucide-react";

type Supplier = {
  id: number;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  payment_method: string;
  credit_days: number;
  bank_name: string;
  categories: string[];
  products_offered: string;
};

type QuoteItem = {
  supplier_id: number;
  supplier_name: string;
  unit_price: number;
  includes_iva: boolean;
  delivery_days: number;
  payment_method: string;
  credit_days: number;
  notes: string;
};

export default function QuotesPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    const { data } = await supabase
      .from("suppliers")
      .select("*")
      .eq("active", true)
      .order("name");
    setSuppliers((data || []) as Supplier[]);
    setLoading(false);
  };

  const getPaymentColor = (method: string) => {
    if (method.includes("EFECTIVO")) return "from-green-500 to-emerald-600";
    if (method.includes("TRANSFERENCIA")) return "from-blue-500 to-cyan-600";
    return "from-purple-500 to-violet-600";
  };

  const getCreditBadge = (days: number) => {
    if (days === 0) return { text: "CONTADO", color: "bg-green-500/20 text-green-400 border-green-500/30" };
    if (days <= 15) return { text: `${days} días crédito`, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
    return { text: `${days} días crédito`, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
  };

  // Cotizaciones de ejemplo para demostración
  const demoQuotes = [
    {
      product: "Cemento Gris 50kg",
      unit: "SACO",
      quantity: 100,
      quotes: [
        { supplier_id: 1, price: 185, iva: true, delivery: 1 },
        { supplier_id: 2, price: 178, iva: true, delivery: 2 },
        { supplier_id: 3, price: 182, iva: false, delivery: 1 },
      ]
    },
    {
      product: "Varilla 3/8 Corrugada",
      unit: "PIEZA",
      quantity: 200,
      quotes: [
        { supplier_id: 1, price: 89, iva: true, delivery: 3 },
        { supplier_id: 2, price: 92, iva: true, delivery: 1 },
        { supplier_id: 3, price: 85, iva: false, delivery: 2 },
      ]
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-all"
          >
            <ArrowLeft size={20} className="text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Comparador de Cotizaciones</h1>
            <p className="text-slate-400 text-sm">Compara precios y condiciones de pago entre proveedores</p>
          </div>
        </div>
      </div>

      {/* Proveedores Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-20 text-slate-400">Cargando proveedores...</div>
        ) : suppliers.length === 0 ? (
          <div className="col-span-3 text-center py-20 text-slate-400">No hay proveedores registrados</div>
        ) : (
          suppliers.map((supplier, index) => {
            const creditBadge = getCreditBadge(supplier.credit_days);
            const isSelected = selectedSupplier === supplier.id;
            
            return (
              <div
                key={supplier.id}
                onClick={() => setSelectedSupplier(isSelected ? null : supplier.id)}
                className={`relative p-5 rounded-2xl border cursor-pointer transition-all duration-300 ${
                  isSelected 
                    ? "bg-blue-500/10 border-blue-500/50 scale-[1.02]" 
                    : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15]"
                }`}
              >
                {/* Ranking Badge */}
                <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? "bg-yellow-500 text-black" : 
                  index === 1 ? "bg-slate-400 text-black" : 
                  "bg-orange-600 text-white"
                }`}>
                  {index + 1}
                </div>

                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${getPaymentColor(supplier.payment_method)}`}>
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{supplier.name}</h3>
                    <p className="text-xs text-slate-400">{supplier.contact_name}</p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${creditBadge.color}`}>
                    {creditBadge.text}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/10 text-slate-300 border border-white/10">
                    {supplier.payment_method}
                  </span>
                </div>

                {/* Info Grid */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{supplier.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{supplier.bank_name}</span>
                  </div>
                </div>

                {/* Products */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-slate-500 mb-1">Productos:</p>
                  <p className="text-sm text-slate-300 line-clamp-2">{supplier.products_offered}</p>
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-3 left-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-400" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Tabla Comparativa Demo */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-purple-500/20">
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Comparativa de Precios</h2>
            <p className="text-xs text-slate-400">Ejemplo de cotización para materiales</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-slate-400 text-sm font-medium">Material</th>
                <th className="text-center py-3 px-4 text-slate-400 text-sm font-medium">Cant.</th>
                {suppliers.slice(0, 3).map((s) => (
                  <th key={s.id} className="text-center py-3 px-4 text-slate-400 text-sm font-medium min-w-[150px]">
                    <div className="truncate">{s.name.split(" ")[0]}</div>
                    <div className="text-xs text-slate-500">{getCreditBadge(s.credit_days).text}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {demoQuotes.map((item, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-4 px-4">
                    <div className="font-medium text-white">{item.product}</div>
                    <div className="text-xs text-slate-500">{item.unit}</div>
                  </td>
                  <td className="text-center py-4 px-4 text-slate-300">{item.quantity}</td>
                  {item.quotes.map((quote, qIdx) => {
                    const supplier = suppliers.find(s => s.id === quote.supplier_id) || suppliers[qIdx];
                    const total = quote.price * item.quantity;
                    const totalWithIva = quote.iva ? total : total * 1.16;
                    const isLowest = quote.price === Math.min(...item.quotes.map(q => q.price));
                    
                    return (
                      <td key={qIdx} className={`text-center py-4 px-4 ${isLowest ? "bg-green-500/10" : ""}`}>
                        <div className={`text-lg font-bold ${isLowest ? "text-green-400" : "text-white"}`}>
                          ${quote.price.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-400">
                          {quote.iva ? (
                            <span className="text-green-400">✓ IVA incluido</span>
                          ) : (
                            <span className="text-yellow-400">+ IVA</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          <Truck className="w-3 h-3 inline mr-1" />
                          {quote.delivery} día{quote.delivery > 1 ? "s" : ""}
                        </div>
                        <div className="text-sm font-medium text-slate-300 mt-2">
                          Total: ${totalWithIva.toLocaleString()}
                        </div>
                        {isLowest && (
                          <div className="mt-2">
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                              ★ Mejor precio
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resumen */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {suppliers.slice(0, 3).map((supplier, idx) => {
            const creditBadge = getCreditBadge(supplier.credit_days);
            return (
              <div key={supplier.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <div className="text-sm font-medium text-white mb-2">{supplier.name.split(" ").slice(0, 2).join(" ")}</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pago:</span>
                    <span className="text-slate-300">{supplier.payment_method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Crédito:</span>
                    <span className={supplier.credit_days > 0 ? "text-blue-400" : "text-green-400"}>
                      {supplier.credit_days === 0 ? "Contado" : `${supplier.credit_days} días`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Banco:</span>
                    <span className="text-slate-300">{supplier.bank_name}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
