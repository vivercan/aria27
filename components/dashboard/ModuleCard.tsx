"use client";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  badge?: string;
}

export function ModuleCard({ title, description, icon: Icon, href, badge }: ModuleCardProps) {
  return (
    <Link href={href} className="group outline-none">
      <div className="relative flex items-start gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.3)] cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[3px] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-blue-500/30 hover:bg-white/[0.06] active:translate-y-0 active:shadow-[0_8px_32px_rgba(0,0,0,0.3)] focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900">
        
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-400 group-hover:from-blue-500 group-hover:to-blue-600 group-hover:text-white transition-all duration-300 shadow-lg shadow-blue-500/10 group-hover:shadow-blue-500/25">
          <Icon size={24} strokeWidth={1.5} />
        </div>
        
        <div className="relative flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-100 group-hover:text-white transition-colors duration-200 tracking-wide">
            {title}
          </h3>
          <p className="mt-1 text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-200 line-clamp-2">
            {description}
          </p>
          {badge && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {badge}
            </span>
          )}
        </div>

        <div className="absolute top-0 left-0 w-full h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    </Link>
  );
}