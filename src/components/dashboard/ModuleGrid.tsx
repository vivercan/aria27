"use client";

import { ReactNode } from "react";

interface ModuleGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}

export function ModuleGrid({ children, columns = 2 }: ModuleGridProps) {
  // Grid compacto: 2 columnas con max-width por card
  // En pantallas grandes: cards de max 540px con gap visible
  // En pantallas pequeñas: 1 columna
  
  return (
    <div className="
      grid 
      grid-cols-1 
      lg:grid-cols-2 
      gap-x-8 
      gap-y-6
      lg:max-w-[1120px]
    " style={{
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 540px))'
    }}>
      {children}
    </div>
  );
}
