'use client'

import Link from 'next/link'

export default function ChurchJoinError({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <main className="login-wrap">
    <div className="login card" role="alert">
      <div className="pill">KINGDOM NETWORK</div>
      <h1>We couldn’t open this church signup page.</h1>
      <p className="muted">No pudimos abrir esta página de registro. No account or church record was changed. / No se cambió ninguna cuenta ni registro de iglesia.</p>
      <div style={{display:'grid',gap:8,marginTop:14}}>
        <button className="btn" type="button" onClick={()=>reset()}>Try again / Intentar de nuevo</button>
        <Link className="ghost" href="/login?mode=signin">Sign in / Iniciar sesión</Link>
      </div>
    </div>
  </main>
}
