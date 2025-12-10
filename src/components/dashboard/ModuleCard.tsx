"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
  badge?: string;
  disabled?: boolean;
}

export function ModuleCard({ title, description, icon: Icon, href, color, badge, disabled }: ModuleCardProps) {
  const cardContent = (
    <div className={`
      group relative overflow-hidden rounded-2xl 
      border border-white/[0.08] 
      bg-gradient-to-br from-white/[0.05] to-white/[0.02]
      backdrop-blur-sm
      p-6 h-full
      shadow-[0_4px_24px_-4px_rgba(0,0,0,0.3)]
      transition-all duration-300 ease-out
      ${disabled 
        ? 'opacity-50 cursor-not-allowed' 
        : 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.4)] hover:border-white/[0.15] active:translate-y-0 active:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.3)]'
      }
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
    `}>
      {/* Glow effect on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-300`} />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Icon container */}
        <div className={`
          inline-flex items-center justify-center 
          w-12 h-12 rounded-xl 
          bg-gradient-to-br ${color}
          shadow-lg shadow-black/20
          mb-4
          transition-transform duration-300
          group-hover:scale-105
        `}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        
        {/* Title + Badge row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-base font-semibold text-white/95 leading-tight">
            {title}
          </h3>
          {badge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/70 border border-white/10 whitespace-nowrap">
              {badge}
            </span>
          )}
        </div>
        
        {/* Description */}
        <p className="text-sm text-white/50 leading-relaxed">
          {description}
        </p>
      </div>
      
      {/* Bottom shine line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );

  if (disabled) {
    return cardContent;
  }

  return (
    <Link href={href} className="block focus:outline-none">
      {cardContent}
    </Link>
  );
}
