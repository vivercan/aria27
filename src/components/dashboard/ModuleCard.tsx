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
    <div 
      className={`
        group relative overflow-hidden
        rounded-lg
        border border-white/[0.08]
        bg-[#0a0f1a]/80 backdrop-blur-xl
        shadow-[0_8px_32px_rgba(0,0,0,0.3)]
        transition-all duration-300 ease-out
        ${disabled
          ? 'opacity-40 cursor-not-allowed grayscale'
          : 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.4)] hover:border-white/[0.12] hover:bg-[#0a0f1a]/90 active:translate-y-0'
        }
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50
      `}
      style={{
        height: '120px',
        padding: '20px 24px'
      }}
    >
      <div className="relative z-10 flex items-center gap-4 h-full">
        {/* ICON BADGE - 62x62px, 85% opacity, rounded-16px */}
        <div 
          className={`
            relative flex-shrink-0 flex items-center justify-center
            bg-gradient-to-br ${color}
            shadow-[0_4px_15px_${glowColor}]
            transition-all duration-300
            group-hover:shadow-[0_6px_20px_${glowColor}]
            group-hover:scale-105
          `}
          style={{
            width: '62px',
            height: '62px',
            borderRadius: '16px',
            opacity: 0.85
          }}
        >
          <Icon className="relative z-10 text-white" style={{ width: '31px', height: '31px', opacity: 1 }} strokeWidth={1.75} />
        </div>

        {/* Text */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <h3 className="text-[15px] font-semibold text-white leading-tight mb-1 truncate">
            {title}
          </h3>
          <p className="text-[13px] text-slate-400 leading-relaxed line-clamp-2">
            {description}
          </p>
          {meta && (
            <p className="text-[11px] text-slate-500 mt-1 font-medium">{meta}</p>
          )}
        </div>

        {/* BADGE */}
        {badge && (
          <div className="flex-shrink-0 self-center">
            <span className={`
              inline-flex items-center
              px-3 py-1.5
              rounded-full
              text-[10px] font-bold tracking-wider uppercase
              ${badgeColor}
              border
              backdrop-blur-sm
            `}>
              {badge}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (disabled) return cardContent;

  return (
    <Link href={href} className="block focus:outline-none">
      {cardContent}
    </Link>
  );
}

