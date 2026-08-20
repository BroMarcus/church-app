export default function MessagesLoading(){
  return <main style={{maxWidth:980,margin:'0 auto',padding:'28px 18px 80px'}} aria-busy="true" aria-live="polite">
    <div style={{border:'1px solid #e5e7eb',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>Messages / Mensajes</div>
      <h1 style={{margin:'10px 0 8px'}}>Loading your conversations…</h1>
      <p style={{margin:0,color:'#6b7280'}}>Preparando tus conversaciones… Your messages are not being changed while this loads. / Tus mensajes no se están modificando mientras carga.</p>
    </div>
  </main>
}
