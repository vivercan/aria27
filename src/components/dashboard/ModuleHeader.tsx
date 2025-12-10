"use client";

interface ModuleHeaderProps {
  title: string;
  subtitle: string;
}

export function ModuleHeader({ title, subtitle }: ModuleHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">
        {title}
      </h1>
      <p className="text-base text-slate-300">
        {subtitle}
      </p>
    </div>
  );
}
