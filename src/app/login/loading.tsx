export default function LoginLoading(){
  return <main className="login-wrap" aria-busy="true" aria-live="polite">
    <div className="login card">
      <div className="pill">ONE KINGDOM • PILOT</div>
      <h1>Opening sign in…</h1>
      <p className="muted">Abriendo el inicio de sesión…</p>
      <div style={{display:'grid',gap:10,marginTop:18}}>
        <div style={{height:52,border:'1px solid var(--line)',borderRadius:13,opacity:.55}} />
        <div style={{height:52,border:'1px solid var(--line)',borderRadius:13,opacity:.55}} />
      </div>
    </div>
  </main>
}
