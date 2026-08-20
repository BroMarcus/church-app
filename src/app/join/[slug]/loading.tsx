export default function ChurchJoinLoading(){
  return <main className="login-wrap" aria-busy="true" aria-live="polite">
    <div className="login card">
      <div className="pill">KINGDOM NETWORK</div>
      <h1>Opening church signup…</h1>
      <p className="muted">Abriendo el registro de la iglesia…</p>
      <div style={{display:'grid',gap:10,marginTop:18}}>
        <div style={{height:52,border:'1px solid var(--line)',borderRadius:13,opacity:.55}} />
        <div style={{height:52,border:'1px solid var(--line)',borderRadius:13,opacity:.55}} />
        <div style={{height:52,border:'1px solid var(--line)',borderRadius:13,opacity:.55}} />
      </div>
    </div>
  </main>
}
