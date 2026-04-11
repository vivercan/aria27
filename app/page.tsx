'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
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
            localStorage.setItem('userEmail', emailLower)
            sessionStorage.setItem('zohoCreds', btoa(JSON.stringify({ e, p })))

            // FIX: Precargar role y permisos antes de redirigir
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
        } catch { /* sesión corrupta, continuar al login */ }
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
        const data = await validateRes.json()
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
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #020617 0%, #020617 35%, #0a1628 50%, #0052CC 85%, #0066FF 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 80% at 75% 70%, rgba(0,102,255,0.5) 0%, rgba(0,82,204,0.3) 30%, transparent 60%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 70% 65%, rgba(37,99,235,0.4) 0%, transparent 40%)' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,102,255,0.35) 0%, transparent 60%)', filter: 'blur(60px)' }} />

      <div className="absolute top-6 right-8 z-20">
        <p className="text-[10px] text-slate-500 tracking-widest uppercase">ARIA v2026.1 · Secure Access</p>
      </div>

      <div className="relative z-10 min-h-screen w-full flex items-end justify-between px-10 lg:px-16 pb-16 lg:pb-24">
        <div className="relative flex-shrink-0">
          <div className="relative overflow-hidden backdrop-blur-2xl rounded-2xl" style={{ background: 'rgba(15,23,42,0.65)', border: '1px solid rgba(148,163,184,0.18)', boxShadow: '0 30px 80px rgba(15,23,42,0.9)', width: '300px' }}>
            <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, #1e40af 0%, #3b82f6 30%, #60a5fa 50%, #3b82f6 70%, #1e40af 100%)' }} />
            
            <div style={{ padding: '22px 18px 18px 18px' }}>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  disabled={loading}
                  required
                  className="w-full text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-aria-primary/50 placeholder:text-slate-500 disabled:opacity-50"
                  style={{ padding: '8px 12px', fontSize: '13px', height: '36px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(148,163,184,0.12)' }}
                  placeholder="usuario@gcuavante.com"
                />

                <input
                  type="password"
                  value={pass}
                  onChange={(e) => { setPass(e.target.value); setError(''); }}
                  disabled={loading}
                  required
                  className="w-full text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-aria-primary/50 placeholder:text-slate-400 disabled:opacity-50"
                  style={{ padding: '8px 12px', fontSize: '16px', height: '36px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(148,163,184,0.12)', letterSpacing: '0.25em' }}
                  placeholder="••••••••"
                />

                <label className="flex items-center gap-2 cursor-pointer select-none" style={{ marginTop: '-2px' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-aria-primary focus:ring-aria-primary/30 focus:ring-offset-0 cursor-pointer"
                    style={{ accentColor: '#3b82f6' }}
                  />
                  <span className="text-[11px] text-slate-500">Mantener sesión iniciada</span>
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
                  style={{ height: '36px', fontSize: '13px', background: 'linear-gradient(135deg, #2563EB 0%, #3b82f6 50%, #38BDF8 100%)', boxShadow: '0 15px 40px rgba(37,99,235,0.45)' }}
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
                <p className="text-[8px] text-slate-500">Contraseña de Zoho Mail o App Password</p>
              </div>

              <div className="mt-3 text-center">
                <p className="text-[9px] text-slate-500 tracking-wider uppercase flex items-center justify-center gap-1">
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
