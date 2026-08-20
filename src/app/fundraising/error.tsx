'use client'

export default function FundraisingError({reset}:{reset:()=>void}){
  return <main style={{maxWidth:980,margin:'0 auto',padding:'28px 18px 80px'}}>
    <div role="alert" style={{border:'1px solid #fecaca',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>Fundraising / Recaudación de fondos</div>
      <h1 style={{margin:'10px 0 8px'}}>Fundraising could not load.</h1>
      <p style={{margin:'0 0 16px',color:'#6b7280'}}>No campaign, donation, or fundraising setting was changed. / No se modificó ninguna campaña, donación ni configuración de recaudación.</p>
      <button type="button" onClick={()=>reset()} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,cursor:'pointer'}}>Try again / Intentar de nuevo</button>
    </div>
  </main>
}
