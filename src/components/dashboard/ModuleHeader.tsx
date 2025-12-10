"use client";

interface ModuleHeaderProps {
  title: string;
  subtitle: string;
}

export function ModuleHeader({ title, subtitle }: ModuleHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-white tracking-tight mb-2 drop-shadow-sm">
        {title}
      </h1>
      <p className="text-base text-white/50 font-medium">
        {subtitle}
      </p>
    </div>
  );
}
