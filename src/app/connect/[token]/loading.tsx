import '../connect.css'

export default function LoadingConnection(){
  return <main className="connect-shell">
    <section className="connect-card connect-success" aria-live="polite">
      <div className="connect-pill">CONNECT • CONECTAR</div>
      <h1>Loading your church connection…</h1>
      <p className="connect-muted">Cargando su conexión con la iglesia…</p>
      <div className="connect-safe">Please wait while we confirm the invitation. • Espere mientras confirmamos la invitación.</div>
    </section>
  </main>
}
