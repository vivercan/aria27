"use client";
import { ReactNode } from "react";

interface ModuleGridProps {
  children: ReactNode;
}

export function ModuleGrid({ children }: ModuleGridProps) {
  return (
    <div 
      className="w-full"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(360px, 1fr))',
        columnGap: '32px',
        rowGap: '24px',
        marginTop: '56px'
      }}
    >
      {children}
    </div>
  );
}
