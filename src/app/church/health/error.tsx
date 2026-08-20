'use client'

import Link from 'next/link'

export default function ChurchHealthError({reset}:{reset:()=>void}){
  return <main className="shell">
    <section className="card" role="alert" style={{padding:26,marginTop:24}}>
      <div className="pill">CHURCH HEALTH • SALUD DE LA IGLESIA</div>
      <h1>We couldn’t load this page.</h1>
      <p className="muted">No pudimos cargar esta página. Your church data was not changed. / Los datos de tu iglesia no fueron modificados.</p>
      <div className="row" style={{gap:10,flexWrap:'wrap',marginTop:16}}>
        <button className="btn" type="button" onClick={()=>reset()}>Try again / Intentar de nuevo</button>
        <Link className="ghost" href="/church/readiness">Pilot Readiness / Preparación</Link>
        <Link className="ghost" href="/">Home / Inicio</Link>
      </div>
    </section>
  </main>
}
