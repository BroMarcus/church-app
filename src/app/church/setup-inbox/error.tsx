'use client'

export default function SetupInboxError({reset}:{reset:()=>void}){
  return <main className="shell"><section className="card" role="alert" style={{padding:26,marginTop:24}}>
    <div className="pill">SETUP INBOX • BANDEJA DE CONFIGURACIÓN</div>
    <h1>Setup Inbox could not load.</h1>
    <p className="muted">No file, resource, upload, or church setup record was changed. / No se modificó ningún archivo, recurso, carga ni registro de configuración de la iglesia.</p>
    <button className="btn" type="button" onClick={()=>reset()} style={{marginTop:14}}>Try again / Intentar de nuevo</button>
  </section></main>
}
