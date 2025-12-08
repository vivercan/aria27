'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const router = useRouter()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Validación exacta
    if (email === 'recursos.humanos@gcuavante.com' && pass === 'cVfo1fk@') {
      router.push('/dashboard/supply-desk')
    } else {
      alert('Credenciales incorrectas. Verifica mayúsculas y espacios.')
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-start overflow-hidden bg-[#0f172a]">
      {/* Fondo Gradiente Estilo Ubuntu Deep Blue */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0044AA] via-[#001133] to-black opacity-90" />
      
      {/* Efectos de luz volumétrica */}
      <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-blue-500/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 ml-10 md:ml-24 w-full max-w-md"
      >
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 p-8 rounded-3xl shadow-2xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white tracking-tighter mb-1">
              ARIA<span className="text-blue-400">27</span>
            </h1>
            <p className="text-blue-200/70 text-sm">Sistema de Gestión Integral</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-blue-300 uppercase tracking-wider ml-1">Usuario Zoho</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/20"
                placeholder="usuario@gcuavante.com"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-blue-300 uppercase tracking-wider ml-1">Contraseña</label>
              <input 
                type="password" 
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="w-full bg-black/40 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/20"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/40 mt-4 active:scale-95"
            >
              Entrar al Sistema
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-white/30">
            <span>SECURE SERVER</span>
            <div className="w-1 h-1 bg-green-500 rounded-full"></div>
            <span>ZOHO LINKED</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
