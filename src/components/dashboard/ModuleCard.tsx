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
      border border-white/[0.06]
      bg-[rgba(2,16,36,0.85)] backdrop-blur-xl
      p-5 h-[180px]
      w-full max-w-[540px]
      shadow-[0_16px_40px_rgba(0,0,0,0.50)]
      transition-all duration-300 ease-out
      ${disabled 
        ? 'opacity-40 cursor-not-allowed grayscale' 
        : 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.60),0_0_20px_rgba(56,189,248,0.15)] hover:border-white/[0.10] hover:bg-[rgba(4,20,44,0.90)] active:translate-y-0'
      }
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#021024]
    `}>
      {/* Top shine */}
      <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      {/* Badge */}
      {badge && (
        <div className="absolute top-4 right-4 z-20">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${badgeColor} border`}>
            {badge}
          </span>
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10 flex gap-4 h-full">
        {/* Icon Badge 56x56 */}
        <div className={`
          relative flex-shrink-0 flex items-center justify-center 
          w-14 h-14 rounded-2xl 
          bg-gradient-to-br ${color}
          border border-white/25
          shadow-[0_10px_25px_rgba(0,0,0,0.40)]
          transition-all duration-300
          group-hover:scale-105 group-hover:shadow-[0_14px_35px_rgba(0,0,0,0.50)]
        `}>
          <div className="absolute inset-[1px] rounded-[14px] bg-gradient-to-b from-white/20 to-transparent opacity-50" />
          <Icon className="relative z-10 h-7 w-7 text-white drop-shadow-sm" strokeWidth={2} />
        </div>
        
        {/* Text */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <h3 className="text-[15px] font-semibold text-white/95 leading-tight mb-1 group-hover:text-white transition-colors truncate">
            {title}
          </h3>
          <p className="text-[13px] text-white/55 leading-relaxed group-hover:text-white/65 transition-colors line-clamp-2">
            {description}
          </p>
          {meta && (
            <p className="text-[11px] text-white/35 mt-2 font-medium">{meta}</p>
          )}
        </div>
      </div>
      
      {/* Bottom line on hover */}
      <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${color} opacity-0 group-hover:opacity-50 transition-opacity duration-300`} />
    </div>
  );

  if (disabled) return cardContent;

  return (
    <Link href={href} className="block focus:outline-none">
      {cardContent}
    </Link>
  );
}
