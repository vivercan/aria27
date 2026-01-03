"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  FileText,
  Users,
  Package,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Activity,
  Calendar,
  DollarSign,
  Truck,
} from "lucide-react";

interface DashboardStats {
  requisicionesHoy: number;
  requisicionesPendientes: number;
  requisicionesAprobadas: number;
  empleadosActivos: number;
  productosEnCatalogo: number;
  centrosDeCosto: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    requisicionesHoy: 0,
    requisicionesPendientes: 0,
    requisicionesAprobadas: 0,
    empleadosActivos: 0,
    productosEnCatalogo: 0,
    centrosDeCosto: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar nombre de usuario
        const storedEmail = localStorage.getItem("userEmail");
        if (storedEmail) {
          const { data: user } = await supabase
            .from("Users")
            .select("display_name, name")
            .eq("email", storedEmail)
            .single();
          if (user) {
            setUserName(user.display_name || user.name || "");
          }
        }

        // Cargar estadísticas
        const today = new Date().toISOString().split("T")[0];

        // Requisiciones de hoy
        const { count: reqHoy } = await supabase
          .from("Requisiciones")
          .select("*", { count: "exact", head: true })
          .gte("created_at", today);

        // Requisiciones pendientes
        const { count: reqPend } = await supabase
          .from("Requisiciones")
          .select("*", { count: "exact", head: true })
          .in("status", ["PENDIENTE", "VALIDADA", "EN_COTIZACION"]);

        // Requisiciones aprobadas
        const { count: reqApproved } = await supabase
          .from("Requisiciones")
          .select("*", { count: "exact", head: true })
          .eq("status", "AUTORIZADA");

        // Empleados activos
        const { count: emps } = await supabase
          .from("Personal")
          .select("*", { count: "exact", head: true })
          .eq("status", "ACTIVO");

        // Productos
        const { count: prods } = await supabase
          .from("Productos")
          .select("*", { count: "exact", head: true });

        // Centros de costo
        const { count: centers } = await supabase
          .from("cost_centers")
          .select("*", { count: "exact", head: true });

        setStats({
          requisicionesHoy: reqHoy || 0,
          requisicionesPendientes: reqPend || 0,
          requisicionesAprobadas: reqApproved || 0,
          empleadosActivos: emps || 0,
          productosEnCatalogo: prods || 0,
          centrosDeCosto: centers || 0,
        });
      } catch (error) {
        console.error("Error cargando stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const statCards = [
    {
      title: "Requisiciones Hoy",
      value: stats.requisicionesHoy,
      icon: FileText,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-400",
    },
    {
      title: "Pendientes",
      value: stats.requisicionesPendientes,
      icon: Clock,
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-500/10",
      textColor: "text-amber-400",
    },
    {
      title: "Aprobadas",
      value: stats.requisicionesAprobadas,
      icon: CheckCircle2,
      color: "from-emerald-500 to-green-500",
      bgColor: "bg-emerald-500/10",
      textColor: "text-emerald-400",
    },
    {
      title: "Empleados Activos",
      value: stats.empleadosActivos,
      icon: Users,
      color: "from-violet-500 to-purple-500",
      bgColor: "bg-violet-500/10",
      textColor: "text-violet-400",
    },
    {
      title: "Productos",
      value: stats.productosEnCatalogo.toLocaleString(),
      icon: Package,
      color: "from-cyan-500 to-teal-500",
      bgColor: "bg-cyan-500/10",
      textColor: "text-cyan-400",
    },
    {
      title: "Obras Activas",
      value: stats.centrosDeCosto,
      icon: Truck,
      color: "from-rose-500 to-pink-500",
      bgColor: "bg-rose-500/10",
      textColor: "text-rose-400",
    },
  ];

  const quickActions = [
    {
      title: "Nueva Requisición",
      description: "Solicitar materiales o servicios",
      href: "/dashboard/abasto/Requisiciones",
      icon: FileText,
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Ver Empleados",
      description: "Gestionar personal y asistencias",
      href: "/dashboard/talento/Personal",
      icon: Users,
      color: "from-violet-500 to-purple-500",
    },
    {
      title: "Registro de Asistencia",
      description: "Ver entradas y salidas del día",
      href: "/dashboard/talento/Checadas",
      icon: Clock,
      color: "from-emerald-500 to-green-500",
    },
    {
      title: "Centros de Trabajo",
      description: "Configurar obras y ubicaciones",
      href: "/dashboard/config/maestros/centros",
      icon: Activity,
      color: "from-amber-500 to-orange-500",
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white">
          {getGreeting()}{userName ? `, ${userName.split(" ")[0]}` : ""}
        </h1>
        <p className="text-slate-400">
          Aquí tienes un resumen de la actividad de hoy en ARIA
        </p>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="group relative p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
          >
            <div className={`inline-flex p-2.5 rounded-xl ${stat.bgColor} mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.textColor}`} strokeWidth={1.75} />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white">
                {loading ? (
                  <span className="inline-block w-8 h-6 bg-white/10 rounded animate-pulse" />
                ) : (
                  stat.value
                )}
              </p>
              <p className="text-xs text-slate-400 font-medium">{stat.title}</p>
            </div>
            {/* Glow effect on hover */}
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`} />
          </div>
        ))}
      </div>

      {/* QUICK ACTIONS */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="group relative p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-300 overflow-hidden"
            >
              {/* Background gradient */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${action.color} opacity-[0.08] blur-2xl group-hover:opacity-[0.15] transition-opacity duration-300`} />
              
              <div className="relative z-10">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${action.color} mb-4 shadow-lg`}>
                  <action.icon className="w-5 h-5 text-white" strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors">
                  {action.title}
                </h3>
                <p className="text-sm text-slate-400">{action.description}</p>
                <div className="mt-4 flex items-center text-sm text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Ir ahora</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* SISTEMA INFO */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-500/20">
            <AlertCircle className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">Sistema ARIA - Infinity Loop</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Bienvenido al ERP de Grupo Cuavante. Desde aquí puedes gestionar requisiciones, 
              controlar asistencias, administrar empleados y más. Usa el menú lateral para navegar 
              entre los módulos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
