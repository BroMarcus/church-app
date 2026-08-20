'use client'

export default function ChurchAnalyticsError({reset}:{reset:()=>void}){
  return <main className="shell"><section className="card" role="alert" style={{padding:26,marginTop:24}}>
    <div className="pill">CHURCH ANALYTICS • ANÁLISIS DE LA IGLESIA</div>
    <h1>Church analytics could not load.</h1>
    <p className="muted">No report, metric, or church record was changed. / No se modificó ningún informe, métrica ni registro de la iglesia.</p>
    <button className="btn" type="button" onClick={()=>reset()} style={{marginTop:14}}>Try again / Intentar de nuevo</button>
  </section></main>
}
