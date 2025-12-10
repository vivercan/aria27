"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
  glowColor: string;
  badge?: string;
  badgeColor?: string;
  meta?: string;
  disabled?: boolean;
}

export function ModuleCard({ 
  title, 
  description, 
  icon: Icon, 
  href, 
  color, 
  glowColor,
  badge, 
  badgeColor = "bg-white/10 text-slate-300 border-white/10",
  meta,
  disabled 
}: ModuleCardProps) {
  const cardContent = (
    <div className={`
      group relative overflow-hidden 
      rounded-3xl 
      border border-white/[0.08]
      bg-white/[0.03] backdrop-blur-xl
      p-5 h-[160px]
      w-full max-w-[580px]
      shadow-[0_8px_32px_rgba(0,0,0,0.3)]
      transition-all duration-300 ease-out
      ${disabled 
        ? 'opacity-40 cursor-not-allowed grayscale' 
        : 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.4)] hover:border-white/[0.12] hover:bg-white/[0.05] active:translate-y-0'
      }
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a]
    `}>
      {/* Top edge gradient border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      {/* Content con badge integrado */}
      <div className="relative z-10 flex items-center gap-4 h-full">
        {/* NEON ICON SQUIRCLE */}
        <div className={`
          relative flex-shrink-0 flex items-center justify-center 
          w-14 h-14 
          rounded-[18px]
          bg-gradient-to-br ${color}
          border border-white/20
          shadow-[0_0_20px_${glowColor},inset_0_1px_0_rgba(255,255,255,0.2)]
          transition-all duration-300
          group-hover:shadow-[0_0_30px_${glowColor},0_0_60px_${glowColor}]
          group-hover:scale-105
        `}>
          <div className="absolute inset-[2px] rounded-[16px] bg-gradient-to-b from-white/30 to-transparent opacity-60" />
          <div className={`absolute -inset-2 rounded-[22px] bg-gradient-to-br ${color} opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-300`} />
          <Icon className="relative z-10 h-7 w-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" strokeWidth={1.75} />
        </div>
        
        {/* Text - centro */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <h3 className="text-[15px] font-semibold text-white leading-tight mb-1.5 group-hover:text-white transition-colors truncate">
            {title}
          </h3>
          <p className="text-[13px] text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors line-clamp-2">
            {description}
          </p>
          {meta && (
            <p className="text-[11px] text-slate-500 mt-1.5 font-medium">{meta}</p>
          )}
        </div>
        
        {/* BADGE - EXTREMA DERECHA */}
        {badge && (
          <div className="flex-shrink-0 self-start mt-1">
            <span className={`
              inline-flex items-center 
              px-3 py-1.5 
              rounded-full 
              text-[10px] font-bold tracking-wider uppercase
              ${badgeColor} 
              border 
              backdrop-blur-sm
              shadow-sm
            `}>
              {badge}
            </span>
          </div>
        )}
      </div>
      
      {/* Bottom accent line on hover */}
      <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${color} opacity-0 group-hover:opacity-60 transition-opacity duration-300`} />
    </div>
  );

  if (disabled) return cardContent;

  return (
    <Link href={href} className="block focus:outline-none">
      {cardContent}
    </Link>
  );
}
