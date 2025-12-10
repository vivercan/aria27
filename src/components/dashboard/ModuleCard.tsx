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

const colorClasses: Record<string, { bg: string; hover: string }> = {
  blue: { bg: "bg-blue-500/80", hover: "hover:bg-blue-500/20 hover:border-blue-500/50" },
  cyan: { bg: "bg-cyan-500/80", hover: "hover:bg-cyan-500/20 hover:border-cyan-500/50" },
  emerald: { bg: "bg-emerald-500/80", hover: "hover:bg-emerald-500/20 hover:border-emerald-500/50" },
  green: { bg: "bg-green-500/80", hover: "hover:bg-green-500/20 hover:border-green-500/50" },
  amber: { bg: "bg-amber-500/80", hover: "hover:bg-amber-500/20 hover:border-amber-500/50" },
  orange: { bg: "bg-orange-500/80", hover: "hover:bg-orange-500/20 hover:border-orange-500/50" },
  purple: { bg: "bg-purple-500/80", hover: "hover:bg-purple-500/20 hover:border-purple-500/50" },
  pink: { bg: "bg-pink-500/80", hover: "hover:bg-pink-500/20 hover:border-pink-500/50" },
  red: { bg: "bg-red-500/80", hover: "hover:bg-red-500/20 hover:border-red-500/50" },
  indigo: { bg: "bg-indigo-500/80", hover: "hover:bg-indigo-500/20 hover:border-indigo-500/50" },
  slate: { bg: "bg-slate-500/80", hover: "hover:bg-slate-500/20 hover:border-slate-500/50" },
};

export function ModuleCard({ title, description, icon: Icon, href, color, badge }: ModuleCardProps) {
  const classes = colorClasses[color] || colorClasses.blue;
  return (
    <Link href={href}>
      <div className={`relative h-[140px] p-4 rounded-2xl bg-slate-800/50 border border-white/10 backdrop-blur transition-all duration-300 hover:-translate-y-1 ${classes.hover}`}>
        {badge !== undefined && (
          <span className="absolute top-3 right-3 bg-cyan-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>
        )}
        <div className="flex items-start gap-4">
          <div className={`w-[52px] h-[52px] rounded-xl flex items-center justify-center ${classes.bg}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-base">{title}</h3>
            <p className="text-slate-400 text-sm mt-1 line-clamp-2">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
