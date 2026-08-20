export default function ChurchHealthLoading(){
  return <main className="shell" aria-busy="true" aria-live="polite">
    <section className="card" style={{padding:26,marginTop:24}}>
      <div className="pill">CHURCH HEALTH • SALUD DE LA IGLESIA</div>
      <h1>Loading church health…</h1>
      <p className="muted">Cargando la salud de la iglesia…</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginTop:18}}>
        {[1,2,3,4].map(item=><div key={item} style={{height:92,border:'1px solid var(--line)',borderRadius:13,opacity:.55}} />)}
      </div>
    </section>
  </main>
}
