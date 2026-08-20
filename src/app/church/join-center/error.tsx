'use client'

export default function JoinCenterError({reset}:{reset:()=>void}){
  return <main className="shell"><section className="card" role="alert" style={{padding:26,marginTop:24}}>
    <div className="pill">JOIN CENTER • CENTRO DE REGISTRO</div>
    <h1>Join Center could not load.</h1>
    <p className="muted">No join link, QR code, invitation, or membership was changed. / No se cambió ningún enlace, código QR, invitación ni membresía.</p>
    <button className="btn" type="button" onClick={()=>reset()} style={{marginTop:14}}>Try again / Intentar de nuevo</button>
  </section></main>
}
