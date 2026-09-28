import Link from 'next/link'
import {redirect} from 'next/navigation'
import {CalendarCheck,MessageSquareText,Mic2} from 'lucide-react'
import {createClient} from '@/lib/supabase/server'
import {submitFiveSpotRequest} from './actions'
import '../calendar.css'

type Query={lang?:string;submitted?:string;error?:string}
type ChurchRow={name:string|null}
type MembershipRow={church_id:string;churches:ChurchRow|ChurchRow[]|null}
type FiveSpotRequestRow={id:string;scripture:string;title_idea:string;main_thought:string;status:string;leader_feedback:string|null;mentor_user_id:string|null;created_at:string;updated_at:string}
type MentorRow={id:string;display_name:string|null;first_name:string|null;last_name:string|null}

const statuses={
  submitted:['Submitted','Enviado'],
  coaching:['Coaching','Coaching'],
  ready_for_review:['Ready for Review','Listo para Revisión'],
  approved:['Approved','Aprobado'],
  scheduled:['Scheduled','Programado'],
  completed:['Completed','Completado']
} as const

export default async function FiveSpotPage({searchParams}:{searchParams:Promise<Query>}){
  const query=await searchParams
  const lang=query.lang==='es'?'es':'en',es=lang==='es'
  const t=(en:string,sp:string)=>es?sp:en
  const l=(path:string)=>es?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:membershipData}=await supabase.from('church_memberships').select('church_id,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  const membership=membershipData as MembershipRow|null
  if(!membership?.church_id)redirect('/')
  const church=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const {data:requestData}=await supabase.from('five_spot_requests').select('id,scripture,title_idea,main_thought,status,leader_feedback,mentor_user_id,created_at,updated_at').eq('church_id',membership.church_id).eq('requester_user_id',userId).order('created_at',{ascending:false}).limit(20)
  const requests=(requestData??[]) as FiveSpotRequestRow[]

  const mentorIds=Array.from(new Set(requests.map(request=>request.mentor_user_id).filter((id):id is string=>Boolean(id))))
  let mentors:MentorRow[]=[]
  if(mentorIds.length){const {data}=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',mentorIds);mentors=(data??[]) as MentorRow[]}
  const mentorById=new Map(mentors.map(mentor=>[mentor.id,mentor.display_name||[mentor.first_name,mentor.last_name].filter(Boolean).join(' ')]))

  return <main className="shell">
    <header className="topbar"><div><Link href={l('/')} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t('Your Church','Tu Iglesia')} • 5 Spot</div></div><div className="row"><Link className="ghost" href="/calendar/five-spot?lang=en">English</Link><Link className="ghost" href="/calendar/five-spot?lang=es">Español</Link><Link className="ghost" href={l('/calendar/my')}>{t('My Schedule','Mi Horario')}</Link><Link className="ghost" href={l('/calendar')}>← {t('Calendar','Calendario')}</Link></div></header>

    <section className="calendar-hero card"><div><div className="pill"><Mic2 size={12}/> {t('PREACHING DEVELOPMENT','DESARROLLO DE PREDICACIÓN')}</div><h1>{t('Request a 5 Spot','Solicitar un 5 Spot')}</h1><p className="muted">{t('Share the message idea you are working on. Leadership can coach it, review it, approve it, and then connect it to a real service date.','Comparte la idea del mensaje que estás preparando. Liderazgo puede orientarla, revisarla, aprobarla y luego conectarla a una fecha real de servicio.')}</p></div></section>

    {query.submitted&&<div className="notice success">{t('Your 5 Spot request was submitted.','Tu solicitud de 5 Spot fue enviada.')}</div>}
    {query.error&&<div className="notice error">{query.error}</div>}

    <section className="card" style={{padding:18,marginBottom:18}}>
      <div className="pill">{t('NEW REQUEST','NUEVA SOLICITUD')}</div>
      <form action={submitFiveSpotRequest} style={{marginTop:12}}>
        <input type="hidden" name="lang" value={lang}/>
        <label className="field"><span>{t('Scripture','Escritura')}</span><input name="scripture" required maxLength={500} placeholder={t('Example: 1 Corinthians 15:58','Ejemplo: 1 Corintios 15:58')}/></label>
        <label className="field"><span>{t('Title / Idea','Título / Idea')}</span><input name="title_idea" required maxLength={160}/></label>
        <label className="field"><span>{t('Main Thought','Pensamiento Principal')}</span><textarea name="main_thought" required rows={3} maxLength={2000}/></label>
        <label className="field"><span>{t('Short Outline','Bosquejo Corto')}</span><textarea name="short_outline" required rows={6} maxLength={6000} placeholder={t('Opening • Main point • Scripture application • Close','Apertura • Punto principal • Aplicación bíblica • Cierre')}/></label>
        <label className="field"><span>{t('Notes (optional)','Notas (opcional)')}</span><textarea name="notes" rows={2}/></label>
        <button className="btn">{t('Submit 5 Spot','Enviar 5 Spot')}</button>
      </form>
    </section>

    <section className="card" style={{padding:18}}>
      <div className="row" style={{justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div><div className="pill"><CalendarCheck size={12}/> {t('MY 5 SPOTS','MIS 5 SPOTS')}</div><h2 style={{margin:'8px 0 0'}}>{t('Progress','Progreso')}</h2></div><span className="small muted">{t('Submitted → Coaching → Ready for Review → Approved → Scheduled → Completed','Enviado → Coaching → Listo para Revisión → Aprobado → Programado → Completado')}</span></div>
      <div style={{display:'grid',gap:10,marginTop:14}}>
        {requests.map(request=>{const label=statuses[request.status as keyof typeof statuses]??[request.status,request.status];return <article key={request.id} className="quick-assignment"><div className="quick-assignment-context"><div><strong>{request.title_idea}</strong><div className="small muted">{request.scripture}</div></div><span className="pill">{es?label[1]:label[0]}</span></div>{request.mentor_user_id&&<p className="small"><strong>{t('Mentor','Mentor')}:</strong> {mentorById.get(request.mentor_user_id)??t('Assigned leader','Líder asignado')}</p>}{request.leader_feedback&&<div className="notice" style={{marginBottom:0}}><MessageSquareText size={13}/> <strong>{t('Leader feedback','Comentarios de liderazgo')}:</strong> {request.leader_feedback}</div>}</article>})}
        {!requests.length&&<p className="muted">{t('You have not submitted a 5 Spot yet.','Todavía no has enviado un 5 Spot.')}</p>}
      </div>
    </section>
  </main>
}
