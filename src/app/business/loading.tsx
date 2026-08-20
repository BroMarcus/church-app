export default function BusinessLoading(){
  return <main style={{maxWidth:980,margin:'0 auto',padding:'28px 18px 80px'}} aria-busy="true" aria-live="polite">
    <div style={{border:'1px solid #e5e7eb',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>Business Partners / Negocios</div>
      <h1 style={{margin:'10px 0 8px'}}>Loading the business directory…</h1>
      <p style={{margin:0,color:'#6b7280'}}>Preparando el directorio de negocios… No listing, sponsorship, or visibility setting is being changed while this loads. / No se está cambiando ningún negocio, patrocinio ni configuración de visibilidad mientras carga.</p>
    </div>
  </main>
}
