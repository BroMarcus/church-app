'use client'

export default function ChurchFeedbackError({reset}:{reset:()=>void}){
  return <main className="shell"><section className="card" role="alert" style={{padding:26,marginTop:24}}>
    <div className="pill">PILOT FEEDBACK • COMENTARIOS DEL PILOTO</div>
    <h1>Church feedback could not load.</h1>
    <p className="muted">No feedback item, status, or church record was changed. / No se modificó ningún comentario, estado ni registro de la iglesia.</p>
    <button className="btn" type="button" onClick={()=>reset()} style={{marginTop:14}}>Try again / Intentar de nuevo</button>
  </section></main>
}
