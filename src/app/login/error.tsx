'use client'

export default function LoginError({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <main className="login-wrap">
    <div className="login card" role="alert">
      <div className="pill">KINGDOM NETWORK • PILOT</div>
      <h1>Sign in is temporarily unavailable.</h1>
      <p className="muted">El inicio de sesión no está disponible temporalmente. Your account was not changed. / Tu cuenta no fue modificada.</p>
      <button className="btn" type="button" onClick={()=>reset()} style={{marginTop:14}}>Try again / Intentar de nuevo</button>
    </div>
  </main>
}
