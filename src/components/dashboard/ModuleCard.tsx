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
  badgeColor = "bg-white/10 text-white/80 border-white/15",
  meta,
  disabled 
}: ModuleCardProps) {
  const cardContent = (
    <div className={`
      group relative overflow-hidden 
      rounded-[20px] 
      border border-white/[0.04]
      bg-[rgba(8,16,30,0.85)] backdrop-blur-xl
      p-5 h-[180px]
      shadow-[0_18px_40px_rgba(0,0,0,0.55)]
      transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]
      ${disabled 
        ? 'opacity-40 cursor-not-allowed grayscale' 
        : 'cursor-pointer hover:-translate-y-[3px] hover:scale-[1.01] hover:shadow-[0_24px_50px_rgba(0,0,0,0.65),0_0_18px_rgba(0,125,255,0.35)] hover:border-white/[0.08] hover:bg-[rgba(12,22,40,0.90)] active:translate-y-0 active:scale-[0.99]'
      }
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020712]
    `}>
      {/* Gradiente interno sutil */}
      <div 
        className="absolute inset-0 opacity-30 rounded-[20px]"
        style={{
          background: "linear-gradient(145deg, rgba(2,8,31,0.5) 0%, rgba(4,23,49,0.3) 100%)",
        }}
      />
      
      {/* Top shine */}
      <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      
      {/* Badge - esquina superior derecha */}
      {badge && (
        <div className="absolute top-4 right-4 z-20">
          <span className={`
            inline-flex items-center px-2.5 py-1 rounded-full 
            text-[10px] font-bold tracking-wider uppercase
            ${badgeColor}
            border
          `}>
            {badge}
          </span>
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10 flex gap-4 h-full">
        {/* ICON BADGE - 56x56px */}
        <div className={`
          relative flex-shrink-0 flex items-center justify-center 
          w-14 h-14 rounded-2xl 
          bg-gradient-to-br ${color}
          border border-white/30
          shadow-[0_12px_30px_rgba(0,0,0,0.45)]
          transition-all duration-300
          group-hover:scale-105 group-hover:shadow-[0_16px_40px_rgba(0,0,0,0.55)]
        `}>
          {/* Inner glow */}
          <div className="absolute inset-[1px] rounded-[14px] bg-gradient-to-b from-white/20 to-transparent opacity-60" />
          <Icon className="relative z-10 h-7 w-7 text-white drop-shadow-md" strokeWidth={2} />
        </div>
        
        {/* Texto */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          {/* Title */}
          <h3 className="text-[15px] font-semibold text-white/95 leading-tight mb-1 group-hover:text-white transition-colors truncate">
            {title}
          </h3>
          
          {/* Description */}
          <p className="text-[13px] text-white/60 leading-relaxed group-hover:text-white/70 transition-colors line-clamp-2">
            {description}
          </p>
          
          {/* Meta info */}
          {meta && (
            <p className="text-[11px] text-white/40 mt-2 font-medium">
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
