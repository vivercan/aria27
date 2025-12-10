"use client";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
  badge?: string | number;
}

export default function ModuleCard({
  title,
  description,
  icon: Icon,
  href,
  color,
  badge,
}: ModuleCardProps) {
  // Mapeo de colores para hover del card completo
  const colorMap: Record<string, string> = {
    blue: "hover:bg-blue-600/20 hover:border-blue-500/40",
    cyan: "hover:bg-cyan-600/20 hover:border-cyan-500/40",
    emerald: "hover:bg-emerald-600/20 hover:border-emerald-500/40",
    green: "hover:bg-green-600/20 hover:border-green-500/40",
    amber: "hover:bg-amber-600/20 hover:border-amber-500/40",
    orange: "hover:bg-orange-600/20 hover:border-orange-500/40",
    purple: "hover:bg-purple-600/20 hover:border-purple-500/40",
    pink: "hover:bg-pink-600/20 hover:border-pink-500/40",
    red: "hover:bg-red-600/20 hover:border-red-500/40",
    indigo: "hover:bg-indigo-600/20 hover:border-indigo-500/40",
    slate: "hover:bg-slate-600/20 hover:border-slate-500/40",
  };

  const bgColorMap: Record<string, string> = {
    blue: "bg-blue-600/80",
    cyan: "bg-cyan-600/80",
    emerald: "bg-emerald-600/80",
    green: "bg-green-600/80",
    amber: "bg-amber-600/80",
    orange: "bg-orange-600/80",
    purple: "bg-purple-600/80",
    pink: "bg-pink-600/80",
    red: "bg-red-600/80",
    indigo: "bg-indigo-600/80",
    slate: "bg-slate-600/80",
  };

  const hoverClass = colorMap[color] || colorMap.blue;
  const iconBgClass = bgColorMap[color] || bgColorMap.blue;

  return (
    <Link href={href} className="block group">
      <div
        className={`
          relative overflow-hidden rounded-2xl
          bg-[rgba(8,16,30,0.85)] backdrop-blur-md
          border border-white/[0.04]
          h-[140px] p-4
          transition-all duration-300 ease-out
          hover:-translate-y-1
          ${hoverClass}
        `}
        style={{
          boxShadow: '0 18px 40px rgba(0, 0, 0, 0.55)',
        }}
      >
        {/* Badge */}
        {badge !== undefined && (
          <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full min-w-[24px] text-center">
            {badge}
          </div>
        )}

        {/* Contenido */}
        <div className="flex items-start gap-4 h-full">
          {/* Icono - 20% transparencia (opacity-80), +2px (50x50) */}
          <div
            className={`
              flex-shrink-0 w-[50px] h-[50px] rounded-xl
              flex items-center justify-center
              ${iconBgClass}
              border border-white/20
              shadow-lg
              transition-transform duration-300
              group-hover:scale-110
            `}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>

          {/* Texto */}
          <div className="flex flex-col justify-center min-w-0 flex-1">
            <h3 className="text-white font-semibold text-base truncate">
              {title}
            </h3>
            <p className="text-slate-400 text-sm mt-1 line-clamp-2">
              {description}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
