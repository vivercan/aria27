"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Credenciales válidas
    const validUsers: Record<string, string> = {
      "recursos.humanos@gcuavante.com": "cVfo1fk@",
      "vivercan@yahoo.com": "test123",
      "juanviverosv@gmail.com": "test123",
      "timonfx@hotmail.com": "test123",
    };

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = pass.trim();

    if (validUsers[trimmedEmail] === trimmedPass) {
      // Guardar email en localStorage para el Topbar
      localStorage.setItem("userEmail", trimmedEmail);
      router.push("/dashboard");
    } else {
      alert("Credenciales incorrectas");
    }
    setLoading(false);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse 80% 70% at 85% 90%, #0B57D0 0%, #003DA5 45%, #021024 100%)'
      }}
    >
      <div className="w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 
            className="text-6xl font-black tracking-tight mb-2"
            style={{
              background: 'linear-gradient(135deg, #38BDF8 0%, #2563EB 50%, #1E40AF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            ARIA
          </h1>
          <p className="text-slate-400 text-sm">Enterprise Resource Planning</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              placeholder="tu@correo.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="text-center text-slate-500 text-xs mt-8">
          ARIA27 ERP © 2024 Grupo Constructor Avante
        </p>
      </div>
    </div>
  );
}
