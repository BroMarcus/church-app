import Link from 'next/link'
import {redirect} from 'next/navigation'
import {Check,Clock,Sparkles,Users} from 'lucide-react'
import {createClient} from '@/lib/supabase/server'
import {formatChurchDate,formatChurchTime} from '@/lib/church-time'
import {claimCleaningTime,completeCleaning,recordCleaningParticipation,setCleaningChecklistItem} from './actions'
import '../calendar.css'

type Query={lang?:string;claimed?:string;participated?:string;completed?:string;error?:string}
type ChurchRow={name:string|null;timezone:string|null}
type MembershipRow={church_id:string;churches:ChurchRow|ChurchRow[]|null}
type GroupRow={id:string;name:string}
type ScheduleItemRow={id:string;title:string;starts_at:string;ends_at:string|null;location:string|null;notes:string|null}
type CleaningRow={id:string;schedule_item_id:string;group_id:string;status:string;claimed_for_at:string|null;claimed_by:string|null;claimed_at:string|null;completed_by:string|null;completed_at:string|null;completion_notes:string|null;groups:GroupRow|GroupRow[]|null;schedule_items:ScheduleItemRow|ScheduleItemRow[]|null}
type ChecklistRow={id:string;cleaning_assignment_id:string;label:string;sort_order:number;required:boolean;completed_by:string|null;completed_at:string|null}
type ParticipantRow={cleaning_assignment_id:string;user_id:string}
type ProfileRow={id:string;display_name:string|null;first_name:string|null;last_name:string|null}

function localInput(iso:string|null,timeZone:string){
  if(!iso)return ''
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date(iso))
  const get=(type:string)=>parts.find(part=>part.type===type)?.value??''
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')==='24'?'00':get('hour')}:${get('minute')}`
}

export default async function CleaningPage({searchParams}:{searchParams:Promise<Query>}){
  const query=await searchParams,lang=query.lang==='es'?'es':'en',es=lang==='es'
  const t=(en:string,sp:string)=>es?sp:en
  const l=(path:string)=>es?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:membershipData}=await supabase.from('church_memberships').select('church_id,churches(name,timezone)').eq('user_id',userId).eq('status','active').limit(1).single()
  const membership=membershipData as MembershipRow|null
  if(!membership?.church_id)redirect('/')
  const church=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const timeZone=church?.timezone||'UTC'

  const {data:cleaningData}=await supabase.from('cleaning_assignments').select('id,schedule_item_id,group_id,status,claimed_for_at,claimed_by,claimed_at,completed_by,completed_at,completion_notes,groups(id,name),schedule_items(id,title,starts_at,ends_at,location,notes)').eq('church_id',membership.church_id).limit(60)
  const cleaning=(cleaningData??[]) as unknown as CleaningRow[]
  cleaning.sort((a,b)=>String((Array.isArray(a.schedule_items)?a.schedule_items[0]:a.schedule_items)?.starts_at??'').localeCompare(String((Array.isArray(b.schedule_items)?b.schedule_items[0]:b.schedule_items)?.starts_at??'')))
  const ids=cleaning.map(row=>row.id)
  let checklist:ChecklistRow[]=[],participants:ParticipantRow[]=[]
  if(ids.length){
    const [{data:checkData},{data:participantData}]=await Promise.all([
      supabase.from('cleaning_checklist_items').select('id,cleaning_assignment_id,label,sort_order,required,completed_by,completed_at').in('cleaning_assignment_id',ids).order('sort_order'),
      supabase.from('cleaning_participants').select('cleaning_assignment_id,user_id').in('cleaning_assignment_id',ids)
    ])
    checklist=(checkData??[]) as ChecklistRow[]
    participants=(participantData??[]) as ParticipantRow[]
  }
  const profileIds=Array.from(new Set([...cleaning.flatMap(row=>[row.claimed_by,row.completed_by]),...checklist.map(item=>item.completed_by),...participants.map(row=>row.user_id)].filter((id):id is string=>Boolean(id))))
  let profiles:ProfileRow[]=[]
  if(profileIds.length){const {data}=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',profileIds);profiles=(data??[]) as ProfileRow[]}
  const profileById=new Map(profiles.map(profile=>[profile.id,profile.display_name||[profile.first_name,profile.last_name].filter(Boolean).join(' ')||t('Member','Miembro')]))
  const participantIdsByCleaning=new Map<string,string[]>()
  for(const participant of participants){const rows=participantIdsByCleaning.get(participant.cleaning_assignment_id)??[];rows.push(participant.user_id);participantIdsByCleaning.set(participant.cleaning_assignment_id,rows)}

  return <main className="shell">
    <header className="topbar"><div><Link href={l('/')} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t('Your Church','Tu Iglesia')} • {t('Cleaning','Limpieza')}</div></div><div className="row"><Link className="ghost" href="/calendar/cleaning?lang=en">English</Link><Link className="ghost" href="/calendar/cleaning?lang=es">Español</Link><Link className="ghost" href={l('/calendar/my')}>{t('My Schedule','Mi Horario')}</Link><Link className="ghost" href={l('/calendar')}>← {t('Calendar','Calendario')}</Link></div></header>

    <section className="calendar-hero card"><div><div className="pill"><Sparkles size={12}/> {t('FRIENDSHIP GROUP CLEANING','LIMPIEZA POR GRUPO DE AMISTAD')}</div><h1>{t('Claim it. Clean it. Check it off.','Resérvalo. Límpialo. Márcalo.')}</h1><p className="muted">{t('Your group sees its assigned cleaning dates here. Claim a time, use the checklist, and record completion so leadership knows it is covered.','Tu grupo ve aquí sus fechas de limpieza asignadas. Reserva una hora, usa la lista y registra la finalización para que liderazgo sepa que está cubierto.')}</p></div></section>

    {query.claimed&&<div className="notice success">{t('Cleaning time claimed.','Hora de limpieza reservada.')}</div>}
    {query.participated&&<div className="notice success">{t('Your participation was recorded.','Tu participación fue registrada.')}</div>}
    {query.completed&&<div className="notice success">{t('Cleaning marked complete. Thank you!','Limpieza marcada como completada. ¡Gracias!')}</div>}
    {query.error&&<div className="notice error">{query.error}</div>}

    <section style={{display:'grid',gap:14}}>
      {cleaning.map(row=>{const item=Array.isArray(row.schedule_items)?row.schedule_items[0]:row.schedule_items;const group=Array.isArray(row.groups)?row.groups[0]:row.groups;const checks=checklist.filter(check=>check.cleaning_assignment_id===row.id);const requiredDone=checks.filter(check=>check.required).every(check=>Boolean(check.completed_at));const participantIds=participantIdsByCleaning.get(row.id)??[];const participated=participantIds.includes(userId);return <article className="card" style={{padding:18}} key={row.id}>
        <div className="quick-assignment-context"><div><div className="pill">{row.status.toUpperCase()}</div><h2 style={{margin:'8px 0 4px'}}>{item?.title??t('Cleaning Day','Día de Limpieza')}</h2><div className="small muted">{group?.name??t('Friendship Group','Grupo de Amistad')}{item?.starts_at?` • ${formatChurchDate(item.starts_at,timeZone,{weekday:'long',month:'short',day:'numeric'})}`:''}{item?.location?` • ${item.location}`:''}</div></div>{row.completed_at&&<span className="pill"><Check size={12}/> {t('Complete','Completado')}</span>}</div>

        {row.status!=='completed'&&row.status!=='cancelled'&&<div style={{marginTop:14}}>
          <form action={claimCleaningTime} className="row" style={{alignItems:'flex-end',flexWrap:'wrap'}}><input type="hidden" name="lang" value={lang}/><input type="hidden" name="cleaning_assignment_id" value={row.id}/><label className="field" style={{flex:'1 1 240px',margin:0}}><span>{t('Cleaning date & time','Fecha y hora de limpieza')}</span><input type="datetime-local" name="claimed_for_at" required defaultValue={localInput(row.claimed_for_at??item?.starts_at??null,timeZone)}/></label><button className="ghost"><Clock size={14}/> {row.claimed_for_at?t('Change claimed time','Cambiar hora'):t('Claim this time','Reservar esta hora')}</button></form>
          {row.claimed_for_at&&<p className="small muted">{t('Claimed for','Reservado para')}: {formatChurchDate(row.claimed_for_at,timeZone,{weekday:'short',month:'short',day:'numeric'})} • {formatChurchTime(row.claimed_for_at,timeZone)}{row.claimed_by?` • ${profileById.get(row.claimed_by)??t('Group member','Miembro del grupo')}`:''}</p>}
        </div>}

        <div style={{marginTop:16}}><div className="pill">{t('CLEANING CHECKLIST','LISTA DE LIMPIEZA')}</div><div className="cleaning-checklist">{checks.map(check=><form action={setCleaningChecklistItem} key={check.id} className={`cleaning-check${check.completed_at?' done':''}`}><input type="hidden" name="lang" value={lang}/><input type="hidden" name="checklist_item_id" value={check.id}/><input type="hidden" name="completed" value={check.completed_at?'false':'true'}/><button disabled={row.status==='completed'||row.status==='cancelled'}><span className="cleaning-box">{check.completed_at?<Check size={14}/>:null}</span><span>{check.label}{!check.required&&<small> {t('(optional)','(opcional)')}</small>}</span></button>{check.completed_by&&<small>{profileById.get(check.completed_by)??t('Member','Miembro')}</small>}</form>)}</div>{!checks.length&&<p className="muted">{t('Leadership has not added a checklist yet.','Liderazgo todavía no ha agregado una lista.')}</p>}</div>

        <div className="cleaning-participation"><div><strong><Users size={14}/> {t('Who cleaned','Quién limpió')}</strong><div className="small muted">{participantIds.length?participantIds.map(id=>profileById.get(id)??t('Member','Miembro')).join(', '):t('No participants recorded yet.','Todavía no hay participantes registrados.')}</div></div>{row.status!=='completed'&&!participated&&<form action={recordCleaningParticipation}><input type="hidden" name="lang" value={lang}/><input type="hidden" name="cleaning_assignment_id" value={row.id}/><button className="ghost">{t('I helped clean','Yo ayudé a limpiar')}</button></form>}</div>

        {row.status!=='completed'&&row.status!=='cancelled'&&<form action={completeCleaning} className="cleaning-complete"><input type="hidden" name="lang" value={lang}/><input type="hidden" name="cleaning_assignment_id" value={row.id}/><label className="field"><span>{t('Completion notes (optional)','Notas de finalización (opcional)')}</span><input name="completion_notes" placeholder={t('Anything leadership should know','Algo que liderazgo deba saber')}/></label><button className="btn" disabled={!requiredDone}>{requiredDone?t('Mark Cleaning Complete','Marcar Limpieza Completada'):t('Finish required checklist first','Primero completa la lista requerida')}</button></form>}
        {row.completed_at&&<div className="notice success" style={{marginBottom:0}}>{t('Completed','Completado')} {formatChurchDate(row.completed_at,timeZone,{month:'short',day:'numeric'})} • {formatChurchTime(row.completed_at,timeZone)} {row.completed_by?`• ${profileById.get(row.completed_by)??t('Member','Miembro')}`:''}{row.completion_notes&&<div className="small">{row.completion_notes}</div>}</div>}
      </article>})}
      {!cleaning.length&&<div className="card empty"><h3>{t('No cleaning assignments are waiting for you.','No hay asignaciones de limpieza pendientes para ti.')}</h3><p className="muted">{t('When your Friendship Group is placed in the cleaning rotation, it will appear here.','Cuando tu Grupo de Amistad sea puesto en la rotación de limpieza, aparecerá aquí.')}</p></div>}
    </section>
  </main>
}
