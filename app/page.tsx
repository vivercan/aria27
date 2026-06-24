'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const router = useRouter()

  // Auto-login si hay sesión guardada
  useEffect(() => {
    const autoLogin = async () => {
      const saved = localStorage.getItem('ariaSession')
      if (saved) {
        try {
          const { e, p } = JSON.parse(atob(saved))
          if (e && p) {
            const emailLower = e.toLowerCase()
            // FIX 541.1 25-Jun-2026: auto-login debe crear sesion server-side via /api/mail/validate
            // (antes solo escribia localStorage, causaba loop infinito post FIX 541.1).
            const validateRes = await fetch('/api/mail/validate', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: e, password: p }),
            }).catch(() => null)
            const ok = validateRes?.ok ?? false
            if (!ok) {
              // Sesion guardada YA NO valida en server (password Zoho cambio, rate limit, etc).
              // Limpiar y mostrar login normal — NO redirigir o entramos en loop.
              localStorage.removeItem('ariaSession')
              localStorage.removeItem('userEmail')
              localStorage.removeItem('userRole')
              localStorage.removeItem('userPermissions')
              try { sessionStorage.removeItem('zohoCreds') } catch {}
              setCheckingSession(false)
              return
            }
            localStorage.setItem('userEmail', emailLower)
            try { sessionStorage.setItem('zohoCreds', btoa(JSON.stringify({ e, p }))) } catch {}
            // Precargar role y permisos antes de redirigir
            try {
              const { data: userData } = await supabase
                .from('users')
                .select('role, permissions')
                .eq('email', emailLower)
                .single()
              if (userData) {
                localStorage.setItem('userRole', userData.role || 'user')
                localStorage.setItem('userPermissions', JSON.stringify(userData.permissions || {}))
              }
            } catch { /* fallback: layout.tsx los carga */ }

            router.push('/dashboard/requisiciones')
            return
          }
        } catch { /* sesion corrupta, continuar al login */ }
      }
      setCheckingSession(false)
    }
    autoLogin()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!email.trim() || !pass) {
      setError('Ingresa email y contraseña')
      return
    }
    
    setLoading(true)
    const emailLower = email.trim().toLowerCase()

    // PASO 1: Verificar usuario en Supabase
    let userExists = false
    try {
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', emailLower)
        .limit(1)
      if (userError) throw userError
      userExists = Array.isArray(users) && users.length > 0
    } catch {
      setError('Error de conexión')
      setLoading(false)
      return
    }

    if (!userExists) {
      setError('Usuario no registrado en ARIA')
      setLoading(false)
      return
    }

    // PASO 2: VALIDAR CONTRASEÑA CONTRA ZOHO - OBLIGATORIO
    let isPasswordValid = false
    try {
      const validateRes = await fetch('/api/mail/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: pass })
      })
      
      if (validateRes.ok) {
        const data = await validateRes.json().catch(() => ({}))
        isPasswordValid = data.valid === true
        if (!isPasswordValid && data.error) {
          setError(data.error)
          setLoading(false)
          return
        }
      }
    } catch {
      // Si hay error de red, NO permitir entrada
      setError('Error validando credenciales')
      setLoading(false)
      return
    }

    // SI LA CONTRASEÑA NO ES VÁLIDA = NO ENTRA
    if (!isPasswordValid) {
      setError('Contraseña incorrecta')
      setLoading(false)
      return
    }

    // PASO 3: Login exitoso — cargar role y permisos ANTES de redirigir
    localStorage.setItem('userEmail', emailLower)
    sessionStorage.setItem('zohoCreds', btoa(JSON.stringify({ e: email.trim(), p: pass })))
    if (rememberMe) {
      localStorage.setItem('ariaSession', btoa(JSON.stringify({ e: email.trim(), p: pass })))
    } else {
      localStorage.removeItem('ariaSession')
    }

    // FIX: Precargar role y permisos para que AccessGuard los encuentre al montar
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('role, permissions')
        .eq('email', emailLower)
        .single()
      if (userData) {
        localStorage.setItem('userRole', userData.role || 'user')
        localStorage.setItem('userPermissions', JSON.stringify(userData.permissions || {}))
      }
    } catch { /* si falla, layout.tsx los cargará como fallback */ }

    router.push('/dashboard/requisiciones')
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: '#020617' }}>
        <svg className="animate-spin h-6 w-6 text-aria-primary" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* 18-Abr-2026 PM: login background — eliminado azul eléctrico #0066FF, paleta slate corporate */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #020617 0%, #020617 40%, #0a1628 70%, #2e4a6b 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 80% at 75% 70%, rgba(78,107,135,0.42) 0%, rgba(61,85,108,0.22) 30%, transparent 60%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 70% 65%, rgba(78,107,135,0.35) 0%, transparent 40%)' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(78,107,135,0.30) 0%, transparent 60%)', filter: 'blur(60px)' }} />

      <div className="absolute top-6 right-8 z-20">
        <p className="text-[10px] text-[#4a6080] tracking-widest uppercase">ARIA v2026.1 · Secure Access</p>
      </div>

      <div className="relative z-10 min-h-screen w-full flex items-end justify-between px-10 lg:px-16 pb-16 lg:pb-24">
        <div className="relative flex-shrink-0">
          <div className="relative overflow-hidden backdrop-blur-2xl rounded-2xl" style={{ background: 'rgba(15,23,42,0.65)', border: '1px solid rgba(148,163,184,0.18)', boxShadow: '0 30px 80px rgba(15,23,42,0.9)', width: '300px' }}>
            {/* 18-Abr-2026 PM: barra decorativa — slate sólido sin azul brillante */}
            <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, #4e6b87 0%, #7a95ae 50%, #4e6b87 100%)' }} />
            
            <div style={{ padding: '22px 18px 18px 18px' }}>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  disabled={loading}
                  required
                  className="w-full text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-aria-primary/50 placeholder:text-[#4a6080] disabled:opacity-50"
                  style={{ padding: '8px 12px', fontSize: '13px', height: '36px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(148,163,184,0.12)' }}
                  placeholder="usuario@gcuavante.com"
                />

                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={pass}
                    onChange={(e) => { setPass(e.target.value); setError(''); }}
                    disabled={loading}
                    required
                    className="w-full text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-aria-primary/50 placeholder:text-[#7f93b0] disabled:opacity-50"
                    style={{ padding: '8px 40px 8px 12px', fontSize: showPass ? '13px' : '16px', height: '36px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(148,163,184,0.12)', letterSpacing: showPass ? 'normal' : '0.25em' }}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    tabIndex={-1}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: '#ffffff', display: 'flex', alignItems: 'center' }}
                  >
                    {showPass ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
                  </button>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none" style={{ marginTop: '-2px' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-white/[0.07] bg-[#0c1d38] text-aria-primary focus:ring-aria-primary/30 focus:ring-offset-0 cursor-pointer"
                    style={{ accentColor: '#64748b' }}
                  />
                  <span className="text-[11px] text-[#4a6080]">Mantener sesión iniciada</span>
                </label>

                {error && (
                  <div className="text-red-400 text-xs text-center py-2 bg-red-500/10 rounded border border-red-500/20">
                    ⚠️ {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white font-semibold rounded-xl uppercase tracking-wider disabled:opacity-70"
                  /* 18-Abr-2026 PM: botón login — glow eléctrico eliminado, slate sólido */
                  style={{ height: '36px', fontSize: '13px', background: 'linear-gradient(135deg, #4e6b87 0%, #5a7a99 50%, #4e6b87 100%)', boxShadow: '0 10px 30px rgba(15,23,42,0.50)' }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Validando...
                    </span>
                  ) : 'Entrar'}
                </button>
              </form>

              <div className="mt-3 text-center">
                <p className="text-[8px] text-[#4a6080]">Contraseña de Zoho Mail o App Password</p>
              </div>

              <div className="mt-3 text-center">
                <p className="text-[9px] text-[#4a6080] tracking-wider uppercase flex items-center justify-center gap-1">
                  <span>Acceso exclusivo · GCUAVANTE</span>
                  <span style={{ color: '#22C55E', fontSize: '8px' }}>●</span>
                  <span style={{ color: '#22C55E' }}>PROD</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center justify-center relative mr-12 lg:mr-20">
          <div className="relative flex flex-col items-end" style={{ paddingRight: '20px' }}>
            <h1 style={{ fontFamily: '"Arial Black", sans-serif', fontSize: '200px', fontWeight: 900, lineHeight: 1, background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(180,195,220,0.8) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 15px 40px rgba(0,0,0,0.4))' }}>ARIA</h1>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '14px' }}>
              <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', marginRight: '10px' }}>∞</span>
              <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Infinity Loop · Operations OS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
