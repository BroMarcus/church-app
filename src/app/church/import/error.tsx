'use client'

export default function ChurchImportError({reset}:{reset:()=>void}){
  return <main className="shell"><section className="card" role="alert" style={{padding:26,marginTop:24}}>
    <div className="pill">MEMBER IMPORT • IMPORTAR MIEMBROS</div>
    <h1>Member import could not load.</h1>
    <p className="muted">No member, import batch, or church record was changed. / No se modificó ningún miembro, lote de importación ni registro de la iglesia.</p>
    <button className="btn" type="button" onClick={()=>reset()} style={{marginTop:14}}>Try again / Intentar de nuevo</button>
  </section></main>
}
