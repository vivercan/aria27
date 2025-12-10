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
  badge, 
  badgeColor = "bg-white/10 text-white/70",
  meta,
  disabled 
}: ModuleCardProps) {
  const cardContent = (
    <div className={`
      group relative overflow-hidden rounded-2xl 
      border border-white/[0.08] 
      bg-gradient-to-br from-slate-800/50 to-slate-900/50
      backdrop-blur-xl
      p-6 h-[180px]
      shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]
      transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]
      ${disabled 
        ? 'opacity-40 cursor-not-allowed grayscale' 
        : 'cursor-pointer hover:-translate-y-1.5 hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-white/[0.15] active:translate-y-0 active:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.3)]'
      }
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
    `}>
      {/* Gradient glow on hover */}
      <div className={`absolute -inset-px bg-gradient-to-br ${color} opacity-0 group-hover:opacity-[0.12] transition-opacity duration-500 rounded-2xl blur-sm`} />
      
      {/* Top shine line */}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Badge - esquina superior derecha */}
      {badge && (
        <div className="absolute top-4 right-4 z-20">
          <span className={`
            inline-flex items-center px-2.5 py-1 rounded-full 
            text-[10px] font-bold tracking-wider uppercase
            ${badgeColor}
            border border-white/10
            shadow-sm
          `}>
            {badge}
          </span>
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* ICON BADGE GRANDE - 56x56px */}
        <div className={`
          relative flex items-center justify-center 
          w-14 h-14 rounded-2xl 
          bg-gradient-to-br ${color}
          shadow-lg shadow-black/30
          mb-4
          transition-all duration-300
          group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-black/40
          before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-t before:from-black/20 before:to-transparent
          after:absolute after:inset-[1px] after:rounded-[14px] after:bg-gradient-to-b after:from-white/25 after:to-transparent after:opacity-60
        `}>
          <Icon className="relative z-10 h-7 w-7 text-white drop-shadow-md" strokeWidth={1.75} />
        </div>
        
        {/* Texto */}
        <div className="flex-1 flex flex-col">
          {/* Title */}
          <h3 className="text-[15px] font-semibold text-white/95 leading-tight mb-1 group-hover:text-white transition-colors">
            {title}
          </h3>
          
          {/* Description */}
          <p className="text-[13px] text-white/45 leading-relaxed group-hover:text-white/55 transition-colors flex-1">
            {description}
          </p>
          
          {/* Meta info - renglón opcional */}
          {meta && (
            <p className="text-[11px] text-white/30 mt-2 font-medium tracking-wide">
              {meta}
            </p>
          )}
        </div>
      </div>
      
      {/* Bottom gradient line on hover */}
      <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${color} opacity-0 group-hover:opacity-60 transition-opacity duration-300`} />
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
