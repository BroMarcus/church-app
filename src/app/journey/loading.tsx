export default function JourneyLoading(){
  return <main style={{maxWidth:980,margin:'0 auto',padding:'28px 18px 80px'}} aria-busy="true" aria-live="polite">
    <div style={{border:'1px solid #e5e7eb',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>My Journey / Mi Camino</div>
      <h1 style={{margin:'10px 0 8px'}}>Getting your journey ready…</h1>
      <p style={{margin:0,color:'#6b7280'}}>Preparando tu camino… We’re loading your progress and next step. / Estamos cargando tu progreso y tu próximo paso.</p>
    </div>
  </main>
}
