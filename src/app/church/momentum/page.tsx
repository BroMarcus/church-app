import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Activity,AlertTriangle,ArrowDownRight,ArrowRight,ArrowUpRight,Minus,ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

const directionMeta=(direction:string,es:boolean)=>({growing:[ArrowUpRight,es?'Creciendo':'Growing'],improving:[ArrowUpRight,es?'Mejorando':'Improving'],steady:[Minus,es?'Estable':'Steady'],declining:[ArrowDownRight,es?'Bajando':'Declining'],needs_attention:[AlertTriangle,es?'Necesita atención':'Needs attention'],baseline_needed:[Activity,es?'Necesita historial':'Baseline needed']} as Record<string,[any,string]>)[direction]||[Activity,direction]

export default async function MomentumPage({searchParams}:{searchParams:Promise<{lang?:string;days?:string}>}){
  const params=await searchParams,es=params.lang==='es'
  const days=[7,30,90].includes(Number(params.days))?Number(params.days):30
  const l=(p:string)=>es?`${p}${p.includes('?')?'&':'?'}lang=es`:p
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const [leadershipPerm,memberPerm]=await Promise.all([
    supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'view_leadership'}),
    supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_members'})
  ])
  if(!['pastor','church_admin'].includes(membership.role)&&!leadershipPerm.data&&!memberPerm.data)redirect('/')
  const {data:signals,error}=await supabase.rpc('church_momentum_summary',{p_church_id:membership.church_id,p_days:days})
  if(error)throw new Error(error.message)
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const rows=signals??[],hasBaseline=rows.some((r:any)=>r.change_value!=null)
  return <main className="shell"><header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {es?'Impulso':'Momentum'}</div></div><div className="row"><Link className="ghost" href={l('/church/health')}>{es?'Salud de la Iglesia':'Church Health'}</Link><Link className="ghost" href={l('/church/group-growth')}>{es?'Crecimiento de Grupos':'Group Growth'}</Link><Link className="ghost" href="/">{es?'← Inicio':'← Home'}</Link></div></header>
  <section className="card" style={{padding:26,marginBottom:18}}><div className="pill">{es?'IMPULSO DE LA IGLESIA':'CHURCH MOMENTUM'}</div><h1>{es?'No solo “¿cuántos tenemos?” — sino “¿hacia dónde vamos?”':'Not only “how many do we have?” — but “which direction are we moving?”'}</h1><p className="muted">{es?'Compara las mismas métricas de salud de la iglesia con una fecha anterior. Los seguimientos vencidos se interpretan al revés: bajar es mejorar.':'Compare the same church-health metrics against an earlier date. Overdue follow-up is interpreted in reverse: going down is improvement.'}</p><div className="row" style={{gap:8,flexWrap:'wrap',marginTop:14}}>{[7,30,90].map(d=><Link className={days===d?'btn':'ghost'} key={d} href={`/church/momentum?days=${d}${es?'&lang=es':''}`}>{d} {es?'días':'days'}</Link>)}</div></section>
  {!hasBaseline&&<div className="notice"><Activity size={15}/><span>{es?'La captura histórica acaba de comenzar. Kingdom Network necesita una fecha anterior para calcular cambio real. Los valores actuales ya se están guardando diariamente.':'Historical capture has just started. Kingdom Network needs an earlier date before it can calculate real change. Current values are now being saved daily.'}</span></div>}
  <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:14}}>{rows.map((r:any)=>{const [Icon,label]=directionMeta(r.direction,es);return <article className="card" style={{padding:18}} key={r.signal_key}><div className="row" style={{justifyContent:'space-between',gap:10,alignItems:'flex-start'}}><div><div className="small muted">{r.label}</div><strong style={{fontSize:34,display:'block',marginTop:5}}>{r.current_value}</strong></div><span className="pill"><Icon size={11}/> {label.toUpperCase()}</span></div><div style={{marginTop:12}}>{r.change_value==null?<div className="small muted">{es?'Esperando una fecha de comparación.':'Waiting for a comparison date.'}</div>:<><strong>{Number(r.change_value)>0?'+':''}{r.change_value}</strong>{r.change_percent!=null&&<span className="small muted"> • {Number(r.change_percent)>0?'+':''}{r.change_percent}%</span>}<div className="small muted">{es?`cambio en ${days} días`:`change over ${days} days`}</div></>}</div></article>})}</section>
  <section className="card" style={{padding:18,marginTop:18}}><div className="row" style={{gap:10,alignItems:'flex-start'}}><ShieldCheck size={18}/><div><strong>{es?'Señales, no sentencia.':'Signals, not a verdict.'}</strong><p className="small muted" style={{margin:'5px 0 0'}}>{es?'El tablero muestra movimiento en los datos para ayudar al liderazgo a hacer mejores preguntas. No decide automáticamente que una iglesia está sana o enferma.':'The dashboard shows movement in the data so leadership can ask better questions. It does not automatically declare a church healthy or unhealthy.'}</p></div></div></section>
  </main>
}