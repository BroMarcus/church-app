import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle,BookOpen,CalendarClock,Mail,Phone,UserPlus } from 'lucide-react'
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
  const now=Date.now()
  const rawRows=contacts??[]
  const isOverdue=(c:any)=>Boolean(c.follow_up_due_at&&new Date(c.follow_up_due_at).getTime()<now&&c.stage!=='inactive'&&c.stage!=='serving')
  const rows=[...rawRows].sort((a:any,b:any)=>{
    const ao=isOverdue(a),bo=isOverdue(b)
    if(ao!==bo)return ao?-1:1
    const ad=a.follow_up_due_at?new Date(a.follow_up_due_at).getTime():Number.MAX_SAFE_INTEGER
    const bd=b.follow_up_due_at?new Date(b.follow_up_due_at).getTime():Number.MAX_SAFE_INTEGER
    if(ad!==bd)return ad-bd
    return new Date(b.updated_at).getTime()-new Date(a.updated_at).getTime()
  })
  const contactIds=rows.map((c:any)=>c.id)
  let interactions:any[]=[]
  if(contactIds.length){const r=await supabase.from('outreach_interactions').select('id,contact_id,interaction_type,occurred_at,summary,bible_study_lesson,recorded_by,profiles:recorded_by(display_name,first_name,last_name)').in('contact_id',contactIds).order('occurred_at',{ascending:false});interactions=r.data??[]}
  const interactionMap=new Map<string,any[]>();for(const item of interactions){const list=interactionMap.get(item.contact_id)??[];list.push(item);interactionMap.set(item.contact_id,list)}
  const count=(...keys:string[])=>rows.filter((c:any)=>keys.includes(c.stage)).length
  const overdueCount=rows.filter(isOverdue).length
  const localStamp=(v:string)=>formatChurchDate(v,timeZone,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Evangelism & Follow-Up • {timeZone.replaceAll('_',' ')}</div></div><Link className="ghost" href="/">← Home</Link></header>
    <section className="outreach-hero card"><div><div className="pill">PEOPLE WE'RE REACHING</div><h1>Evangelism & Follow-Up</h1><p className="muted">Get people into the system quickly, then keep the relationship moving from first contact through discipleship and serving.</p></div><div className="hero-stat"><strong>{rows.length}</strong><span>people we're reaching</span></div></section>
    {query.created&&<div className="notice success">Person added. A follow-up is now in the queue.</div>}{query.saved&&<div className="notice success">Outreach record updated.</div>}{query.interaction&&<div className="notice success">Interaction logged and the person's follow-up record was updated.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <section className="pipeline-stats"><div className="card pipeline-stat"><strong>{overdueCount}</strong><span>Follow-ups overdue</span></div><div className="card pipeline-stat"><strong>{count('new_contact','invited')}</strong><span>New / invited</span></div><div className="card pipeline-stat"><strong>{count('guest','regular_attendee')}</strong><span>Guests / attending</span></div><div className="card pipeline-stat"><strong>{count('bible_study')}</strong><span>Bible studies</span></div><div className="card pipeline-stat"><strong>{count('baptized','holy_ghost','first_steps')}</strong><span>Discipleship</span></div><div className="card pipeline-stat"><strong>{count('connected','serving')}</strong><span>Connected / serving</span></div></section>

    {overdueCount>0&&<div className="notice error" style={{display:'flex',alignItems:'center',gap:8}}><AlertTriangle size={16}/><strong>{overdueCount} follow-up{overdueCount===1?' is':'s are'} overdue.</strong> They are moved to the top of this page automatically.</div>}

    <div className="outreach-layout"><section className="contact-list">{rows.map((c:any)=>{const owner=personName(pm.get(c.assigned_to));const overdue=isOverdue(c);return <article className="card contact-card" key={c.id}>
      <div className="contact-head"><div className="contact-name"><div className="avatar">{c.first_name.slice(0,1).toUpperCase()}</div><div><strong>{[c.first_name,c.last_name].filter(Boolean).join(' ')}</strong><div className="small muted">Assigned to {owner}</div></div></div><span className="stage-chip">{stageLabel(c.stage)}</span></div>
      <div className="contact-meta">{c.phone&&<span><Phone size={12}/>{c.phone}</span>}{c.email&&<span><Mail size={12}/>{c.email}</span>}{c.bible_study_interest&&<span><BookOpen size={12}/>Bible study interest</span>}{c.follow_up_due_at&&<span className={overdue?'followup-due':''}><CalendarClock size={12}/>{overdue?'Follow-up overdue':'Follow up'} {localStamp(c.follow_up_due_at)}</span>}</div>
      <form action={updateOutreachContact} className="contact-form"><input type="hidden" name="id" value={c.id}/><label className="field"><span>Stage</span><select name="stage" defaultValue={c.stage}>{stages.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><label className="field"><span>Follow-up owner</span><select name="assigned_to" defaultValue={c.assigned_to??''}><option value="">Unassigned</option>{options.map((m:any)=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label className="field"><span>Services attended</span><input type="number" min="0" name="service_count" defaultValue={c.service_count??0}/></label><label className="field"><span>Bible study lesson</span><input type="number" min="0" name="bible_study_lesson" defaultValue={c.bible_study_lesson??''}/></label><label className="field"><span>Follow-up due ({timeZone.replaceAll('_',' ')})</span><input type="datetime-local" name="follow_up_due_at" defaultValue={toChurchDateTimeLocal(c.follow_up_due_at,timeZone)}/></label><label className="field"><span>Last contacted ({timeZone.replaceAll('_',' ')})</span><input type="datetime-local" name="last_contacted_at" defaultValue={toChurchDateTimeLocal(c.last_contacted_at,timeZone)}/></label><label className="field wide"><span>Prayer request</span><input name="prayer_request" defaultValue={c.prayer_request??''}/></label><label className="field wide"><span>Private follow-up notes</span><textarea name="notes" rows={3} defaultValue={c.notes??''}/></label><div className="checkrow wide"><label><input type="checkbox" name="bible_study_interest" defaultChecked={c.bible_study_interest}/> Bible study interest</label><label><input type="checkbox" name="messaging_consent" defaultChecked={c.messaging_consent}/> Messaging consent recorded</label></div><div className="wide"><button className="btn">Save follow-up</button></div></form>
      <OutreachHistory contactId={c.id} interactions={interactionMap.get(c.id)??[]} timeZone={timeZone}/>
    </article>})}{!rows.length&&<div className="card outreach-empty"><h3>No one is in Evangelism yet.</h3><p className="muted">Add a guest or person you are working with. Kingdom Network will put the first follow-up in the queue automatically.</p></div>}</section>

    <aside><section className="card create-outreach"><div className="pill">QUICK ADD</div><h2>Get their foot in the door.</h2><p className="small muted">Start with only what you know. If you leave the follow-up time blank, Kingdom Network automatically puts this person in your 24-hour follow-up queue.</p><form action={createOutreachContact}><input type="hidden" name="church_id" value={churchId}/><label className="field"><span>How did they connect?</span><select name="stage" defaultValue="guest"><option value="guest">Guest / attended</option><option value="new_contact">New contact</option><option value="invited">Invited</option><option value="bible_study">Already in a Bible study</option></select></label><div className="row"><label className="field" style={{flex:1}}><span>First name</span><input name="first_name" required/></label><label className="field" style={{flex:1}}><span>Last name</span><input name="last_name"/></label></div><label className="field"><span>Phone</span><input name="phone" type="tel"/></label><label className="field"><span>Email</span><input name="email" type="email"/></label><label className="checkrow"><input type="checkbox" name="messaging_consent"/> They gave permission to receive church messages</label><details style={{marginTop:14}}><summary style={{cursor:'pointer',fontWeight:700}}>Add more details now (optional)</summary><div style={{display:'grid',gap:10,marginTop:12}}><label className="field"><span>Follow-up owner</span><select name="assigned_to" defaultValue={userId}>{options.map((m:any)=><option value={m.id} key={m.id}>{m.name}</option>)}</select></label><label className="field"><span>Custom follow-up due</span><input type="datetime-local" name="follow_up_due_at"/></label><label className="field"><span>Prayer request</span><textarea name="prayer_request" rows={3}/></label><label className="field"><span>Private notes</span><textarea name="notes" rows={3}/></label><label className="checkrow"><input type="checkbox" name="bible_study_interest"/> Bible study interest</label></div></details><button className="btn" style={{marginTop:14}}><UserPlus size={15}/> Add person</button></form></section></aside></div>
  </main>
}
