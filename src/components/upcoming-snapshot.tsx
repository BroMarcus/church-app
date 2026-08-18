import Link from 'next/link'
import { BriefcaseBusiness,CalendarDays,Clock3,Megaphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatChurchDay,formatChurchTime } from '@/lib/church-time'
import styles from './upcoming-snapshot.module.css'

export async function UpcomingSnapshot({churchId,userId}:{churchId:string;userId:string}){
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
  if(event)items.push({href:'/calendar',Icon:CalendarDays,tag:'Next church event',title:event.title,meta:`${formatChurchDay(event.starts_at,tz)} • ${formatChurchTime(event.starts_at,tz)}${event.location?` • ${event.location}`:''}`})
  if(assignment)items.push({href:'/teams',Icon:BriefcaseBusiness,tag:'Next serving assignment',title:assignment.title,meta:`${formatChurchDay(assignment.starts_at,tz)} • ${assignment.call_time?`Call ${formatChurchTime(assignment.call_time,tz)} • `:''}${formatChurchTime(assignment.starts_at,tz)}`})
  if(followup){const name=[followup.first_name,followup.last_name].filter(Boolean).join(' ');const due=followup.follow_up_due_at as string;const overdue=new Date(due).getTime()<Date.now();items.push({href:'/outreach',Icon:Megaphone,tag:overdue?'Follow-up overdue':'Next outreach follow-up',title:name||'Outreach contact',meta:`${overdue?'Was due':'Due'} ${formatChurchDay(due,tz)} • ${formatChurchTime(due,tz)}`})}
  return <section className={styles.wrap}><div className={styles.head}><div><div className="pill">COMING UP FOR YOU</div><h2>Your next responsibilities</h2></div><span className="small muted">Calendar • Teams • Outreach</span></div>{items.length?<div className={styles.grid}>{items.map(({href,Icon,tag,title,meta})=><Link className={`card ${styles.item}`} href={href} key={tag}><div className={styles.icon}><Icon size={16}/></div><div className={styles.copy}><div className={styles.tag}>{tag}</div><strong>{title}</strong><span>{meta}</span></div></Link>)}</div>:<div className={`card ${styles.empty}`}><Clock3 size={13}/> Nothing assigned or scheduled for you right now.</div>}</section>
}
