import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PhoneProofClient from './phone-proof-client'
import './phone-proof.css'

const copy={
  en:{
    title:'Real-phone proof',body:'Run every required pilot flow on a real phone and keep enough evidence to reproduce any failure.',back:'← Pilot Readiness',home:'Home',english:'English',spanish:'Español',
    build:'Tested build',buildHelp:'Saved results are kept separate for this deployed build.',launchTitle:'Open a test flow',launchHelp:'These links only open the starting screen in a new tab. Keep this checklist open and use test accounts only.',
    signup:'Signup',signin:'Sign in / password reset',start:'Start Here',guide:'Kingdom Guide',join:'Join Center',setup:'Setup Inbox'
  },
  es:{
    title:'Prueba con teléfono real',body:'Prueba cada flujo requerido del piloto en un teléfono real y guarda suficiente evidencia para reproducir cualquier falla.',back:'← Preparación del Piloto',home:'Inicio',english:'English',spanish:'Español',
    build:'Versión probada',buildHelp:'Los resultados guardados se mantienen separados para esta versión desplegada.',launchTitle:'Abrir una prueba',launchHelp:'Estos enlaces solamente abren la pantalla inicial en una pestaña nueva. Mantén abierta esta lista y usa solamente cuentas de prueba.',
    signup:'Registro',signin:'Entrar / restablecer contraseña',start:'Empieza Aquí',guide:'Kingdom Guide',join:'Centro de Invitaciones',setup:'Bandeja de Configuración'
  }
} as const

export default async function PhoneProofPage({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const params=await searchParams
  const lang:'en'|'es'=params.lang==='es'?'es':'en'
  const t=copy[lang]
  const supabase=await createClient()
  const {data:claims,error:claimsError}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(claimsError||!userId)redirect(`/login?lang=${lang}&mode=signin`)

  const {data:membership,error:membershipError}=await supabase
    .from('church_memberships')
    .select('church_id,role')
    .eq('user_id',userId)
    .eq('status','active')
    .limit(1)
    .maybeSingle()

  if(membershipError||!membership?.church_id||!['pastor','church_admin'].includes(membership.role)){
    redirect(lang==='es'?'/?lang=es':'/')
  }

  const rawBuildId=process.env.VERCEL_GIT_COMMIT_SHA||process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA||'local-dev'
  const buildId=rawBuildId.trim().slice(0,40)||'local-dev'
  const evidenceScope=`${membership.church_id}:${buildId}`

  return <main className="phone-proof-shell">
    <header className="phone-proof-top">
      <div><div className="pill">PHONE PROOF</div><h1>{t.title}</h1><p>{t.body}</p></div>
      <nav className="proof-links" aria-label={lang==='es'?'Navegación de prueba':'Proof navigation'}>
        <Link href={`/church/readiness${lang==='es'?'?lang=es':''}`}>{t.back}</Link>
        <Link href={lang==='es'?'/?lang=es':'/'}>{t.home}</Link>
        <Link href="/church/readiness/phone-proof?lang=en">{t.english}</Link>
        <Link href="/church/readiness/phone-proof?lang=es">{t.spanish}</Link>
      </nav>
    </header>

    <section className="local-note" aria-label={t.build}>
      <strong>{t.build}:</strong> <code>{buildId}</code><br/>{t.buildHelp}
    </section>

    <section className="local-note">
      <strong>{t.launchTitle}</strong>
      <p>{t.launchHelp}</p>
      <nav className="proof-links" aria-label={t.launchTitle}>
        <Link href={`/login?lang=${lang}&mode=signup`} target="_blank" rel="noreferrer">{t.signup}</Link>
        <Link href={`/login?lang=${lang}&mode=signin`} target="_blank" rel="noreferrer">{t.signin}</Link>
        <Link href={`/start?lang=${lang}`} target="_blank" rel="noreferrer">{t.start}</Link>
        <Link href={`/guide?lang=${lang}`} target="_blank" rel="noreferrer">{t.guide}</Link>
        <Link href={`/church/join-center?lang=${lang}`} target="_blank" rel="noreferrer">{t.join}</Link>
        <Link href={`/church/setup-inbox?lang=${lang}`} target="_blank" rel="noreferrer">{t.setup}</Link>
      </nav>
    </section>

    <PhoneProofClient lang={lang} churchId={evidenceScope}/>
  </main>
}