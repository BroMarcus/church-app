export default function PilotReadinessLoading(){
  return <main className="shell" aria-busy="true" aria-live="polite">
    <section className="card" style={{padding:26,marginTop:24}}>
      <div className="pill">PILOT READINESS • PREPARACIÓN DEL PILOTO</div>
      <h1>Checking your church setup…</h1>
      <p className="muted">Revisando la configuración de tu iglesia…</p>
      <div style={{display:'grid',gap:10,marginTop:18}}>
        {[1,2,3,4].map(item=><div key={item} style={{height:64,border:'1px solid var(--line)',borderRadius:13,opacity:.55}} />)}
      </div>
    </section>
  </main>
}
