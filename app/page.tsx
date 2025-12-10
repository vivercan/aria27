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
    <>
      <style jsx global>{`
        .password-input::-webkit-input-placeholder {
          letter-spacing: 0.15em;
        }
        .password-input::placeholder {
          letter-spacing: 0.15em;
        }
      `}</style>
      
      <div className="relative min-h-screen w-full overflow-hidden">
        
        {/* CAPA 1: Degradado base - oscuro arriba-izquierda, azul brillante abajo-derecha */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #020617 0%, #020617 35%, #0a1628 50%, #0052CC 85%, #0066FF 100%)',
          }}
        />
        
        {/* CAPA 2: Halo radial brillante en zona derecha-baja */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 80% at 75% 70%, rgba(0,102,255,0.5) 0%, rgba(0,82,204,0.3) 30%, transparent 60%)',
          }}
        />
        
        {/* CAPA 3: Segundo halo más intenso y concentrado */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 70% 65%, rgba(37,99,235,0.4) 0%, transparent 40%)',
          }}
        />
        
        {/* CAPA 4: Glow difuso adicional */}
        <div 
          className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(0,102,255,0.35) 0%, transparent 60%)',
            filter: 'blur(60px)',
          }}
        />
        
        {/* CAPA 5: Noise/textura sutil */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Version tag - esquina superior derecha */}
        <div className="absolute top-6 right-8 z-20">
          <p className="text-[10px] text-slate-500 tracking-widest uppercase">
            ARIA v2025.1 · Secure Access
          </p>
        </div>

        {/* Contenedor principal */}
        <div className="relative z-10 min-h-screen w-full flex items-end justify-between px-10 lg:px-16 pb-16 lg:pb-24">
          
          {/* Card de login - izquierda baja */}
          <div className="relative flex-shrink-0">
            <div 
              className="relative overflow-hidden backdrop-blur-2xl rounded-2xl"
              style={{
                background: 'rgba(15,23,42,0.65)',
                border: '1px solid rgba(148,163,184,0.18)',
                boxShadow: '0 30px 80px rgba(15,23,42,0.9), 0 0 1px rgba(148,163,184,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                width: '300px',
              }}
            >
              {/* Barra superior brillante */}
              <div 
                className="h-[2px] w-full"
                style={{
                  background: 'linear-gradient(90deg, #1e40af 0%, #3b82f6 30%, #60a5fa 50%, #3b82f6 70%, #1e40af 100%)',
                }}
              />
              
              {/* Contenido del card */}
              <div style={{ padding: '22px 18px 18px 18px' }}>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Input email */}
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500"
                    style={{ 
                      padding: '8px 12px', 
                      fontSize: '13px',
                      height: '36px',
                      background: 'rgba(15,23,42,0.8)',
                      border: '1px solid rgba(148,163,184,0.12)',
                    }}
                    placeholder="usuario@gcuavante.com"
                  />

                  {/* Input password - bullets mas impactantes */}
                  <input
                    type="password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    className="password-input w-full text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400"
                    style={{ 
                      padding: '8px 12px', 
                      fontSize: '16px',
                      height: '36px',
                      background: 'rgba(15,23,42,0.8)',
                      border: '1px solid rgba(148,163,184,0.12)',
                      letterSpacing: '0.25em',
                      color: 'rgba(255,255,255,0.95)',
                    }}
                    placeholder="••••••••"
                  />

                  {/* Boton premium con gradiente */}
                  <button
                    type="submit"
                    className="w-full text-white font-semibold rounded-xl transition-all duration-200 uppercase tracking-wider hover:-translate-y-[2px] hover:scale-[1.01] active:translate-y-0 active:scale-100"
                    style={{ 
                      padding: '0',
                      height: '36px',
                      fontSize: '13px',
                      background: 'linear-gradient(135deg, #2563EB 0%, #3b82f6 50%, #38BDF8 100%)',
                      borderTop: '1px solid rgba(255,255,255,0.25)',
                      boxShadow: '0 15px 40px rgba(37,99,235,0.45), 0 0 0 1px rgba(59,130,246,0.4)',
                    }}
                  >
                    Entrar
                  </button>
                </form>

                {/* Texto inferior del card con LED verde */}
                <div className="mt-4 text-center">
                  <p className="text-[9px] text-slate-500 tracking-wider uppercase flex items-center justify-center gap-1">
                    <span>Acceso exclusivo · GC Avante · Ambiente</span>
                    <span style={{ color: '#22C55E', fontSize: '8px' }}>●</span>
                    <span style={{ color: '#22C55E' }}>PROD</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ARIA + Infinity Loop - derecha */}
          <div className="hidden md:flex items-center justify-center relative mr-12 lg:mr-20 overflow-visible">
            {/* Simbolo infinito como luz de fondo */}
            <div 
              className="absolute pointer-events-none"
              style={{
                width: '550px',
                height: '330px',
                opacity: 0.12,
              }}
            >
              <svg viewBox="0 0 200 100" className="w-full h-full" style={{ overflow: 'visible' }}>
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <path
                  d="M50,50 C50,20 80,20 100,50 C120,80 150,80 150,50 C150,20 120,20 100,50 C80,80 50,80 50,50"
                  fill="none"
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="1"
                  filter="url(#glow)"
                />
              </svg>
            </div>

            {/* Texto ARIA */}
            <div className="relative flex flex-col items-end" style={{ paddingRight: '20px' }}>
              <h1 
                style={{ 
                  fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
                  fontSize: '200px',
                  fontWeight: 900,
                  letterSpacing: '0.02em',
                  lineHeight: 1,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(180,195,220,0.8) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 15px 40px rgba(0,0,0,0.4))',
                  paddingRight: '10px',
                }}
              >
                ARIA
              </h1>
              
              {/* Tagline con icono infinito */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginTop: '14px',
                  paddingRight: '15px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span 
                  style={{
                    fontSize: '16px',
                    color: 'rgba(255,255,255,0.7)',
                    marginRight: '10px'
                  }}
                >
                  ∞
                </span>
                <p 
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.22em',
                    color: 'rgba(255,255,255,0.7)',
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
    </>
  )
}
