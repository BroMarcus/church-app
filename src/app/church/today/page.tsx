import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertCircle,BriefcaseBusiness,CheckCircle2,Clock3,FileWarning,HandHeart,Languages,MailPlus,ShieldAlert,UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import '../church.css'

const copy={
  en:{title:'Leadership Today',sub:'One place to see what needs attention now. Start at the top and work down.',home:'← Church Admin',allClear:'Nothing urgent is waiting right now.',allClearSub:'Your live leadership queues are clear. You can move on to planned ministry work.',urgent:'DO THIS FIRST',queue:'Today’s leadership queue',queueSub:'Kingdom Network sorts the live work for you.',open:'Open task →',pastoral:'Pastoral care',messages:'Reported private messages',outreach:'Overdue outreach',docs:'Documents to review',expiring:'Documents expiring soon',ministry:'Ministry applications',teams:'Team responses due',invites:'Open invitations',priority:'Priority',language:'Español'},
  es:{title:'Hoy para el liderazgo',sub:'Un solo lugar para ver qué necesita atención ahora. Empieza arriba y sigue hacia abajo.',home:'← Administración',allClear:'No hay nada urgente pendiente ahora.',allClearSub:'Las filas de trabajo del liderazgo están al día. Puedes continuar con el trabajo ministerial planificado.',urgent:'HAZ ESTO PRIMERO',queue:'Tareas de liderazgo para hoy',queueSub:'Kingdom Network organiza el trabajo actual por ti.',open:'Abrir tarea →',pastoral:'Cuidado pastoral',messages:'Mensajes privados reportados',outreach:'Seguimiento atrasado',docs:'Documentos por revisar',expiring:'Documentos por vencer pronto',ministry:'Solicitudes de ministerio',teams:'Respuestas de equipos pendientes',invites:'Invitaciones abiertas',priority:'Prioridad',language:'English'}
} as const

export default async function LeadershipTodayPage({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const params=await searchParams
  const lang=params.lang==='es'?'es':'en'
  const t=copy[lang]
  const l=(p:string)=>lang==='es'?`${p}${p.includes('?')?'&':'?'}lang=es`:p
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:actor}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!actor?.church_id||!['pastor','church_admin'].includes(actor.role))redirect('/')
  const churchId=actor.church_id
  const nowIso=new Date().toISOString()
  const today=new Date().toISOString().slice(0,10)
  const soonDate=new Date(Date.now()+30*86400000).toISOString().slice(0,10)

  const [{count:openCare},{count:openMessageReports},{count:overdueOutreach},{count:pendingDocs},{count:expiringDocs},{count:pendingApplications},{data:teamAssignments},{count:openInvites}]=await Promise.all([
    supabase.from('care_requests').select('*',{count:'exact',head:true}).eq('church_id',churchId).in('status',['new','in_review']),
    supabase.from('message_reports').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('status','open'),
    supabase.from('outreach_contacts').select('*',{count:'exact',head:true}).eq('church_id',churchId).lt('follow_up_due_at',nowIso).not('stage','in','("inactive","serving")'),
    supabase.from('member_documents').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('verification_status','pending'),
    supabase.from('member_documents').select('*',{count:'exact',head:true}).eq('church_id',churchId).gte('expires_at',today).lte('expires_at',soonDate),
    supabase.from('ministry_applications').select('id,ministries!inner(church_id)',{count:'exact',head:true}).eq('ministries.church_id',churchId).in('status',['submitted','under_review']),
    supabase.from('team_assignments').select('id').eq('church_id',churchId).eq('confirmation_required',true).gte('starts_at',nowIso),
    supabase.from('church_invites').select('*',{count:'exact',head:true}).eq('church_id',churchId).is('redeemed_at',null).is('revoked_at',null).gt('expires_at',nowIso)
  ])

  const teamIds=(teamAssignments??[]).map((a:any)=>a.id)
  let responded=new Set<string>()
  if(teamIds.length){const {data}=await supabase.from('team_assignment_responses').select('assignment_id').in('assignment_id',teamIds);responded=new Set((data??[]).map((r:any)=>r.assignment_id))}
  const awaiting=Math.max(0,teamIds.length-responded.size)
  const church:any=Array.isArray(actor.churches)?actor.churches[0]:actor.churches

  const items=[
    {label:t.pastoral,count:openCare??0,href:'/help',Icon:HandHeart,weight:100},
    {label:t.messages,count:openMessageReports??0,href:'/church/message-reports',Icon:ShieldAlert,weight:95},
    {label:t.outreach,count:overdueOutreach??0,href:'/outreach',Icon:AlertCircle,weight:90},
    {label:t.docs,count:pendingDocs??0,href:'/documents',Icon:FileWarning,weight:75},
    {label:t.teams,count:awaiting,href:'/teams',Icon:UserCheck,weight:70},
    {label:t.ministry,count:pendingApplications??0,href:'/serve',Icon:BriefcaseBusiness,weight:65},
    {label:t.expiring,count:expiringDocs??0,href:'/documents',Icon:Clock3,weight:55},
    {label:t.invites,count:openInvites??0,href:'/church/invites',Icon:MailPlus,weight:35}
  ].sort((a,b)=>(b.count>0?b.weight:-1)-(a.count>0?a.weight:-1))
  const active=items.filter(i=>i.count>0)
  const first=active[0]

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {t.title}</div></div><div className="row"><Languages size={15}/><Link className="ghost" href={`/church/today?lang=${lang==='es'?'en':'es'}`}>{t.language}</Link><Link className="ghost" href={l('/church')}>{t.home}</Link></div></header>

    <section className="admin-hero card"><div><div className="pill">{t.urgent}</div><h1>{t.title}</h1><p className="muted">{t.sub}</p>{first&&<Link className="btn" href={l(first.href)}>{first.label} ({first.count}) →</Link>}</div><div className="admin-badge">{active.length?<AlertCircle size={22}/>:<CheckCircle2 size={22}/>}<div><strong>{active.reduce((sum,i)=>sum+i.count,0)}</strong><span>{active.length?`${active.length} ${t.priority.toLowerCase()} ${active.length===1?'area':'areas'}`:t.allClear}</span></div></div></section>

    {!active.length&&<section className="card admin-note"><CheckCircle2 size={24}/><h2>{t.allClear}</h2><p className="muted">{t.allClearSub}</p></section>}

    <div className="section-heading"><div><div className="pill">{t.urgent}</div><h2>{t.queue}</h2></div><span className="small muted">{t.queueSub}</span></div>
    <section className="attention-grid">{items.map(({label,count,href,Icon})=><Link className={`card attention-card ${count>0?'urgent':''}`} href={l(href)} key={label}><div className="attention-icon"><Icon size={17}/></div><div><strong>{count}</strong><span>{label}</span><small style={{display:'block',marginTop:6}}>{t.open}</small></div></Link>)}</section>
  </main>
}
