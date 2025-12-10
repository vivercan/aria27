"use client";
import { ReactNode } from "react";

interface ModuleGridProps {
  children: ReactNode;
}

export function ModuleGrid({ children }: ModuleGridProps) {
  return (
    <div 
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 420px)',
        columnGap: '32px',
        rowGap: '24px',
        justifyContent: 'flex-start',
        alignItems: 'start',
        paddingTop: '32px'
      }}
    >
      {children}
    </div>
  );
}
