"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface SubModuleCardProps {
  title: string;
  description: string; // Esto actuará como Tooltip visual
  icon: LucideIcon;
  href: string;
}

export function SubModuleCard({ title, description, icon: Icon, href }: SubModuleCardProps) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
        whileTap={{ scale: 0.98 }}
        className="group relative flex flex-col items-center justify-center p-6 h-48 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg cursor-pointer transition-all overflow-hidden"
      >
        {/* Fondo con brillo al hacer hover */}
        <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Icono */}
        <div className="mb-4 p-4 rounded-full bg-blue-500/20 text-blue-300 group-hover:text-white group-hover:bg-blue-500 transition-colors">
          <Icon size={32} strokeWidth={1.5} />
        </div>

        {/* Título */}
        <h3 className="text-lg font-medium text-slate-100 group-hover:text-white tracking-wide">
          {title}
        </h3>

        {/* "Tooltip" Integrado: Aparece sutilmente abajo o se hace visible */}
        <p className="mt-2 text-xs text-center text-slate-400 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 absolute bottom-4 px-4">
          {description}
        </p>
      </motion.div>
    </Link>
  );
}
