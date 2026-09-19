'use client'

export default function HomeError({reset}:{reset:()=>void}){
  return <main style={{minHeight:'100vh',background:'#f5f7fb',padding:'28px 18px 96px'}}>
    <div style={{maxWidth:760,margin:'0 auto'}} role="alert">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}><div style={{width:42,height:42,borderRadius:13,display:'grid',placeItems:'center',background:'linear-gradient(145deg,#153eb1,#1e5bff)',color:'#fff',fontWeight:900}}>1K</div><div><div style={{fontSize:14,fontWeight:900,letterSpacing:'.1em'}}>ONE KINGDOM</div><div style={{fontSize:9,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase',color:'#667085',marginTop:4}}>Church OS</div></div></div>
      <div style={{border:'1px solid #fecaca',borderRadius:24,padding:26,background:'#fff',boxShadow:'0 14px 38px rgba(16,24,40,.06)'}}>
        <div style={{fontSize:10,fontWeight:900,letterSpacing:'.11em',textTransform:'uppercase',color:'#b42318'}}>Something needs another try</div>
        <h1 style={{margin:'11px 0 8px',color:'#101828'}}>Your One Kingdom home could not load.</h1>
        <p style={{margin:'0 0 18px',color:'#667085',lineHeight:1.55}}>Your account, church information, and progress were not changed. / Tu cuenta, la información de tu iglesia y tu progreso no fueron modificados.</p>
        <button type="button" onClick={()=>reset()} style={{minHeight:44,padding:'10px 16px',borderRadius:11,border:0,background:'#1e5bff',color:'#fff',fontWeight:800,cursor:'pointer'}}>Try again / Intentar de nuevo</button>
      </div>
    </div>
  </main>
}
