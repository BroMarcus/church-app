'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const copy={
  en:{pill:'PILOT READINESS',title:'We couldn’t finish the readiness check.',body:'Nothing in your church setup was changed. Try the check again before making a pilot decision.',retry:'Try again',setup:'Church Admin',home:'Home'},
  es:{pill:'PREPARACIÓN DEL PILOTO',title:'No pudimos completar la revisión.',body:'No se cambió nada en la configuración de tu iglesia. Intenta la revisión otra vez antes de tomar una decisión sobre el piloto.',retry:'Intentar de nuevo',setup:'Administración',home:'Inicio'},
} as const

export default function PilotReadinessError({reset}:{reset:()=>void}){
  const searchParams=useSearchParams()
  const lang:'en'|'es'=searchParams.get('lang')==='es'?'es':'en'
  const t=copy[lang]
  const suffix=lang==='es'?'?lang=es':''

  return <main className="shell">
    <section className="card readiness-recovery" role="alert">
      <div className="pill">{t.pill}</div>
      <h1>{t.title}</h1>
      <p>{t.body}</p>
      <div className="row">
        <button className="btn" type="button" onClick={()=>reset()}>{t.retry}</button>
        <Link className="ghost" href={`/church${suffix}`}>{t.setup}</Link>
        <Link className="ghost" href={lang==='es'?'/?lang=es':'/'}>{t.home}</Link>
      </div>
    </section>
  </main>
}
