import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarRange,ClipboardList,Languages,ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

const iso=(d:Date)=>d.toISOString().slice(0,10)

export default async function PastorReportsPage({searchParams}:{searchParams:Promise<{lang?:string;start?:string;end?:string}>}){
  const params=await searchParams,es=params.lang==='es'
  const today=new Date(),defaultStart=new Date(today.getFullYear(),today.getMonth(),1)
  const start=/^\d{4}-\d{2}-\d{2}$/.test(params.start||'')?params.start!:iso(defaultStart)
  const end=/^\d{4}-\d{2}-\d{2}$/.test(params.end||'')?params.end!:iso(today)
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
  const {data:rows,error}=await supabase.rpc('church_reporting_period_summary',{p_church_id:membership.church_id,p_start_date:start,p_end_date:end})
  if(error)throw new Error(error.message)
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  return <main className="shell"><header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {es?'Reportes del Pastor':'Pastor Reports'}</div></div><div className="row"><Languages size={14}/><Link className="ghost" href={`/church/reports?start=${start}&end=${end}&lang=en`}>English</Link><Link className="ghost" href={`/church/reports?start=${start}&end=${end}&lang=es`}>Español</Link><Link className="ghost" href={l('/church/health')}>{es?'Salud':'Church Health'}</Link><Link className="ghost" href="/">{es?'← Inicio':'← Home'}</Link></div></header>
  <section className="card" style={{padding:26,marginBottom:18}}><div className="pill"><ClipboardList size={11}/> {es?'REPORTES DE LIDERAZGO':'LEADERSHIP REPORTING'}</div><h1>{es?'Números definidos, no números adivinados.':'Defined numbers, not guessed numbers.'}</h1><p className="muted">{es?'Elige un período y Kingdom Network resume los datos que ya fueron capturados por Evangelismo, Mi Jornada verificada, First Steps y Grupos.':'Choose a period and Kingdom Network summarizes data already captured through Evangelism, verified Journey records, First Steps and Groups.'}</p></section>
  <form className="card" style={{padding:16,marginBottom:18}}><div className="row" style={{gap:10,alignItems:'end',flexWrap:'wrap'}}><label className="field"><span>{es?'Desde':'From'}</span><input type="date" name="start" defaultValue={start}/></label><label className="field"><span>{es?'Hasta':'Through'}</span><input type="date" name="end" defaultValue={end}/></label>{es&&<input type="hidden" name="lang" value="es"/>}<button className="btn"><CalendarRange size={14}/> {es?'Actualizar reporte':'Update report'}</button></div></form>
  <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:14}}>{(rows??[]).map((r:any)=><article className="card" style={{padding:18}} key={r.metric_key}><div className="small muted">{r.label}</div><strong style={{fontSize:38,display:'block',margin:'5px 0 8px'}}>{r.value}</strong><div className="small muted" style={{lineHeight:1.55}}>{r.definition}</div></article>)}</section>
  <section className="card" style={{padding:18,marginTop:18}}><div className="row" style={{gap:10,alignItems:'flex-start'}}><ShieldCheck size={18}/><div><strong>{es?'Listo para mapear al reporte oficial.':'Ready to map to the official report.'}</strong><p className="small muted" style={{margin:'5px 0 0'}}>{es?'Cuando Pastor comparta el formulario real del distrito/organización, podemos enlazar cada casilla a una definición existente en vez de pedirle a liderazgo que vuelva a contar todo a mano.':'When Pastor shares the actual district/organization report, we can map each field to an existing definition instead of asking leadership to recount everything by hand.'}</p></div></div></section>
  </main>
}