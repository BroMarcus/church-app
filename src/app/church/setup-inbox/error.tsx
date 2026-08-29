'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function SetupInboxError({reset}:{reset:()=>void}){
  const params=useSearchParams()
  const es=params.get('lang')==='es'
  return <main className="shell"><section className="card" role="alert" style={{padding:26,marginTop:24}}>
    <div className="pill">{es?'BANDEJA DE CONFIGURACIÓN':'SETUP INBOX'}</div>
    <h1>{es?'No se pudo abrir la Bandeja de Configuración.':'Setup Inbox could not load.'}</h1>
    <p className="muted">{es?'No se modificó ningún archivo ni configuración de la iglesia. Inténtalo de nuevo.':'No file or church setup record was changed. Try again.'}</p>
    <div className="row" style={{marginTop:14}}>
      <button className="btn" type="button" onClick={()=>reset()}>{es?'Intentar de nuevo':'Try again'}</button>
      <Link className="ghost" href={es?'/church/launch?lang=es':'/church/launch'}>{es?'Volver al Constructor de Iglesia':'Back to Church Builder'}</Link>
    </div>
  </section></main>
}