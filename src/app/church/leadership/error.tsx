'use client'

export default function ChurchLeadershipError({reset}:{reset:()=>void}){
  return <main className="shell"><section className="card" role="alert" style={{padding:26,marginTop:24}}>
    <div className="pill">LEADERSHIP TODAY • LIDERAZGO HOY</div>
    <h1>Leadership Today could not load.</h1>
    <p className="muted">No care item, assignment, note, or member record was changed. / No se modificó ningún asunto de cuidado, asignación, nota ni registro de miembro.</p>
    <button className="btn" type="button" onClick={()=>reset()} style={{marginTop:14}}>Try again / Intentar de nuevo</button>
  </section></main>
}
