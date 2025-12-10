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
  disabled 
}: ModuleCardProps) {
  const cardContent = (
    <div className={`
      group relative overflow-hidden rounded-2xl 
      border border-white/[0.08] 
      bg-gradient-to-br from-slate-800/50 to-slate-900/50
      backdrop-blur-xl
      p-5 h-full min-h-[140px]
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
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header: Icon + Badge */}
        <div className="flex items-start justify-between mb-4">
          {/* Icon Badge */}
          <div className={`
            relative flex items-center justify-center 
            w-11 h-11 rounded-xl 
            bg-gradient-to-br ${color}
            shadow-lg shadow-black/30
            transition-all duration-300
            group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-black/40
            before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-t before:from-black/20 before:to-transparent
            after:absolute after:inset-[1px] after:rounded-[10px] after:bg-gradient-to-b after:from-white/20 after:to-transparent after:opacity-60
          `}>
            <Icon className="relative z-10 h-5 w-5 text-white drop-shadow-sm" strokeWidth={2} />
          </div>
          
          {/* Badge */}
          {badge && (
            <span className={`
              inline-flex items-center px-2.5 py-1 rounded-full 
              text-[10px] font-semibold tracking-wide uppercase
              ${badgeColor}
              border border-white/10
              shadow-sm
            `}>
              {badge}
            </span>
          )}
        </div>
        
        {/* Title */}
        <h3 className="text-[15px] font-semibold text-white/95 leading-tight mb-1.5 group-hover:text-white transition-colors">
          {title}
        </h3>
        
        {/* Description */}
        <p className="text-[13px] text-white/45 leading-relaxed group-hover:text-white/55 transition-colors">
          {description}
        </p>
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
