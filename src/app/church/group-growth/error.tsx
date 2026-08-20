'use client'

export default function GroupGrowthError({reset}:{reset:()=>void}){
  return <main className="shell"><section className="card" role="alert" style={{padding:26,marginTop:24}}>
    <div className="pill">GROUP GROWTH • CRECIMIENTO DE GRUPOS</div>
    <h1>Group growth could not load.</h1>
    <p className="muted">No attendance, group, member, or follow-up information was changed. / No se modificó ninguna asistencia, grupo, miembro ni información de seguimiento.</p>
    <button className="btn" type="button" onClick={()=>reset()} style={{marginTop:14}}>Try again / Intentar de nuevo</button>
  </section></main>
}
