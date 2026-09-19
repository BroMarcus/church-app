'use client'

import { useSearchParams } from 'next/navigation'

export default function PilotReadinessLoading(){
  const searchParams=useSearchParams()
  const spanish=searchParams.get('lang')==='es'

  return <main className="shell" aria-busy="true" aria-live="polite">
    <section className="card" style={{padding:26,marginTop:24}}>
      <div className="pill">{spanish?'PREPARACIÓN DEL PILOTO':'PILOT READINESS'}</div>
      <h1>{spanish?'Revisando la configuración de tu iglesia…':'Checking your church setup…'}</h1>
      <p className="muted">{spanish?'Esto puede tardar un momento. No cierres la página.':'This may take a moment. Keep this page open.'}</p>
      <div style={{display:'grid',gap:10,marginTop:18}} aria-hidden="true">
        {[1,2,3,4].map(item=><div key={item} style={{height:64,border:'1px solid var(--line)',borderRadius:13,opacity:.55}} />)}
      </div>
    </section>
  </main>
}
