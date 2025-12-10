'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Fondo con degradado */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #020817 0%, #03101F 30%, #0a1628 50%, #0047FF 100%)',
        }}
      />
      
      {/* Textura noise sutil */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Halo de luz central */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0,71,255,0.15) 0%, rgba(0,71,255,0.05) 40%, transparent 70%)',
        }}
      />

      {/* Efectos de luz adicionales */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Version tag - esquina superior derecha */}
      <div className="absolute top-6 right-8 z-20">
        <p className="text-[10px] text-slate-500 tracking-widest uppercase">
          ARIA v2025.1 · Secure Access
        </p>
      </div>

      {/* Contenedor principal */}
      <div className="relative z-10 min-h-screen w-full flex items-end justify-between px-10 lg:px-16 pb-16 lg:pb-24">
        
        {/* Card de login - izquierda baja */}
        <div className="relative">
          <div 
            className="relative overflow-hidden backdrop-blur-xl rounded-2xl"
            style={{
              background: 'rgba(15,23,42,0.85)',
              border: '1px solid rgba(148,163,184,0.2)',
              boxShadow: '0 30px 80px rgba(15,23,42,0.9), 0 0 1px rgba(148,163,184,0.3)',
              width: '320px',
              padding: '0'
            }}
          >
            {/* Barra superior brillante */}
            <div 
              className="h-[3px] w-full"
              style={{
                background: 'linear-gradient(90deg, #1e40af 0%, #3b82f6 30%, #60a5fa 50%, #3b82f6 70%, #1e40af 100%)',
              }}
            />
            
            {/* Contenido del card */}
            <div style={{ padding: '20px' }}>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500"
                  style={{ 
                    padding: '10px 14px', 
                    fontSize: '14px',
                    background: 'rgba(15,23,42,0.9)',
                    border: '1px solid rgba(148,163,184,0.15)',
                  }}
                  placeholder="usuario@gcuavante.com"
                />

                <input
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="w-full text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500"
                  style={{ 
                    padding: '10px 14px', 
                    fontSize: '14px',
                    background: 'rgba(15,23,42,0.9)',
                    border: '1px solid rgba(148,163,184,0.15)',
                  }}
                  placeholder="********"
                />

                {/* Boton premium con gradiente */}
                <button
                  type="submit"
                  className="w-full text-white font-semibold rounded-xl transition-all duration-200 uppercase tracking-wider hover:translate-y-[-1px] hover:scale-[1.01] active:translate-y-0 active:scale-100"
                  style={{ 
                    padding: '12px',
                    fontSize: '14px',
                    background: 'linear-gradient(135deg, #2563EB 0%, #3b82f6 50%, #38BDF8 100%)',
                    borderTop: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 15px 40px rgba(37,99,235,0.4), 0 0 0 1px rgba(59,130,246,0.5)',
                  }}
                >
                  Entrar
                </button>
              </form>

              {/* Texto inferior del card */}
              <div className="mt-4 text-center">
                <p className="text-[10px] text-slate-500 tracking-wider uppercase">
                  Acceso exclusivo · GC Avante · Ambiente PROD
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ARIA + Infinity Loop - derecha */}
        <div className="hidden md:flex items-center justify-center relative mr-8 lg:mr-16">
          {/* Simbolo infinito como luz de fondo */}
          <div 
            className="absolute pointer-events-none"
            style={{
              width: '500px',
              height: '300px',
              opacity: 0.1,
            }}
          >
            <svg viewBox="0 0 200 100" className="w-full h-full">
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <path
                d="M50,50 C50,20 80,20 100,50 C120,80 150,80 150,50 C150,20 120,20 100,50 C80,80 50,80 50,50"
                fill="none"
                stroke="rgba(255,255,255,0.8)"
                strokeWidth="1.5"
                filter="url(#glow)"
              />
            </svg>
          </div>

          {/* Texto ARIA */}
          <div className="relative flex flex-col items-end">
            <h1 
              style={{ 
                fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
                fontSize: '220px',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(200,210,230,0.85) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 20px 60px rgba(0,0,0,0.5)',
                filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))'
              }}
            >
              ARIA
            </h1>
            
            {/* Tagline con icono infinito */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginTop: '12px',
                paddingRight: '5px'
              }}
            >
              <span 
                style={{
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.6)',
                  marginRight: '8px'
                }}
              >
                ∞
              </span>
              <p 
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.25em',
                  color: 'rgba(255,255,255,0.6)',
                  textTransform: 'uppercase'
                }}
              >
                Infinity Loop · Operations OS
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
