import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Activity,BookOpen,HeartHandshake,Languages,Leaf,ShieldCheck,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

const categoryMeta=(key:string,es:boolean)=>({people:[Users,es?'Personas':'People'],new_birth:[HeartHandshake,es?'Nuevo Nacimiento':'New Birth'],discipleship:[BookOpen,es?'Discipulado':'Discipleship'],outreach:[Leaf,es?'Evangelismo':'Outreach'],groups:[Users,es?'Grupos':'Groups'],serving:[ShieldCheck,es?'Servicio':'Serving'],leadership:[Activity,es?'Liderazgo':'Leadership']} as Record<string,[any,string]>)[key]||[Activity,key]
const pct=(value:number,denominator:number|null)=>denominator&&denominator>0?Math.round(value/denominator*100):null

export default async function ChurchHealthPage({searchParams}:{searchParams:Promise<{lang?:string;days?:string}>}){
  const params=await searchParams,es=params.lang==='es',lang=es?'es':'en'
  const days=Math.min(365,Math.max(7,Number.parseInt(params.days||'30',10)||30))
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
  const {data:metrics,error}=await supabase.rpc('church_health_snapshot',{p_church_id:membership.church_id,p_days:days})
  if(error)throw new Error(error.message)
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const grouped=new Map<string,any[]>();for(const row of metrics??[]){const list=grouped.get(row.category)??[];list.push(row);grouped.set(row.category,list)}
  const order=['people','new_birth','discipleship','outreach','groups','serving','leadership']
  const byKey=new Map((metrics??[]).map((m:any)=>[m.metric_key,m]))
  const members=Number((byKey.get('formal_members') as any)?.value||0),guests=Number((byKey.get('guest_accounts') as any)?.value||0),attendees=Number((byKey.get('regular_attendees') as any)?.value||0),overdue=Number((byKey.get('overdue_followup') as any)?.value||0),firstSteps=Number((byKey.get('first_steps_complete') as any)?.value||0),newBirth=Number((byKey.get('new_birth_complete') as any)?.value||0)
  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {es?'Salud de la Iglesia':'Church Health'}</div></div><div className="row"><Languages size={14}/><Link className="ghost" href={`/church/health?days=${days}&lang=en`}>English</Link><Link className="ghost" href={`/church/health?days=${days}&lang=es`}>Español</Link><Link className="ghost" href={l('/church/group-growth')}>{es?'Crecimiento de Grupos':'Group Growth'}</Link><Link className="ghost" href="/">{es?'← Inicio':'← Home'}</Link></div></header>

    <section className="card" style={{padding:26,marginBottom:18}}><div className="pill">{es?'UNA SOLA FUENTE DE VERDAD':'ONE SOURCE OF TRUTH'}</div><h1>{es?'¿Estamos alcanzando, discipulando y desarrollando personas?':'Are we reaching, discipling and developing people?'}</h1><p className="muted">{es?'Este tablero separa acceso a la aplicación de membresía formal y usa las mismas definiciones para todos los números principales.':'This dashboard separates app access from formal membership and uses the same definitions for every core number.'}</p><div className="row" style={{gap:10,flexWrap:'wrap',marginTop:14}}><span className="pill">{members} {es?'MIEMBROS':'MEMBERS'}</span><span className="pill">{attendees} {es?'ASISTENTES':'ATTENDEES'}</span><span className="pill">{guests} {es?'INVITADOS CON CUENTA':'GUEST ACCOUNTS'}</span><span className={`pill ${overdue?'urgent':''}`}>{overdue} {es?'SEGUIMIENTOS VENCIDOS':'OVERDUE FOLLOW-UPS'}</span></div></section>

    <form className="card" style={{padding:14,marginBottom:18}}><div className="row" style={{gap:10,alignItems:'end',flexWrap:'wrap'}}><label className="field"><span>{es?'Ventana para actividad reciente':'Recent activity window'}</span><select name="days" defaultValue={String(days)}><option value="30">30 {es?'días':'days'}</option><option value="60">60 {es?'días':'days'}</option><option value="90">90 {es?'días':'days'}</option><option value="180">180 {es?'días':'days'}</option><option value="365">365 {es?'días':'days'}</option></select></label>{es&&<input type="hidden" name="lang" value="es"/>}<button className="ghost">{es?'Actualizar':'Update'}</button></div></form>

    <section className="card" style={{padding:18,marginBottom:18}}><div className="pill">{es?'LECTURA RÁPIDA':'QUICK READ'}</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginTop:12}}><div><strong style={{fontSize:30}}>{pct(newBirth,members)??0}%</strong><div className="small muted">{es?'de miembros con bautismo + Espíritu Santo verificados':'of Members with baptism + Holy Ghost verified'}</div></div><div><strong style={{fontSize:30}}>{pct(firstSteps,members)??0}%</strong><div className="small muted">{es?'de miembros con First Steps completo':'of Members with First Steps complete'}</div></div><div><strong style={{fontSize:30}}>{guests+attendees}</strong><div className="small muted">{es?'personas conectadas a la aplicación que todavía no son Miembros formales':'people using the app who are not yet formal Members'}</div></div><div><strong style={{fontSize:30}}>{overdue}</strong><div className="small muted">{es?'personas que necesitan seguimiento ahora':'people needing follow-up now'}</div></div></div></section>

    <section style={{display:'grid',gap:18}}>{order.map(category=>{const rows=grouped.get(category)??[];if(!rows.length)return null;const [Icon,title]=categoryMeta(category,es);return <section className="card" style={{padding:20}} key={category}><div className="row" style={{gap:9,alignItems:'center',marginBottom:12}}><Icon size={20}/><div><div className="pill">{title.toUpperCase()}</div></div></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(205px,1fr))',gap:12}}>{rows.map((m:any)=>{const percentage=pct(Number(m.value||0),m.denominator==null?null:Number(m.denominator));return <div key={m.metric_key} style={{padding:14,border:'1px solid var(--line)',borderRadius:13}}><div className="small muted">{m.label}</div><strong style={{fontSize:30,display:'block',margin:'4px 0'}}>{m.value}{percentage!=null?<span style={{fontSize:14,fontWeight:600}}>{` • ${percentage}%`}</span>:''}</strong><div className="small muted">{m.detail}</div></div>})}</div></section>})}</section>

    <section className="card" style={{padding:18,marginTop:18}}><div className="pill">{es?'NO SOLO UN PUNTAJE':'NOT JUST ONE SCORE'}</div><p className="muted" style={{marginBottom:0}}>{es?'Kingdom Network no intenta reducir la salud de la iglesia a un número mágico. Mira las señales por separado: alcance, nuevo nacimiento, discipulado, grupos, servicio y desarrollo de liderazgo.':'Kingdom Network does not reduce church health to one magic score. Read the signals separately: outreach, new birth, discipleship, groups, serving and leadership development.'}</p></section>
  </main>
}
