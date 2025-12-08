'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MotionConfig, motion } from 'framer-motion'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const router = useRouter()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Hardcoded Validation
    if (email === 'recursos.humanos@gcuavante.com' && pass === 'cVfo1fk@') {
      router.push('/dashboard/supply-desk')
    } else {
      alert('Credenciales incorrectas (Zoho Auth Failed)')
    }
  }

  return (
    <div className="flex items-center justify-start h-screen px-20 relative overflow-hidden">
      {/* Background visual effects */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-[400px] bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl"
      >
        <h1 className="text-3xl font-bold mb-2 text-white tracking-tight">ARIA 27</h1>
        <p className="text-blue-200/60 mb-8 text-sm">Zoho Secure Gateway</p>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs text-blue-200/80 mb-1 uppercase tracking-wider">Usuario Zoho</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all"
              placeholder="usuario@gcuavante.com"
            />
          </div>
          <div>
            <label className="block text-xs text-blue-200/80 mb-1 uppercase tracking-wider">Password</label>
            <input 
              type="password" 
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-900/20 transition-all transform active:scale-95"
          >
            Entrar al Sistema
          </button>
        </form>
      </motion.div>
    </div>
  )
}
