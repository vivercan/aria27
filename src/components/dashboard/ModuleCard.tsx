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

// Mapeo de colores a RGB para el hover accent
const accentMap: Record<string, string> = {
  "from-emerald-500 to-emerald-600": "16, 185, 129",
  "from-green-500 to-green-600": "34, 197, 94",
  "from-cyan-500 to-cyan-600": "6, 182, 212",
  "from-blue-500 to-blue-600": "59, 130, 246",
  "from-indigo-500 to-indigo-600": "99, 102, 241",
  "from-purple-500 to-purple-600": "168, 85, 247",
  "from-pink-500 to-pink-600": "236, 72, 153",
  "from-rose-500 to-rose-600": "244, 63, 94",
  "from-red-500 to-red-600": "239, 68, 68",
  "from-orange-500 to-orange-600": "249, 115, 22",
  "from-amber-500 to-amber-600": "245, 158, 11",
  "from-yellow-500 to-yellow-600": "234, 179, 8",
  "from-teal-500 to-teal-600": "20, 184, 166",
  "from-slate-500 to-slate-600": "100, 116, 139",
  "from-gray-500 to-gray-600": "107, 114, 128",
};

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
  const accentRgb = accentMap[color] || "59, 130, 246";
  
  const cardContent = (
    <div 
      className={`
        group relative overflow-hidden
        rounded-xl
        backdrop-blur-[14px]
        transition-all duration-200 ease-out
        ${disabled
          ? 'opacity-40 cursor-not-allowed grayscale'
          : 'cursor-pointer'
        }
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50
      `}
      style={{
        height: '120px',
        padding: '20px 24px',
        background: 'linear-gradient(135deg, rgba(5, 12, 28, 0.88), rgba(10, 28, 60, 0.78))',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 8px 22px rgba(0, 0, 0, 0.45)',
        // CSS variable para el hover
        ['--accent-rgb' as string]: accentRgb,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        const el = e.currentTarget;
        el.style.background = `radial-gradient(circle at top left, rgba(${accentRgb}, 0.14), transparent 55%), linear-gradient(135deg, rgba(5, 12, 28, 0.92), rgba(10, 28, 60, 0.82))`;
        el.style.borderColor = `rgba(${accentRgb}, 0.4)`;
        el.style.boxShadow = `0 10px 26px rgba(0, 0, 0, 0.55), 0 0 18px rgba(${accentRgb}, 0.22)`;
        el.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        const el = e.currentTarget;
        el.style.background = 'linear-gradient(135deg, rgba(5, 12, 28, 0.88), rgba(10, 28, 60, 0.78))';
        el.style.borderColor = 'rgba(255, 255, 255, 0.05)';
        el.style.boxShadow = '0 8px 22px rgba(0, 0, 0, 0.45)';
        el.style.transform = 'translateY(0)';
      }}
    >
      <div className="relative z-10 flex items-center gap-4 h-full">
        {/* ICON BADGE - 72x72px, radius 14px, opacity 70% */}
        <div 
          className={`
            relative flex-shrink-0 flex items-center justify-center
            bg-gradient-to-br ${color}
            transition-all duration-300
            group-hover:scale-105
          `}
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '14px',
            opacity: 0.7,
            boxShadow: `0 4px 15px ${glowColor}`,
          }}
        >
          <Icon className="relative z-10 text-white" style={{ width: '36px', height: '36px', opacity: 1 }} strokeWidth={1.75} />
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
