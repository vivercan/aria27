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
      
      {/* Imagen infinito de fondo */}
      <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
        <Image
          src="/infinito.png"
          alt=""
          width={150}
          height={150}
          className="opacity-50"
          priority
        />
      </div>

      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 p-6 rounded-2xl shadow-2xl">
          <div className="mb-5">
            <h1 className="text-xl font-bold text-white tracking-tighter">
              Iniciar Sesion
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/40 text-base"
                placeholder="usuario@gcuavante.com"
              />
            </div>

            <div>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="w-full bg-black/40 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/40 text-base"
                placeholder="********"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/40 active:scale-95 text-xl tracking-tighter"
            >
              Entrar
            </button>
          </form>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative z-10 hidden md:flex items-center justify-center"
      >
        <div className="flex flex-col items-end">
          <h1 
            className="text-white drop-shadow-2xl"
            style={{ 
              fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
              fontSize: '250px',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              opacity: 0.9
            }}
          >
            ARIA
          </h1>
          <p 
            className="mt-4 uppercase"
            style={{
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.3em',
              color: 'rgba(255,255,255,0.85)',
              paddingRight: '5px'
            }}
          >
            Infinity Loop
          </p>
        </div>
      </motion.div>
    </div>
  )
}
