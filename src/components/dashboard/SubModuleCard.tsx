"use client";

import Link from "next/link";
import type { ComponentType } from "react";

type IconType = ComponentType<{ className?: string }>;

interface SubModuleCardProps {
  title: string;
  description: string;
  href: string;
  icon: IconType;
}

export function SubModuleCard({ title, description, href, icon: Icon }: SubModuleCardProps) {
  return (
    <Link href={href} className="group block">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-md transition hover:border-white/30 hover:bg-white/10">
        <div className="flex items-start gap-3">
          {Icon && <Icon className="h-6 w-6 opacity-80 group-hover:opacity-100" />}
          <div className="space-y-1">
            <h3 className="font-semibold text-sm md:text-base">{title}</h3>
            <p className="text-xs md:text-sm text-white/70">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
