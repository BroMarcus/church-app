import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PhoneProofClient from './phone-proof-client'
import './phone-proof.css'

const copy={
  en:{title:'Real-phone proof',body:'Run every required pilot flow on a real phone and keep enough evidence to reproduce any failure.',back:'← Pilot Readiness',home:'Home',english:'English',spanish:'Español'},
  es:{title:'Prueba con teléfono real',body:'Prueba cada flujo requerido del piloto en un teléfono real y guarda suficiente evidencia para reproducir cualquier falla.',back:'← Preparación del Piloto',home:'Inicio',english:'English',spanish:'Español'}
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
    <PhoneProofClient lang={lang} churchId={String(membership.church_id)}/>
  </main>
}
