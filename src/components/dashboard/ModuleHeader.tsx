"use client";

interface ModuleHeaderProps {
  title: string;
  subtitle: string;
}

export function ModuleHeader({ title, subtitle }: ModuleHeaderProps) {
  return (
    <div className="flex flex-col gap-1 mb-8">
      <h1 className="text-3xl font-bold text-white tracking-tight">
        {title}
      </h1>
      <p className="text-base text-white/50">
        {subtitle}
      </p>
    </div>
  );
}
