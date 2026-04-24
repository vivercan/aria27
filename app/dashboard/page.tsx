"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { canAccessModule, type UserPermissions } from "@/lib/permissions";
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
  const [userRole, setUserRole] = useState("");
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar nombre de usuario
        const storedEmail = localStorage.getItem("userEmail");
        if (storedEmail) {
          const { data: user } = await supabase
            .from("Users")
            .select("display_name, name, role, permissions")
            .eq("email", storedEmail)
            .single();
          if (user) {
            setUserName(user.display_name || user.name || "");
            setUserRole(user.role || "user");
            setUserPermissions(user.permissions || {});
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
          .from("centros_trabajo")
          .select("*", { count: "exact", head: true });

        setStats({
          requisicionesHoy: reqHoy || 0,
          requisicionesPendientes: reqPend || 0,
          requisicionesAprobadas: reqApproved || 0,
          empleadosActivos: emps || 0,
          productosEnCatalogo: prods || 0,
          centrosDeCosto: centers || 0,
        });
      } catch (error: unknown) {
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
      color: "from-aria-primary to-aria-primary",
      bgColor: "bg-aria-primary/10",
      textColor: "text-aria-accent",
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
      color: "from-aria-primary to-aria-accent",
      bgColor: "bg-emerald-500/10",
      textColor: "text-aria-accent",
    },
    {
      title: "Empleados Activos",
      value: stats.empleadosActivos,
      icon: Users,
      color: "from-aria-primary to-aria-accent",
      bgColor: "bg-aria-primary/10",
      textColor: "text-aria-accent",
    },
    {
      title: "Productos",
      value: stats.productosEnCatalogo.toLocaleString(),
      icon: Package,
      color: "from-aria-primary to-aria-accent",
      bgColor: "bg-aria-accent-bg",
      textColor: "text-aria-accent",
    },
    {
      title: "Obras Activas",
      value: stats.centrosDeCosto,
      icon: Truck,
      color: "from-red-500 to-red-400",
      bgColor: "bg-rose-500/10",
      textColor: "text-rose-400",
    },
  ];

  const allQuickActions = [
    {
      title: "Nueva Requisición",
      description: "Solicitar materiales o servicios",
      href: "/dashboard/requisiciones/requisiciones",
      icon: FileText,
      color: "from-aria-primary to-aria-accent",
      module: "requisiciones",
    },
    {
      title: "Ver Empleados",
      description: "Gestionar personal y asistencias",
      href: "/dashboard/talento/personal",
      icon: Users,
      color: "from-aria-primary to-aria-accent",
      module: "talento",
    },
    {
      title: "Registro de Asistencia",
      description: "Ver entradas y salidas del día",
      href: "/dashboard/talento/checadas",
      icon: Clock,
      color: "from-aria-primary to-aria-accent",
      module: "talento",
    },
    {
      title: "Centros de Trabajo",
      description: "Configurar obras y ubicaciones",
      href: "/dashboard/configuracion/maestros/centros",
      icon: Activity,
      color: "from-amber-500 to-orange-500",
      module: "configuracion",
    },
    {
      title: "Carpetas Personalizadas",
      description: "Organiza archivos jerárquicamente en cualquier módulo",
      href: "/dashboard/carpetas",
      icon: FileText,
      color: "from-red-500 to-red-400",
      module: "dashboard",
    },
  ];

  const quickActions = allQuickActions.filter((action) =>
    canAccessModule(userRole, userPermissions, action.module)
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  // Panel contextual por rol — muestra atajos y foco relevante al usuario actual
  const roleNorm = (userRole || "").toLowerCase();
  const isAdmin = roleNorm === "admin" || roleNorm === "administrador" || roleNorm === "direccion";
  const isRH = roleNorm === "rh";
  const isCompras = roleNorm === "compras" || roleNorm === "almacen";
  const isResidente = roleNorm === "residente" || roleNorm === "operador";

  interface RolePanel { title: string; subtitle: string; links: { label: string; href: string; icon: typeof FileText; color: string; }[] }
  let rolePanel: RolePanel | null = null;

  if (isAdmin) {
    rolePanel = {
      title: "Vista ejecutiva",
      subtitle: "Controles y dashboards globales del ERP",
      links: [
        { label: "Dashboard CEO", href: "/dashboard/ceo", icon: TrendingUp, color: "text-amber-300" },
        { label: "Centro Control Obras", href: "/dashboard/obras/control", icon: Activity, color: "text-aria-accent" },
        { label: "Roles y permisos", href: "/dashboard/admin/roles", icon: Users, color: "text-aria-accent" },
        { label: "Auditoría", href: "/dashboard/admin/auditoria", icon: Clock, color: "text-rose-300" },
      ],
    };
  } else if (isRH) {
    rolePanel = {
      title: "Tu agenda de Talento",
      subtitle: "Personal, checadas e incidencias del día",
      links: [
        { label: "Personal activo", href: "/dashboard/talento/personal", icon: Users, color: "text-aria-accent" },
        { label: "Checadas del día", href: "/dashboard/talento/checadas", icon: Clock, color: "text-aria-accent" },
        { label: "Incidencias abiertas", href: "/dashboard/talento/incidencias", icon: AlertCircle, color: "text-amber-300" },
        { label: "Nómina", href: "/dashboard/talento/nomina", icon: DollarSign, color: "text-aria-accent" },
      ],
    };
  } else if (isCompras) {
    rolePanel = {
      title: "Cola de compras",
      subtitle: "Requisiciones pendientes y órdenes de compra",
      links: [
        { label: "Requisiciones pendientes", href: "/dashboard/requisiciones/requisiciones/tramite", icon: FileText, color: "text-amber-300" },
        { label: "Órdenes de compra", href: "/dashboard/requisiciones/requisiciones/ordenes", icon: Package, color: "text-aria-accent" },
        { label: "Proveedores", href: "/dashboard/requisiciones/proveedores", icon: Truck, color: "text-aria-accent" },
        { label: "Productos", href: "/dashboard/requisiciones/productos", icon: Package, color: "text-[#c9d8ed]" },
      ],
    };
  } else if (isResidente) {
    rolePanel = {
      title: "Tu obra hoy",
      subtitle: "Avance, bitácora y checadas del frente",
      links: [
        { label: "Centro Control", href: "/dashboard/obras/control", icon: Activity, color: "text-aria-accent" },
        { label: "Avance físico", href: "/dashboard/obras/avance", icon: TrendingUp, color: "text-aria-accent" },
        { label: "Bitácora", href: "/dashboard/obras/bitacora", icon: FileText, color: "text-amber-300" },
        { label: "Mis checadas", href: "/dashboard/talento/checadas", icon: Clock, color: "text-[#c9d8ed]" },
      ],
    };
  }

  return (
    <div className="aria-page-canon">
      {/* HEADER */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white" suppressHydrationWarning>
          {getGreeting()}{userName ? `, ${userName.split(" ")[0]}` : ""}
        </h1>
        <p className="text-[#7f93b0]">
          {rolePanel ? rolePanel.subtitle : "Aquí tienes un resumen de la actividad de hoy en ARIA"}
        </p>
        {!rolePanel && (
          <Link
            href="/dashboard/ceo"
            className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08] text-amber-200 hover:from-amber-500/30 hover:to-orange-500/30 transition w-fit"
          >
            <Activity className="w-4 h-4" />
            <span className="text-sm font-medium">Abrir Dashboard CEO — vista ejecutiva consolidada</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* PANEL POR ROL — atajos personalizados */}
      {rolePanel && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1E3E7A]/15 to-[#0A2450]/25 border border-[#3A5E9A]/40 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
          <h2 className="text-lg font-semibold text-white mb-4">{rolePanel.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {rolePanel.links.map((l, i) => (
              <Link
                key={i}
                href={l.href}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all group"
              >
                <l.icon className={`w-5 h-5 ${l.color} flex-shrink-0`} strokeWidth={1.75} />
                <span className="text-sm text-white font-medium flex-1">{l.label}</span>
                <ArrowRight className="w-4 h-4 text-[#7f93b0] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="group relative p-5 rounded-2xl bg-gradient-to-br from-[#1E3E7A]/15 to-[#0A2450]/25 border border-[#3A5E9A]/40 hover:border-[#5A7EBA]/60 shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all duration-300"
          >
            <div className={`inline-flex p-2.5 rounded-xl ${stat.bgColor} mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.textColor}`} strokeWidth={1.75} />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white">
                {loading ? (
                  <span className="inline-block w-8 h-6 bg-white/[0.06] rounded animate-pulse" />
                ) : (
                  stat.value
                )}
              </p>
              <p className="text-xs text-[#7f93b0] font-medium">{stat.title}</p>
            </div>
            {/* Glow effect on hover */}
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`} />
          </div>
        ))}
      </div>

      {/* QUICK ACTIONS */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-aria-accent" />
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="group relative p-5 rounded-2xl bg-gradient-to-br from-[#1E3E7A]/15 to-[#0A2450]/25 border border-[#3A5E9A]/40 hover:border-[#5A7EBA]/60 shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all duration-300 overflow-hidden"
            >
              {/* Background gradient */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${action.color} opacity-[0.08] blur-2xl group-hover:opacity-[0.15] transition-opacity duration-300`} />
              
              <div className="relative z-10">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${action.color} mb-4 shadow-lg`}>
                  <action.icon className="w-5 h-5 text-white" strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-semibold text-white mb-1 group-hover:text-aria-accent transition-colors">
                  {action.title}
                </h3>
                <p className="text-sm text-[#7f93b0]">{action.description}</p>
                <div className="mt-4 flex items-center text-sm text-aria-accent font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Ir ahora</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* SISTEMA INFO */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-aria-primary/10 to-aria-accent/10 border border-aria-primary/20">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-aria-primary-light">
            <AlertCircle className="w-6 h-6 text-aria-accent" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">Sistema ARIA - Infinity Loop</h3>
            <p className="text-[#c9d8ed] text-sm leading-relaxed">
              Bienvenido al ERP de Grupo Constructor Urbano Avante. Desde aquí puedes gestionar requisiciones,
              controlar asistencias, administrar empleados y más. Usa el menú lateral para navegar
              entre los módulos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}




