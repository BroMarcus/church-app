export default function NotificationsLoading(){
  return <main style={{maxWidth:980,margin:'0 auto',padding:'28px 18px 80px'}} aria-busy="true" aria-live="polite">
    <div style={{border:'1px solid #e5e7eb',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>Notifications / Notificaciones</div>
      <h1 style={{margin:'10px 0 8px'}}>Loading notifications…</h1>
      <p style={{margin:0,color:'#6b7280'}}>Preparando tus notificaciones… Nothing is being marked read, dismissed, or changed while this loads. / No se está marcando, descartando ni cambiando ninguna notificación mientras carga.</p>
    </div>
  </main>
}
