'use client'

import Link from 'next/link'

export default function PilotReadinessError({reset}:{reset:()=>void}){
  return <main className="shell">
    <section className="card" role="alert" style={{padding:26,marginTop:24}}>
      <div className="pill">PILOT READINESS • PREPARACIÓN DEL PILOTO</div>
      <h1>We couldn’t finish the readiness check.</h1>
      <p className="muted">No pudimos completar la revisión. Nothing in your church setup was changed. / No se cambió nada en la configuración de tu iglesia.</p>
      <div className="row" style={{gap:10,flexWrap:'wrap',marginTop:16}}>
        <button className="btn" type="button" onClick={()=>reset()}>Try again / Intentar de nuevo</button>
        <Link className="ghost" href="/church">Church Setup / Configuración</Link>
        <Link className="ghost" href="/">Home / Inicio</Link>
      </div>
    </section>
  </main>
}
