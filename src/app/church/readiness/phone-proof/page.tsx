import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PhoneProofClient from './phone-proof-client'
import './phone-proof.css'

const copy={
  en:{
    title:'Real-phone proof',body:'Run every required pilot flow on a real phone and keep enough evidence to reproduce any failure.',back:'← Pilot Readiness',home:'Home',english:'English',spanish:'Español',
    build:'Tested build',buildHelp:'Saved results are kept separate for this deployed build and your admin test session.',launchTitle:'Open a test flow',launchHelp:'These links only open the starting screen in a new tab. Keep this checklist open and use test accounts only.',runbook:'Open safe test runbook',runbookHelp:'New tester? Open the bilingual runbook first. It explains account setup, test order, PASS rules, failure capture, and what secret/private information must never be pasted into the Control Room.',privateInvite:'Open private-invite recovery proof',privateInviteHelp:'Use this dedicated bilingual checklist to prove new-account confirmation, existing-account sign-in, forgot-password, resend-confirmation, bad-link recovery, and failed-redemption cleanup without creating duplicate accounts.',
    signup:'Signup',signin:'Sign in / password reset',start:'Start Here',guide:'Kingdom Guide',join:'Join Center',setup:'Setup Inbox'
  },
  es:{
    title:'Prueba con teléfono real',body:'Prueba cada flujo requerido del piloto en un teléfono real y guarda suficiente evidencia para reproducir cualquier falla.',back:'← Preparación del Piloto',home:'Inicio',english:'English',spanish:'Español',
    build:'Versión probada',buildHelp:'Los resultados guardados se mantienen separados para esta versión desplegada y tu sesión de prueba administrativa.',launchTitle:'Abrir una prueba',launchHelp:'Estos enlaces solamente abren la pantalla inicial en una pestaña nueva. Mantén abierta esta lista y usa solamente cuentas de prueba.',runbook:'Abrir guía segura de prueba',runbookHelp:'¿Es tu primera prueba? Abre primero la guía bilingüe. Explica las cuentas, el orden, cuándo marcar PASÓ, cómo guardar una falla y qué información secreta/privada nunca debes pegar en el Control Room.',privateInvite:'Abrir prueba de recuperación de invitación privada',privateInviteHelp:'Usa esta lista bilingüe dedicada para comprobar confirmación de cuenta nueva, entrada con cuenta existente, olvidé contraseña, reenvío de confirmación, recuperación de enlace dañado y limpieza después de una redención fallida sin crear cuentas duplicadas.',
    signup:'Registro',signin:'Entrar / restablecer contraseña',start:'Empieza Aquí',guide:'Kingdom Guide',join:'Centro de Invitaciones',setup:'Bandeja de Configuración'
  }
} as const

function boundedCode(value:unknown){
  const code=typeof value==='object'&&value&&'code' in value?String((value as {code?:unknown}).code??'UNKNOWN'):'UNKNOWN'
  return code.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'UNKNOWN'
}

export default async function PhoneProofPage({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const params=await searchParams
  const lang:'en'|'es'=params.lang==='es'?'es':'en'
  const t=copy[lang]
  const supabase=await createClient()
  const {data:claims,error:claimsError}=await supabase.auth.getClaims()
  if(claimsError){
    console.error('[phone-proof] auth unavailable',{code:boundedCode(claimsError)})
    throw new Error('PHONE_PROOF_AUTH_UNAVAILABLE')
  }
  const userId=claims?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}&mode=signin`)

  const {data:membership,error:membershipError}=await supabase
    .from('church_memberships')
    .select('church_id,role')
    .eq('user_id',userId)
    .eq('status','active')
    .limit(1)
    .maybeSingle()

  if(membershipError){
    console.error('[phone-proof] membership unavailable',{code:boundedCode(membershipError)})
    throw new Error('PHONE_PROOF_MEMBERSHIP_UNAVAILABLE')
  }
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role)){
    redirect(lang==='es'?'/?lang=es':'/')
  }

  const rawBuildId=process.env.VERCEL_GIT_COMMIT_SHA||process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA||'local-dev'
  const buildId=rawBuildId.trim().slice(0,40)||'local-dev'
  // Browser-local evidence must never leak between two admins who use the same device/browser.
  // Scope it to church + authenticated tester + deployed build without displaying the user id.
  const evidenceScope=`${membership.church_id}:${userId}:${buildId}`

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
      <strong>{t.runbook}</strong>
      <p>{t.runbookHelp}</p>
      <div className="proof-links"><Link href={`/church/readiness/phone-proof/runbook?lang=${lang}`}>{t.runbook}</Link></div>
    </section>

    <section className="local-note">
      <strong>{t.privateInvite}</strong>
      <p>{t.privateInviteHelp}</p>
      <div className="proof-links"><Link href={`/church/readiness/phone-proof/private-invite?lang=${lang}`}>{t.privateInvite}</Link></div>
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

    <PhoneProofClient lang={lang} churchId={evidenceScope} buildId={buildId}/>
  </main>
}