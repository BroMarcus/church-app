import Link from 'next/link'

export default function NotFound(){
  return <main style={{maxWidth:760,margin:'0 auto',padding:'28px 18px 80px'}}>
    <div className="card" style={{padding:24}}>
      <div className="pill">KINGDOM NETWORK</div>
      <h1 style={{margin:'10px 0 8px'}}>We could not find that page / No encontramos esa página</h1>
      <p className="muted" style={{lineHeight:1.6,marginBottom:8}}>The link may be old, incomplete, or typed incorrectly. Your account and church information were not changed.</p>
      <p className="muted" style={{lineHeight:1.6,marginTop:0}}>El enlace puede ser antiguo, estar incompleto o haberse escrito incorrectamente. Tu cuenta y la información de tu iglesia no fueron modificadas.</p>
      <div className="row" style={{gap:10,flexWrap:'wrap',marginTop:18}}>
        <Link className="btn" href="/">Home / Inicio</Link>
        <Link className="ghost" href="/login?mode=signin">Sign in / Iniciar sesión</Link>
      </div>
    </div>
  </main>
}
