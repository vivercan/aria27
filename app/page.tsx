'use client'
import { useState, useEffect, useRef } from 'react'
import { landingPath, isMobileDevice } from '@/lib/device'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, ScanFace, Fingerprint } from 'lucide-react'
import { huellaDisponible, huellaActivada, activarHuella, entrarConHuella } from '@/lib/huella-client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  // 11-Oct-2026: en teléfono el login ya es claro (mismo estilo que Doménica) → al entrar no hay cambios bruscos
  const [tel, setTel] = useState(false)
  // 11-Oct-2026: entrar con huella o rostro (passkeys) en lugar de guardar la contraseña
  const [hDisp, setHDisp] = useState(false)
  const [hAct, setHAct] = useState(false)
  const [ofrecer, setOfrecer] = useState(false)
  const [aviso, setAviso] = useState('')
  const [verOlvido, setVerOlvido] = useState(false)
  useEffect(() => { huellaDisponible().then(d => { setHDisp(d); setHAct(d && huellaActivada()) }) }, [])
  useEffect(() => { try { const m = isMobileDevice(); setTel(m); if (m) { localStorage.setItem('aria:modo', 'campo'); setRememberMe(true) } } catch { /* */ } }, [])
  const router = useRouter()

  // HOTFIX4 25-Jun-2026: flujo determinista anti-loop
  //   1. useRef hasCheckedRef evita doble ejecucion (StrictMode dev / re-render)
  //   2. PRIMERO /api/auth/me — si 200 → router.replace al dashboard (cookie ya valida)
  //   3. Si 401 y existe ariaSession legacy → UNA SOLA llamada a /api/mail/validate
  //   4. Si validate OK → replace al dashboard. Si NO → limpiar ariaSession + mostrar login
  //   5. router.replace en lugar de push (NO duplica history, NO causa ping-pong)
  const hasCheckedRef = useRef(false)
  useEffect(() => {
    if (hasCheckedRef.current) return
    hasCheckedRef.current = true
    let cancelled = false
    const cleanLegacy = () => {
      try {
        localStorage.removeItem('ariaSession')
        localStorage.removeItem('userEmail')
        localStorage.removeItem('userRole')
        localStorage.removeItem('userPermissions')
        sessionStorage.removeItem('zohoCreds')
      } catch { /* ignore */ }
    }
    const run = async () => {
      // PASO A: probar /api/auth/me — si cookie viva, ya tenemos sesion
      let meStatus = 0
      try {
        const meRes = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
        meStatus = meRes.status
        if (meStatus === 200) {
          if (cancelled) return
          router.replace(landingPath())
          return
        }
      } catch { /* network falla, seguir al paso B */ }

      // PASO B: si 401 y hay ariaSession legacy, intentar validar UNA vez
      const saved = (() => { try { return localStorage.getItem('ariaSession') } catch { return null } })()
      if (meStatus !== 401 || !saved) {
        if (cancelled) return
        setCheckingSession(false)
        return
      }
      let creds: { e: string; p: string } | null = null
      try {
        const parsed = JSON.parse(atob(saved))
        if (parsed?.e && parsed?.p) creds = { e: parsed.e, p: parsed.p }
      } catch { /* corrupta */ }
      if (!creds) {
        cleanLegacy()
        if (cancelled) return
        setCheckingSession(false)
        return
      }
      let validateOk = false
      try {
        const v = await fetch('/api/mail/validate', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: creds.e, password: creds.p, recordar: true }),
          cache: 'no-store',
        })
        validateOk = v.ok
      } catch { /* network fail */ }
      if (!validateOk) {
        cleanLegacy()
        if (cancelled) return
        setCheckingSession(false)
        return
      }
      // Validate OK -> hidratar cache UI minimo y redirigir
      // 11-Oct-2026: ya no se guarda la contraseña en el teléfono (sesión de 30 días + huella/rostro)
      try { localStorage.removeItem('ariaSession') } catch {}
      try { localStorage.setItem('userEmail', creds.e.toLowerCase()) } catch {}
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('role, permissions')
          .eq('email', creds.e.toLowerCase())
          .single()
        if (userData) {
          try { localStorage.setItem('userRole', userData.role || 'user') } catch {}
          try { localStorage.setItem('userPermissions', JSON.stringify(userData.permissions || {})) } catch {}
        }
      } catch { /* layout.tsx fallback */ }
      if (cancelled) return
      router.replace(landingPath())
    }
    run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!email.trim() || !pass) {
      setError('Escribe tu correo o usuario y tu contraseña')
      return
    }
    
    setLoading(true)
    // 11-Oct-2026: se puede entrar solo con el usuario (sin @) → se completa con el dominio de la empresa
    const emailFull = email.trim().includes('@') ? email.trim() : `${email.trim()}@gcuavante.com`
    const emailLower = emailFull.toLowerCase()

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
        body: JSON.stringify({ email: emailFull, password: pass, recordar: rememberMe })
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
    sessionStorage.setItem('zohoCreds', btoa(JSON.stringify({ e: emailFull, p: pass })))
    // 11-Oct-2026: la contraseña ya NO se guarda en el teléfono; "Mantener sesión" = sesión de 30 días en el servidor
    localStorage.removeItem('ariaSession')

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

    // Ofrecer huella/rostro la primera vez en este teléfono
    if (hDisp && !huellaActivada()) { setLoading(false); setOfrecer(true); return }
    router.push(landingPath())
  }

  const conHuella = async () => {
    setError(''); setLoading(true)
    try {
      const r = await entrarConHuella()
      try { localStorage.setItem('userEmail', r.email); localStorage.setItem('userRole', r.role || 'user'); localStorage.setItem('userPermissions', JSON.stringify(r.permissions || {})) } catch {}
      router.replace(landingPath())
    } catch (e) { setError((e as Error).message === 'Se canceló' ? '' : (e as Error).message); setLoading(false); setHAct(huellaActivada()) }
  }
  const activar = async () => {
    setError(''); setLoading(true)
    try { await activarHuella(); router.push(landingPath()) }
    catch (e) { setLoading(false); if ((e as Error).message !== 'Se canceló') setError((e as Error).message); else router.push(landingPath()) }
  }

  if (checkingSession) {
    return (
      <div className="login-espera min-h-screen w-full flex items-center justify-center" style={{ background: '#020617' }}>
        <svg className="animate-spin h-6 w-6 text-aria-primary" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  // 11-Oct-2026 · Login de teléfono "Termina el día sin pendientes" (propuesta 12 elegida por JJ).
  // Correo/usuario + contraseña y huella/rostro siempre visibles. Verde #2aa300 = 3.3:1 con letra blanca
  // de 19px en negrita (texto grande, WCAG AA); el #3cde01 con blanco daba 1.8:1.
  const tocarHuella = () => {
    setError(''); setAviso('')
    if (hAct) { conHuella(); return }
    setAviso(hDisp ? 'Entra una vez con tu correo y te ofrecemos activar tu huella o rostro en este teléfono.' : 'Este teléfono no permite entrar con huella o rostro. Usa tu correo o usuario.')
  }
  if (tel) return (
    <div className="relative min-h-[100dvh] w-full flex flex-col text-white overflow-hidden" style={{ fontFamily: 'var(--font-dom), system-ui, sans-serif', background: '#1c3267' }}>
      <div aria-hidden="true" className="absolute inset-0 bg-cover bg-no-repeat" style={{ backgroundImage: 'url(/login/noche.webp)', backgroundPosition: 'center 30%' }} />
      <div className="relative z-10 flex-1 flex flex-col w-full max-w-md mx-auto px-3" style={{ paddingTop: 'max(env(safe-area-inset-top), 18px)', paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
        <div className="pt-7 flex flex-col items-center text-center">
          <div className="flex items-baseline" role="img" aria-label="Doménica 27"><span className="text-[40px] font-extrabold italic tracking-[-0.04em] leading-none pr-0.5">Doménica</span><span className="ml-2 text-[40px] font-extrabold tracking-[-0.03em] leading-none text-[#fdab3d]">27</span></div>
          <div className="mt-2.5 flex flex-col items-center gap-1">
            <div className="flex items-baseline gap-1.5"><span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#c3d3ea]">by</span><span className="text-[19px] font-black tracking-[-0.04em] text-[#2563EB]">ARIA</span><span className="-ml-1.5 text-[19px] font-black tracking-[-0.04em] text-white">27</span></div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.22em] uppercase text-[#c3d3ea]"><svg width="18" height="9" viewBox="0 0 36 18" aria-hidden="true"><path d="M9 3c3.5 0 6 3 9 6s5.5 6 9 6a6 6 0 0 0 0-12c-3.5 0-6 3-9 6s-5.5 6-9 6A6 6 0 0 1 9 3Z" fill="none" stroke="#8ec2ff" strokeWidth="3" /></svg>Infinity Loop</div>
          </div>
          <h1 className="mt-9 text-[34px] font-extrabold leading-[1.06] tracking-[-0.035em]">Termina el día<br />sin pendientes.</h1>
        </div>
        <div className="flex-1 min-h-6" />
        {ofrecer ? (
          <div className="rounded-[28px] bg-[#0b1830] border border-[#22406e] p-6 text-center">
            <span className="mx-auto w-16 h-16 rounded-2xl bg-[#2aa300] flex items-center justify-center"><Fingerprint size={34} color="#fff" strokeWidth={2} /></span>
            <h2 className="mt-4 text-[20px] font-bold">¿La próxima vez entras con tu huella o tu rostro?</h2>
            <p className="mt-1.5 text-[14px] text-[#c3d3ea]">Sin escribir la contraseña. Tu huella no sale del teléfono.</p>
            {error && <div role="alert" className="mt-3 rounded-xl bg-[#d0304a] px-3 py-2.5 text-[14px] font-semibold text-white">{error}</div>}
            <button type="button" onClick={activar} disabled={loading} className="mt-5 w-full h-14 rounded-[18px] bg-[#2aa300] text-white text-[19px] font-bold disabled:opacity-70">{loading ? 'Un momento…' : 'Sí, activarlo'}</button>
            <button type="button" onClick={() => router.push(landingPath())} className="mt-2 w-full py-3 text-[15px] font-semibold text-[#c3d3ea]">Ahora no</button>
          </div>
        ) : (
          <div className="rounded-[28px] bg-[#0b1830] border border-[#22406e] p-5">
            <button type="button" onClick={tocarHuella} disabled={loading} className="w-full h-14 flex items-center justify-center gap-3 rounded-[18px] bg-[#2aa300] active:bg-[#239000] text-white text-[19px] font-bold disabled:opacity-70">
              <Fingerprint size={26} strokeWidth={2.2} className="shrink-0" /><span className="whitespace-nowrap">{loading && hAct && !pass ? 'Verificando…' : <><span className="max-[359px]:hidden">Entrar con huella o rostro</span><span className="min-[360px]:hidden">Huella o rostro</span></>}</span></button>
            {aviso && <div role="status" className="mt-3 rounded-xl bg-[#13284a] px-3 py-2.5 text-[14px] text-[#dbe7f7]">{aviso}</div>}
            <div className="flex items-center gap-3 my-3.5"><i className="flex-1 h-px bg-[#22406e]" /><span className="text-[12.5px] text-[#9cb3d6]">o con tu correo o usuario</span><i className="flex-1 h-px bg-[#22406e]" /></div>
            <form onSubmit={handleLogin} className="space-y-2.5">
              <input type="text" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" aria-label="Correo o usuario" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} disabled={loading} required placeholder="Correo o usuario"
                className="w-full h-12 rounded-[15px] border-[1.5px] border-[#22406e] bg-[#13284a] px-4 text-[16px] text-white placeholder:text-[#7f97bd] outline-none focus:border-[#6fb2ff]" />
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} autoComplete="current-password" aria-label="Contraseña" value={pass} onChange={(e) => { setPass(e.target.value); setError('') }} disabled={loading} required placeholder="Contraseña"
                  className="w-full h-12 rounded-[15px] border-[1.5px] border-[#22406e] bg-[#13284a] pl-4 pr-12 text-[16px] text-white placeholder:text-[#7f97bd] outline-none focus:border-[#6fb2ff]" />
                <button type="button" onClick={() => setShowPass(v => !v)} aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[#9cb3d6]">{showPass ? <EyeOff size={20} /> : <Eye size={20} />}</button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 py-1.5 select-none"><input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-5 h-5" style={{ accentColor: '#0073ea' }} /><span className="text-[13.5px] max-[359px]:text-[12.5px] text-[#c3d3ea]">Recordarme</span></label>
                <button type="button" onClick={() => setVerOlvido(v => !v)} className="py-1.5 text-[13.5px] max-[359px]:text-[12.5px] whitespace-nowrap font-semibold text-[#8ec2ff]">¿Olvidaste tu contraseña?</button>
              </div>
              {verOlvido && <div className="rounded-xl bg-[#13284a] px-3 py-2.5 text-[13.5px] text-[#dbe7f7]">Tu contraseña es la de tu correo de trabajo. Pide a tu administrador que la restablezca.</div>}
              {error && <div role="alert" className="rounded-xl bg-[#d0304a] px-3 py-2.5 text-[14px] font-semibold text-white">{error}</div>}
              <button type="submit" disabled={loading} className={`w-full h-12 rounded-[15px] text-[16px] font-bold disabled:opacity-70 ${email && pass ? 'bg-[#0073ea] text-white' : 'border-[1.5px] border-[#3a5c8f] text-white'}`}>{loading && pass ? 'Entrando…' : 'Entrar'}</button>
            </form>
            <a href="https://104.248.119.60.nip.io/checador.html" target="_blank" rel="noopener noreferrer" className="mt-2 min-h-11 flex items-center justify-center gap-2 whitespace-nowrap text-[13.5px] max-[359px]:text-[12px] text-[#c3d3ea]">
              <ScanFace size={18} strokeWidth={2.2} color="#8ec2ff" />¿Solo checar asistencia? <b className="font-bold text-[#8ec2ff]">Abrir checador</b></a>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* 18-Abr-2026 PM: login background — eliminado azul eléctrico #0066FF, paleta slate corporate */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1f6be3 0%, #0d47b0 28%, #072a63 55%, #051633 78%, #040b17 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 80% at 75% 70%, rgba(78,107,135,0.26) 0%, rgba(61,85,108,0.13) 30%, transparent 62%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 70% 65%, rgba(78,107,135,0.20) 0%, transparent 42%)' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(78,107,135,0.18) 0%, transparent 60%)', filter: 'blur(60px)' }} />

      <div className="absolute top-6 right-8 z-20">
        <p className="text-[10px] text-[#4a6080] tracking-widest uppercase">ARIA v2026.1 · Secure Access</p>
      </div>

      {/* ARIA27 FaceID — checado por reconocimiento facial (rama independiente, NO entra al sistema) */}
      <a
        href="https://104.248.119.60.nip.io/checador.html"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-6 left-8 z-20 flex items-center gap-2.5 rounded-full transition-all hover:brightness-95 hover:scale-[1.03]"
        style={{ padding: '10px 18px', background: '#ffffff', border: '1px solid rgba(255,255,255,0.9)', textDecoration: 'none', boxShadow: '0 12px 30px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.25)' }}
      >
        <ScanFace size={24} strokeWidth={2.2} style={{ color: '#0b57d3' }} />
        <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0b1f3a', letterSpacing: '0.03em' }}>ARIA27 FaceID</span>
      </a>

      <div className="relative z-10 min-h-screen w-full flex items-end justify-between px-10 lg:px-16 pb-16 lg:pb-24">
        <div className="relative flex-shrink-0">
          <div className="relative overflow-hidden backdrop-blur-2xl rounded-2xl" style={{ background: 'linear-gradient(180deg, rgba(10,32,82,0.86) 0%, rgba(5,20,54,0.92) 100%)', border: '1px solid rgba(120,170,255,0.30)', boxShadow: '0 45px 100px rgba(0,0,0,0.55), 0 18px 40px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.12)', width: '300px' }}>
            {/* 18-Abr-2026 PM: barra decorativa — slate sólido sin azul brillante */}
            <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, #0b57d3 0%, #5b9dff 50%, #0b57d3 100%)' }} />
            
            <div style={{ padding: '22px 18px 18px 18px' }}>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  disabled={loading}
                  required
                  className="w-full text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b9dff]/50 placeholder:text-[#9fb3d6] disabled:opacity-50"
                  style={{ padding: '8px 12px', fontSize: '13px', height: '36px', background: 'rgba(3,14,40,0.75)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.45)', border: '1px solid rgba(120,170,255,0.32)' }}
                  placeholder="usuario@gcuavante.com"
                />

                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={pass}
                    onChange={(e) => { setPass(e.target.value); setError(''); }}
                    disabled={loading}
                    required
                    className="w-full text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b9dff]/50 placeholder:text-[#9fb3d6] disabled:opacity-50"
                    style={{ padding: '8px 40px 8px 12px', fontSize: showPass ? '13px' : '16px', height: '36px', background: 'rgba(3,14,40,0.75)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.45)', border: '1px solid rgba(120,170,255,0.32)', letterSpacing: showPass ? 'normal' : '0.25em' }}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    tabIndex={-1}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: 'rgba(220,232,255,0.85)', display: 'flex', alignItems: 'center' }}
                  >
                    {showPass ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
                  </button>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none" style={{ marginTop: '-2px' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-white/30 bg-[#0a1f4d] cursor-pointer"
                    style={{ accentColor: '#0b57d3' }}
                  />
                  <span className="text-[11.5px] text-[#dce8ff] font-medium">Mantener sesión iniciada</span>
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
                  style={{ height: '36px', fontSize: '13px', background: 'linear-gradient(135deg, #2f7cf0 0%, #5b9dff 100%)', boxShadow: '0 10px 28px rgba(47,124,240,0.55)' }}
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
                <p className="text-[9.5px] text-[#b8c8e8]">Contraseña de Zoho Mail o App Password</p>
              </div>

              <div className="mt-3 text-center">
                <p className="text-[9.5px] text-[#b8c8e8] tracking-wider uppercase flex items-center justify-center gap-1 font-medium">
                  <span>Acceso exclusivo · GCUAVANTE</span>
                  <span style={{ color: '#22c55e', fontSize: '8px' }}>●</span>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>PROD</span>
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
