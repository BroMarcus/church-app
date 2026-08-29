'use client'

import { useSearchParams } from 'next/navigation'

export default function SetupInboxLoading(){
  const params=useSearchParams()
  const es=params.get('lang')==='es'
  return <main className="shell" aria-busy="true" aria-live="polite"><section className="card" style={{padding:26,marginTop:24}}>
    <div className="pill">{es?'BANDEJA DE CONFIGURACIÓN':'SETUP INBOX'}</div>
    <h1>{es?'Preparando la Bandeja de Configuración…':'Preparing Setup Inbox…'}</h1>
    <p className="muted">{es?'No se está cambiando ningún archivo ni registro de configuración mientras carga.':'No file or church setup record is being changed while this loads.'}</p>
  </section></main>
}