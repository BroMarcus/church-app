'use client'

export default function InvitePersonError({reset}:{reset:()=>void}){
  return <main className="shell"><section className="card" role="alert" style={{padding:26,marginTop:24}}>
    <div className="pill">INVITE A PERSON • INVITAR A UNA PERSONA</div>
    <h1>The invitation page could not load.</h1>
    <p className="muted">No invitation, membership, or church access was changed. / No se cambió ninguna invitación, membresía ni acceso a la iglesia.</p>
    <button className="btn" type="button" onClick={()=>reset()} style={{marginTop:14}}>Try again / Intentar de nuevo</button>
  </section></main>
}
