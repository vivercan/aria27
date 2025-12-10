'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const router = useRouter()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim() === 'recursos.humanos@gcuavante.com' && pass.trim() === 'cVfo1fk@') {
      router.push('/dashboard/supply-desk')
    } else {
      alert('Credenciales incorrectas. Verifica mayusculas y espacios.')
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-between px-10 lg:px-32 overflow-hidden bg-[#0f172a]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0044AA] via-[#001133] to-black opacity-90" />
      <div className="absolute top-[-20%] right-[-20%] w-[1000px] h-[1000px] bg-blue-500/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-20%] left-[-20%] w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px] -z-10" />
      
      {/* Imagen infinito grande de fondo - 500px, 10% opacidad (90% transparencia), bajado 50px */}
      <div 
        className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none"
        style={{ paddingTop: '50px' }}
      >
        <div style={{ opacity: 0.1, width: '500px', height: '500px' }}>
          <Image
            src="/infinito.png"
            alt=""
            width={500}
            height={500}
            priority
          />
        </div>
      </div>

      {/* Card de login - mas compacto */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10"
        style={{ width: '300px' }}
      >
        <div 
          className="backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '14px' }}
        >
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-black/40 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/40"
              style={{ padding: '8px 14px', fontSize: '15px', width: '100%' }}
              placeholder="usuario@gcuavante.com"
            />

            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="bg-black/40 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/40"
              style={{ padding: '8px 14px', fontSize: '15px', width: '100%' }}
              placeholder="********"
            />

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/40 active:scale-95 tracking-tighter"
              style={{ padding: '8px', fontSize: '18px', width: '100%' }}
            >
              Entrar
            </button>
          </form>
        </div>
      </motion.div>

      {/* ARIA + Infinity Loop */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative z-10 hidden md:flex items-center justify-center"
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <h1 
            style={{ 
              fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
              fontSize: '250px',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: 'rgba(255,255,255,0.9)',
              textShadow: '0 25px 50px rgba(0,0,0,0.5)'
            }}
          >
            ARIA
          </h1>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginTop: '16px',
              paddingRight: '9px'
            }}
          >
            <div style={{ opacity: 0.85, marginRight: '6px', width: '16px', height: '16px' }}>
              <Image
                src="/infinito.png"
                alt=""
                width={16}
                height={16}
              />
            </div>
            <p 
              style={{
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.3em',
                color: 'rgba(255,255,255,0.85)',
                textTransform: 'uppercase'
              }}
            >
              Infinity Loop
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
