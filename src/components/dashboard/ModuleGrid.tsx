"use client";
import { ReactNode } from "react";

interface ModuleGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}

export function ModuleGrid({ children, columns = 3 }: ModuleGridProps) {
  return (
    <div 
      className="
        grid 
        grid-cols-1 
        md:grid-cols-2 
        lg:grid-cols-3 
        gap-x-8 
        gap-y-6 
        pt-6 
        pb-8
      "
      style={{
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'
      }}
    >
      {children}
    </div>
  );
}
