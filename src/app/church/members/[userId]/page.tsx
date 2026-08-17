import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen,CheckCircle2,ShieldCheck,Sparkles,UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { updateMilestones } from '../../actions'
import '../../church.css'

const progress=[['not_started','Not started'],['in_progress','In progress'],['completed','Completed'],['waived','Waived']] as const
const teacher=[['not_ready','Not ready'],['training','Training'],['approved','Approved']] as const
const training=[['not_complete','Not complete'],['current','Current'],['expired','Expired']] as const
const yesNo=[['','Unknown'],['yes','Yes'],['no','No']] as const
const boolValue=(v:boolean|null|undefined)=>v===true?'yes':v===false?'no':''
const fmt=(v?:string|null)=>v?new Date(v+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'Not recorded'

function SelectField({label,name,value,options}:{label:string;name:string;value:string;options:readonly(readonly[string,string])[]}){return <label className="record-field"><span>{label}</span><select name={name} defaultValue={value}>{options.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>}
function DateField({label,name,value}:{label:string;name:string;value?:string|null}){return <label className="record-field"><span>{label}</span><input type="date" name={name} defaultValue={value??''}/></label>}

export default async function MemberRecordPage({params,searchParams}:{params:Promise<{userId:string}>;searchParams:Promise<{saved?:string;error?:string}>}){
  const [{userId:targetUserId},query]=await Promise.all([params,searchParams])
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const actorId=claimsData?.claims?.sub
  if(!actorId)redirect('/login')
  const {data:actor}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',actorId).eq('status','active').limit(1).single()
  if(!actor?.church_id||!['pastor','church_admin'].includes(actor.role))redirect('/')
  const {data:membership}=await supabase.from('church_memberships').select('id,role,status,joined_at,created_at').eq('church_id',actor.church_id).eq('user_id',targetUserId).single()
  if(!membership)redirect('/church?error='+encodeURIComponent('Member not found in this church.'))
  const [{data:profile},{data:details},{data:milestones}]=await Promise.all([
    supabase.from('profiles').select('first_name,last_name,display_name,bio').eq('id',targetUserId).single(),
    supabase.from('member_private_details').select('email,phone,address_line1,address_line2,city,state,postal_code,birthday,marriage_anniversary').eq('user_id',targetUserId).single(),
    supabase.from('member_milestones').select('*').eq('church_id',actor.church_id).eq('user_id',targetUserId).single()
  ])
  const church=Array.isArray(actor.churches)?actor.churches[0]:actor.churches as {name?:string}|null
  const name=profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||'Unnamed member'
  const m:any=milestones??{}
  const address=[details?.address_line1,details?.address_line2,[details?.city,details?.state,details?.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', ')||'Not added'
  const completed=[m.first_steps_status,m.salt_series_status,m.soul_winning_status,m.timothys_status,m.school_pastors_status].filter((v:string)=>v==='completed').length

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Verified Member Record</div></div><div className="row"><Link className="ghost" href="/church">← Members</Link><Link className="ghost" href="/">Home</Link></div></header>

    <section className="record-hero card"><div className="member-main"><div className="avatar record-avatar">{name.slice(0,1).toUpperCase()}</div><div><div className="pill">MEMBER RECORD</div><h1>{name}</h1><p className="muted">{membership.role.replaceAll('_',' ')} • {membership.status}</p></div></div><div className="record-score"><strong>{completed}/5</strong><span>core training milestones completed</span></div></section>
    {query.saved&&<div className="notice success">Verified member record saved.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <div className="record-layout"><aside>
      <section className="card record-side"><div className="pill">CONTACT</div><h3>Member information</h3><dl><dt>Email</dt><dd>{details?.email||'Not added'}</dd><dt>Phone</dt><dd>{details?.phone||'Not added'}</dd><dt>Address</dt><dd>{address}</dd><dt>Birthday</dt><dd>{fmt(details?.birthday)}</dd><dt>Anniversary</dt><dd>{fmt(details?.marriage_anniversary)}</dd></dl></section>
      <section className="card record-side"><div className="pill">ACCESS</div><h3>Church membership</h3><dl><dt>Role</dt><dd>{membership.role.replaceAll('_',' ')}</dd><dt>Status</dt><dd>{membership.status}</dd><dt>Joined</dt><dd>{fmt(membership.joined_at)}</dd></dl></section>
    </aside>

    <form action={updateMilestones} className="record-form">
      <input type="hidden" name="church_id" value={actor.church_id}/><input type="hidden" name="user_id" value={targetUserId}/>
      <section className="card record-section"><div className="record-section-head"><div><Sparkles/><div><h2>New Birth</h2><p>Leadership-verified salvation milestones.</p></div></div><span className="verified-label"><ShieldCheck size={14}/> Verified</span></div><div className="record-grid"><SelectField label="Holy Ghost received" name="holy_ghost_received" value={boolValue(m.holy_ghost_received)} options={yesNo}/><DateField label="Holy Ghost date" name="holy_ghost_date" value={m.holy_ghost_date}/><SelectField label="Baptized" name="baptized" value={boolValue(m.baptized)} options={yesNo}/><DateField label="Baptism date" name="baptism_date" value={m.baptism_date}/></div></section>

      <section className="card record-section"><div className="record-section-head"><div><BookOpen/><div><h2>Discipleship</h2><p>Track the member’s path from foundation to evangelism.</p></div></div></div><div className="record-grid"><SelectField label="First Steps" name="first_steps_status" value={m.first_steps_status??'not_started'} options={progress}/><DateField label="First Steps completed" name="first_steps_completed_at" value={m.first_steps_completed_at}/><SelectField label="Salt Series" name="salt_series_status" value={m.salt_series_status??'not_started'} options={progress}/><DateField label="Salt completed" name="salt_series_completed_at" value={m.salt_series_completed_at}/><SelectField label="Effective Soul Winning" name="soul_winning_status" value={m.soul_winning_status??'not_started'} options={progress}/><DateField label="Soul Winning completed" name="soul_winning_completed_at" value={m.soul_winning_completed_at}/><SelectField label="Bible Study Teacher" name="bible_study_teacher_status" value={m.bible_study_teacher_status??'not_ready'} options={teacher}/></div></section>

      <section className="card record-section"><div className="record-section-head"><div><UserRound/><div><h2>Leadership & Training</h2><p>Qualifications, safety training and covenant status.</p></div></div></div><div className="record-grid"><SelectField label="Timothys" name="timothys_status" value={m.timothys_status??'not_started'} options={progress}/><DateField label="Timothys completed" name="timothys_completed_at" value={m.timothys_completed_at}/><SelectField label="School of Pastors" name="school_pastors_status" value={m.school_pastors_status??'not_started'} options={progress}/><DateField label="School of Pastors completed" name="school_pastors_completed_at" value={m.school_pastors_completed_at}/><SelectField label="Child abuse training" name="child_abuse_training_status" value={m.child_abuse_training_status??'not_complete'} options={training}/><DateField label="Child abuse completed" name="child_abuse_completed_at" value={m.child_abuse_completed_at}/><DateField label="Child abuse expires" name="child_abuse_expires_at" value={m.child_abuse_expires_at}/><SelectField label="Sexual harassment training" name="sexual_harassment_training_status" value={m.sexual_harassment_training_status??'not_complete'} options={training}/><DateField label="Harassment completed" name="sexual_harassment_completed_at" value={m.sexual_harassment_completed_at}/><DateField label="Harassment expires" name="sexual_harassment_expires_at" value={m.sexual_harassment_expires_at}/><SelectField label="Covenant current" name="covenant_current" value={boolValue(m.covenant_current)} options={yesNo}/><DateField label="Covenant signed" name="covenant_signed_at" value={m.covenant_signed_at}/></div></section>

      <div className="record-save card"><div><CheckCircle2/><div><strong>Save verified record</strong><span>Changes are restricted to pastors and church admins.</span></div></div><button className="btn" type="submit">Save milestones</button></div>
    </form></div>
  </main>
}
