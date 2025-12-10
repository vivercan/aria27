"use client";

import { ReactNode } from "react";

interface ModuleGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}

export function ModuleGrid({ children, columns = 2 }: ModuleGridProps) {
  return (
    <div 
      className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-7 lg:max-w-[1200px]"
      style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 580px))'
      }}
    >
      {children}
    </div>
  );
}
