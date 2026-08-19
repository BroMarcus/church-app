import Link from 'next/link'
import { BriefcaseBusiness,CalendarDays,Clock3,Megaphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatChurchDay,formatChurchTime } from '@/lib/church-time'
import styles from './upcoming-snapshot.module.css'

export async function UpcomingSnapshot({churchId,userId,lang='en'}:{churchId:string;userId:string;lang?:'en'|'es'}){
  const es=lang==='es',t=(en:string,sp:string)=>es?sp:en,l=(path:string)=>es?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const supabase=await createClient()
  const now=new Date().toISOString()
  const [{data:church},{data:event},{data:assignment},{data:followup}]=await Promise.all([
    supabase.from('churches').select('timezone').eq('id',churchId).single(),
    supabase.from('events').select('id,title,starts_at,location').eq('church_id',churchId).gte('starts_at',now).order('starts_at').limit(1).maybeSingle(),
    supabase.from('team_assignments').select('id,title,starts_at,call_time').eq('church_id',churchId).eq('assigned_user_id',userId).gte('starts_at',now).order('starts_at').limit(1).maybeSingle(),
    supabase.from('outreach_contacts').select('id,first_name,last_name,follow_up_due_at,stage').eq('church_id',churchId).eq('assigned_to',userId).not('follow_up_due_at','is',null).not('stage','in','("inactive","serving")').order('follow_up_due_at').limit(1).maybeSingle()
  ])
  const tz=church?.timezone||'America/Los_Angeles'
  const items:any[]=[]
  if(event)items.push({href:l('/calendar'),Icon:CalendarDays,tag:t('Next church event','Próximo evento de la iglesia'),title:event.title,meta:`${formatChurchDay(event.starts_at,tz)} • ${formatChurchTime(event.starts_at,tz)}${event.location?` • ${event.location}`:''}`})
  if(assignment)items.push({href:l('/teams'),Icon:BriefcaseBusiness,tag:t('Next serving assignment','Próxima asignación de servicio'),title:assignment.title,meta:`${formatChurchDay(assignment.starts_at,tz)} • ${assignment.call_time?`${t('Call','Llegada')} ${formatChurchTime(assignment.call_time,tz)} • `:''}${formatChurchTime(assignment.starts_at,tz)}`})
  if(followup){const name=[followup.first_name,followup.last_name].filter(Boolean).join(' ');const due=followup.follow_up_due_at as string;const overdue=new Date(due).getTime()<Date.now();items.push({href:l('/outreach'),Icon:Megaphone,tag:overdue?t('Follow-up overdue','Seguimiento atrasado'):t('Next outreach follow-up','Próximo seguimiento'),title:name||t('Outreach contact','Contacto de evangelismo'),meta:`${overdue?t('Was due','Venció'):t('Due','Vence')} ${formatChurchDay(due,tz)} • ${formatChurchTime(due,tz)}`})}
  return <section className={styles.wrap}><div className={styles.head}><div><div className="pill">{t('COMING UP FOR YOU','LO QUE VIENE PARA TI')}</div><h2>{t('Your next responsibilities','Tus próximas responsabilidades')}</h2></div><span className="small muted">{t('Calendar • Teams • Outreach','Calendario • Equipos • Evangelismo')}</span></div>{items.length?<div className={styles.grid}>{items.map(({href,Icon,tag,title,meta})=><Link className={`card ${styles.item}`} href={href} key={tag}><div className={styles.icon}><Icon size={16}/></div><div className={styles.copy}><div className={styles.tag}>{tag}</div><strong>{title}</strong><span>{meta}</span></div></Link>)}</div>:<div className={`card ${styles.empty}`}><Clock3 size={13}/> {t('Nothing assigned or scheduled for you right now.','No tienes nada asignado o programado ahora.')}</div>}</section>
}