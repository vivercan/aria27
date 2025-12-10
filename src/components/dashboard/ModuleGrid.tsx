"use client";
import { ReactNode } from "react";

interface ModuleGridProps {
  children: ReactNode;
}

export function ModuleGrid({ children }: ModuleGridProps) {
  return (
    <div 
      className="w-full pt-8"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(320px, 1fr))',
        columnGap: '32px',
        rowGap: '24px'
      }}
    >
      {children}
    </div>
  );
}
