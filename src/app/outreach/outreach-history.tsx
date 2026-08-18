import { BookOpen,Church,HandHeart,Mail,MapPin,MessageCircle,Phone,StickyNote,UserPlus } from 'lucide-react'
import { formatChurchDate } from '@/lib/church-time'
import { logOutreachInteraction } from './actions'
import styles from './outreach-history.module.css'

const types=[['call','Call'],['text','Text'],['visit','Visit'],['invitation','Invitation'],['bible_study','Bible Study'],['service_attendance','Service Attendance'],['prayer','Prayer'],['follow_up','Follow-up'],['note','Note']] as const
const icon=(type:string)=>{const p={size:13};switch(type){case'call':return <Phone {...p}/>;case'text':return <MessageCircle {...p}/>;case'visit':return <MapPin {...p}/>;case'invitation':return <UserPlus {...p}/>;case'bible_study':return <BookOpen {...p}/>;case'service_attendance':return <Church {...p}/>;case'prayer':return <HandHeart {...p}/>;case'follow_up':return <Mail {...p}/>;default:return <StickyNote {...p}/>}}
const label=(type:string)=>types.find(([v])=>v===type)?.[1]??type.replaceAll('_',' ')
const personName=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church member'

export function OutreachHistory({contactId,interactions,timeZone}:{contactId:string;interactions:any[];timeZone:string}){
  return <details className={styles.panel}><summary><StickyNote size={13}/> Follow-up history • {interactions.length} entr{interactions.length===1?'y':'ies'}</summary>
    <form action={logOutreachInteraction} className={styles.form}><input type="hidden" name="contact_id" value={contactId}/><label><span>Interaction</span><select name="interaction_type" defaultValue="follow_up">{types.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><label><span>Bible study lesson</span><input type="number" min="0" name="bible_study_lesson" placeholder="#"/></label><label><span>What happened?</span><input name="summary" required maxLength={2000} placeholder="Called, prayed, scheduled Lesson 2…"/></label><button>Log interaction</button></form>
    {interactions.length?<div className={styles.timeline}>{interactions.slice(0,8).map((row:any)=>{const p=Array.isArray(row.profiles)?row.profiles[0]:row.profiles;return <div className={styles.event} key={row.id}><div className={styles.icon}>{icon(row.interaction_type)}</div><div className={styles.eventBody}><div className={styles.eventHead}><strong>{label(row.interaction_type)}</strong><time>{formatChurchDate(row.occurred_at,timeZone,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})}</time></div><p>{row.summary}</p><div className={styles.eventMeta}>{personName(p)}{row.bible_study_lesson!=null?` • Lesson ${row.bible_study_lesson}`:''}</div></div></div>})}</div>:<div className={styles.empty}>No logged interactions yet. The first follow-up you record will appear here.</div>}
  </details>
}
