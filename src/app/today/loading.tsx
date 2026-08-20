export default function TodayLoading(){
  return <main style={{maxWidth:980,margin:'0 auto',padding:'28px 18px 80px'}} aria-busy="true" aria-live="polite">
    <div style={{border:'1px solid #e5e7eb',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>My Today / Mi Día</div>
      <h1 style={{margin:'10px 0 8px'}}>Getting today ready…</h1>
      <p style={{margin:0,color:'#6b7280'}}>Preparando tu día… We’re gathering only what needs your attention now. / Estamos reuniendo solo lo que necesita tu atención ahora.</p>
    </div>
  </main>
}
