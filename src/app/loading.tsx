export default function HomeLoading(){
  return <main style={{minHeight:'100vh',background:'#f5f7fb',padding:'28px 18px 96px'}} aria-busy="true" aria-live="polite">
    <div style={{maxWidth:1180,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
        <div style={{width:42,height:42,borderRadius:13,display:'grid',placeItems:'center',background:'linear-gradient(145deg,#153eb1,#1e5bff)',color:'#fff',fontWeight:900,fontSize:18}}>1K</div>
        <div><div style={{fontSize:14,fontWeight:900,letterSpacing:'.1em'}}>ONE KINGDOM</div><div style={{fontSize:9,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase',color:'#667085',marginTop:4}}>Church OS</div></div>
      </div>
      <div style={{border:'1px solid #e8ecf4',borderRadius:24,padding:26,background:'#fff',boxShadow:'0 14px 38px rgba(16,24,40,.06)'}}>
        <div style={{fontSize:10,fontWeight:900,letterSpacing:'.11em',textTransform:'uppercase',color:'#1e5bff'}}>Preparing your One Kingdom</div>
        <h1 style={{margin:'11px 0 8px',color:'#101828'}}>Getting your home ready…</h1>
        <p style={{margin:0,color:'#667085',lineHeight:1.55}}>We’re gathering only what matters right now. / Estamos preparando solo lo que importa ahora.</p>
      </div>
    </div>
  </main>
}
