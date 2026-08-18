import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen,CalendarClock,Mail,Phone,UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatChurchDate,toChurchDateTimeLocal } from '@/lib/church-time'
import { createOutreachContact,updateOutreachContact } from './actions'
import { OutreachHistory } from './outreach-history'
import './outreach.css'

const stages=[['new_contact','New Contact'],['invited','Invited'],['guest','Guest'],['bible_study','Bible Study'],['regular_attendee','Regular Attendee'],['baptized','Baptized'],['holy_ghost','Holy Ghost'],['first_steps','First Steps'],['connected','Connected'],['serving','Serving'],['inactive','Inactive']] as const
const stageLabel=(v:string)=>stages.find(([key])=>key===v)?.[1]??v.replaceAll('_',' ')
const personName=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church member'

export default async function OutreachPage({searchParams}:{searchParams:Promise<{created?:string;saved?:string;interaction?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name,timezone)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const churchId=membership.church_id
  const [{data:contacts},{data:churchMembers}]=await Promise.all([
    supabase.from('outreach_contacts').select('*').eq('church_id',churchId).order('updated_at',{ascending:false}),
    supabase.from('church_memberships').select('user_id,role').eq('church_id',churchId).eq('status','active')
  ])
  const memberIds=(churchMembers??[]).map((m:any)=>m.user_id)
  let profiles:any[]=[]
  if(memberIds.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',memberIds);profiles=r.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p]))
  const options=(churchMembers??[]).map((m:any)=>({id:m.user_id,name:personName(pm.get(m.user_id)),role:m.role})).sort((a:any,b:any)=>a.name.localeCompare(b.name))
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const timeZone=church?.timezone||'UTC'
  const rows=contacts??[]
  const contactIds=rows.map((c:any)=>c.id)
  let interactions:any[]=[]
  if(contactIds.length){const r=await supabase.from('outreach_interactions').select('id,contact_id,interaction_type,occurred_at,summary,bible_study_lesson,recorded_by,profiles:recorded_by(display_name,first_name,last_name)').in('contact_id',contactIds).order('occurred_at',{ascending:false});interactions=r.data??[]}
  const interactionMap=new Map<string,any[]>();for(const item of interactions){const list=interactionMap.get(item.contact_id)??[];list.push(item);interactionMap.set(item.contact_id,list)}
  const count=(...keys:string[])=>rows.filter((c:any)=>keys.includes(c.stage)).length
  const now=Date.now()
  const localStamp=(v:string)=>formatChurchDate(v,timeZone,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Outreach • {timeZone.replaceAll('_',' ')}</div></div><Link className="ghost" href="/">← Home</Link></header>
    <section className="outreach-hero card"><div><div className="pill">PEOPLE WE'RE REACHING</div><h1>Outreach Pipeline</h1><p className="muted">Coordinate follow-up from first invitation through discipleship and serving.</p></div><div className="hero-stat"><strong>{rows.length}</strong><span>people in pipeline</span></div></section>
    {query.created&&<div className="notice success">Outreach contact added.</div>}{query.saved&&<div className="notice success">Outreach record updated.</div>}{query.interaction&&<div className="notice success">Follow-up interaction logged.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <section className="pipeline-stats"><div className="card pipeline-stat"><strong>{count('new_contact','invited')}</strong><span>New / invited</span></div><div className="card pipeline-stat"><strong>{count('guest','regular_attendee')}</strong><span>Guests / attending</span></div><div className="card pipeline-stat"><strong>{count('bible_study')}</strong><span>Bible studies</span></div><div className="card pipeline-stat"><strong>{count('baptized','holy_ghost','first_steps')}</strong><span>Discipleship</span></div><div className="card pipeline-stat"><strong>{count('connected','serving')}</strong><span>Connected / serving</span></div></section>

    <div className="outreach-layout"><section className="contact-list">{rows.map((c:any)=>{const owner=personName(pm.get(c.assigned_to));const due=c.follow_up_due_at?new Date(c.follow_up_due_at):null;const overdue=due&&due.getTime()<now&&c.stage!=='inactive'&&c.stage!=='serving';return <article className="card contact-card" key={c.id}>
      <div className="contact-head"><div className="contact-name"><div className="avatar">{c.first_name.slice(0,1).toUpperCase()}</div><div><strong>{[c.first_name,c.last_name].filter(Boolean).join(' ')}</strong><div className="small muted">Assigned to {owner}</div></div></div><span className="stage-chip">{stageLabel(c.stage)}</span></div>
      <div className="contact-meta">{c.phone&&<span><Phone size={12}/>{c.phone}</span>}{c.email&&<span><Mail size={12}/>{c.email}</span>}{c.bible_study_interest&&<span><BookOpen size={12}/>Bible study interest</span>}{c.follow_up_due_at&&<span className={overdue?'followup-due':''}><CalendarClock size={12}/>{overdue?'Follow-up overdue':'Follow up'} {localStamp(c.follow_up_due_at)}</span>}</div>
      <form action={updateOutreachContact} className="contact-form"><input type="hidden" name="id" value={c.id}/><label className="field"><span>Stage</span><select name="stage" defaultValue={c.stage}>{stages.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><label className="field"><span>Follow-up owner</span><select name="assigned_to" defaultValue={c.assigned_to??''}><option value="">Unassigned</option>{options.map((m:any)=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label className="field"><span>Services attended</span><input type="number" min="0" name="service_count" defaultValue={c.service_count??0}/></label><label className="field"><span>Bible study lesson</span><input type="number" min="0" name="bible_study_lesson" defaultValue={c.bible_study_lesson??''}/></label><label className="field"><span>Follow-up due ({timeZone.replaceAll('_',' ')})</span><input type="datetime-local" name="follow_up_due_at" defaultValue={toChurchDateTimeLocal(c.follow_up_due_at,timeZone)}/></label><label className="field"><span>Last contacted ({timeZone.replaceAll('_',' ')})</span><input type="datetime-local" name="last_contacted_at" defaultValue={toChurchDateTimeLocal(c.last_contacted_at,timeZone)}/></label><label className="field wide"><span>Prayer request</span><input name="prayer_request" defaultValue={c.prayer_request??''}/></label><label className="field wide"><span>Private follow-up notes</span><textarea name="notes" rows={3} defaultValue={c.notes??''}/></label><div className="checkrow wide"><label><input type="checkbox" name="bible_study_interest" defaultChecked={c.bible_study_interest}/> Bible study interest</label><label><input type="checkbox" name="messaging_consent" defaultChecked={c.messaging_consent}/> Messaging consent recorded</label></div><div className="wide"><button className="btn">Save follow-up</button></div></form>
      <OutreachHistory contactId={c.id} interactions={interactionMap.get(c.id)??[]} timeZone={timeZone}/>
    </article>})}{!rows.length&&<div className="card outreach-empty"><h3>No outreach contacts yet.</h3><p className="muted">Add the first person you are praying for, inviting, or following up with.</p></div>}</section>

    <aside><section className="card create-outreach"><div className="pill">ADD PERSON</div><h2>Start a follow-up</h2><p className="small muted">New contacts are private to the inviter/assignee and authorized leaders. Matching name + phone/email records are blocked as likely duplicates. Times are entered in {timeZone.replaceAll('_',' ')}.</p><form action={createOutreachContact}><input type="hidden" name="church_id" value={churchId}/><div className="row"><label className="field" style={{flex:1}}><span>First name</span><input name="first_name" required/></label><label className="field" style={{flex:1}}><span>Last name</span><input name="last_name"/></label></div><label className="field"><span>Phone</span><input name="phone" type="tel"/></label><label className="field"><span>Email</span><input name="email" type="email"/></label><label className="field"><span>Follow-up owner</span><select name="assigned_to" defaultValue={userId}>{options.map((m:any)=><option value={m.id} key={m.id}>{m.name}</option>)}</select></label><label className="field"><span>Follow-up due</span><input type="datetime-local" name="follow_up_due_at"/></label><label className="field"><span>Prayer request</span><textarea name="prayer_request" rows={3}/></label><label className="field"><span>Notes</span><textarea name="notes" rows={3}/></label><div className="checkrow"><label><input type="checkbox" name="bible_study_interest"/> Bible study interest</label><label><input type="checkbox" name="messaging_consent"/> Messaging consent</label></div><button className="btn" style={{marginTop:14}}><UserPlus size={15}/> Add to outreach</button></form></section></aside></div>
  </main>
}
