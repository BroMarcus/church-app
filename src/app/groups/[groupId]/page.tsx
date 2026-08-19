import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays,FileText,UserPlus,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { addGroupMember,submitGroupReport } from '../actions'
import { GroupSettings } from './group-settings'
import { JoinRequests } from './join-requests'
import '../groups.css'

const fmtDate=(v:string)=>new Date(v+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})
const personName=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church member'

export default async function GroupDetailPage({params,searchParams}:{params:Promise<{groupId:string}>;searchParams:Promise<{error?:string;reported?:string;guests_added?:string;guest_duplicates?:string;milestones_queued?:string;member?:string;details?:string;private?:string;requested?:string;cancelled?:string;reviewed?:string}>}){
  const [{groupId},query]=await Promise.all([params,searchParams])
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')
  const {data:churchMembership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!churchMembership?.church_id)redirect('/')
  const {data:groupResult}=await supabase.from('groups').select('*').eq('id',groupId).eq('church_id',churchMembership.church_id).single()
  const group:any=groupResult
  if(!group)redirect('/groups?error='+encodeURIComponent('Group not found.'))
  const isAdmin=['pastor','church_admin'].includes(churchMembership.role)

  const membershipResult=await supabase.from('group_memberships').select('group_id,user_id,role,joined_at').eq('group_id',groupId).order('joined_at')
  const roster:any[]=membershipResult.data??[]
  const myGroupMembership=roster.find((r:any)=>r.user_id===userId)
  const canManage=isAdmin||group.leader_id===userId||myGroupMembership?.role==='leader'
  const canReport=canManage||myGroupMembership?.role==='assistant'
  const canViewPrivate=isAdmin||group.leader_id===userId||Boolean(myGroupMembership)

  const [myRequestResult,leaderRequestResult]=await Promise.all([
    !myGroupMembership&&!canManage?supabase.from('group_join_requests').select('id,status,created_at,message').eq('group_id',groupId).eq('user_id',userId).eq('status','pending').order('created_at',{ascending:false}).limit(1).maybeSingle():Promise.resolve({data:null}),
    canManage?supabase.from('group_join_requests').select('id,user_id,status,created_at,message').eq('group_id',groupId).eq('status','pending').order('created_at'):Promise.resolve({data:[] as any[]})
  ])
  const myPending=(myRequestResult as any).data??null
  let leaderRequests:any[]=(leaderRequestResult as any).data??[]

  const rosterIds=roster.map(r=>r.user_id)
  const requestIds=leaderRequests.map((r:any)=>r.user_id)
  const profileIds=Array.from(new Set([...rosterIds,...requestIds,group.leader_id].filter(Boolean)))
  let profiles:any[]=[]
  if(profileIds.length){const result=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',profileIds);profiles=result.data??[]}
  const pm=new Map(profiles.map(p=>[p.id,p]))
  leaderRequests=leaderRequests.map((r:any)=>({...r,profiles:pm.get(r.user_id)}))

  let reports:any[]=[]
  if(canReport){const result=await supabase.from('group_reports').select('*').eq('group_id',groupId).order('meeting_date',{ascending:false}).limit(12);reports=result.data??[]}

  let privateDetails:any=null
  if(canViewPrivate){const result=await supabase.from('group_private_details').select('meeting_address,access_notes').eq('group_id',groupId).maybeSingle();privateDetails=result.data??null}

  let available:any[]=[]
  if(canManage){
    const churchMembersResult=await supabase.from('church_memberships').select('user_id').eq('church_id',churchMembership.church_id).eq('status','active')
    const churchIds=(churchMembersResult.data??[]).map((m:any)=>m.user_id)
    const missing=churchIds.filter((id:string)=>!rosterIds.includes(id))
    if(missing.length){const result=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',missing);available=(result.data??[]).map((p:any)=>({id:p.id,name:personName(p)})).sort((a:any,b:any)=>a.name.localeCompare(b.name))}
  }
  const church=Array.isArray(churchMembership.churches)?churchMembership.churches[0]:churchMembership.churches as any
  const latest=reports[0]
  const groupWithCount={...group,member_count:roster.length}

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Groups</div></div><div className="row"><Link className="ghost" href="/groups">← All groups</Link><Link className="ghost" href="/">Home</Link></div></header>
    <section className="group-detail-hero card"><div><div className="pill">{String(group.group_type).replaceAll('_',' ').toUpperCase()}</div><h1>{group.name}</h1><p className="muted">{group.description||'Church community group'}</p><div className="group-detail-meta"><span><Users size={15}/>{roster.length} members</span><span><CalendarDays size={15}/>{group.meeting_day||'Schedule TBD'} {group.meeting_time?String(group.meeting_time).slice(0,5):''}</span>{latest&&<span><FileText size={15}/>Last report {fmtDate(latest.meeting_date)}</span>}</div></div>{canManage?<div className="leader-badge">Leader tools enabled</div>:canReport?<div className="leader-badge">Assistant reporting enabled</div>:null}</section>
    {query.reported&&<div className="notice success">Group report submitted.{query.guests_added?` ${query.guests_added} guest${query.guests_added==='1'?'':'s'} added to Evangelism follow-up.`:''}{query.milestones_queued?` ${query.milestones_queued} named spiritual milestone${query.milestones_queued==='1'?'':'s'} sent for leadership verification.`:''}</div>}{query.guest_duplicates&&<div className="notice">{query.guest_duplicates} named guest{query.guest_duplicates==='1'?' was':'s were'} already in Evangelism, so no duplicate record was created.</div>}{query.member&&<div className="notice success">Member added to group.</div>}{query.details&&<div className="notice success">Group details updated.</div>}{query.private&&<div className="notice success">Private meeting details updated.</div>}{query.requested&&<div className="notice success">Your request was sent to group leadership.</div>}{query.cancelled&&<div className="notice success">Your join request was cancelled.</div>}{query.reviewed&&<div className="notice success">Join request reviewed.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <GroupSettings group={groupWithCount} privateDetails={privateDetails} canManage={canManage} canViewPrivate={canViewPrivate}/>
    <JoinRequests group={groupWithCount} churchId={churchMembership.church_id} userIsMember={Boolean(myGroupMembership)||group.leader_id===userId} canManage={canManage} myPending={myPending} leaderRequests={leaderRequests}/>

    <div className="group-layout"><div>
      <section className="card group-section"><div className="section-heading"><div><div className="pill">ROSTER</div><h2>Group members</h2></div><span className="small muted">Leader: {personName(pm.get(group.leader_id))}</span></div><div className="roster">{roster.map((r:any)=>{const p=pm.get(r.user_id);const name=personName(p);return <div className="roster-row" key={r.user_id}><div className="roster-person"><div className="avatar">{name.slice(0,1).toUpperCase()}</div><div><strong>{name}</strong><span>Joined {new Date(r.joined_at).toLocaleDateString()}</span></div></div><span className="role-chip">{r.role}</span></div>})}{!roster.length&&<div className="group-empty">No members have been added yet.</div>}</div>
        {canManage&&<form action={addGroupMember} className="add-member-form" style={{marginTop:14}}><input type="hidden" name="group_id" value={groupId}/><label className="field" style={{margin:0}}><span>Add church member</span><select name="user_id" defaultValue="" required><option value="" disabled>Choose a person</option>{available.map((m:any)=><option value={m.id} key={m.id}>{m.name}</option>)}</select></label><label className="field" style={{margin:0}}><span>Role</span><select name="role" defaultValue="member"><option value="member">Member</option><option value="assistant">Assistant</option><option value="leader">Co-leader</option></select></label><button className="btn"><UserPlus size={15}/> Add</button></form>}
      </section>

      {canReport&&<section className="card group-section group-report"><div className="pill">LEADER REPORT</div><h2>Submit meeting report</h2><form action={submitGroupReport}><input type="hidden" name="group_id" value={groupId}/><div className="report-grid"><label className="field"><span>Meeting date</span><input type="date" name="meeting_date" required/></label><label className="field"><span>Attendance</span><input type="number" min="0" name="attendance_count" defaultValue="0"/></label><label className="field"><span>First-time guests</span><input type="number" min="0" name="first_time_guests" defaultValue="0"/></label><label className="field"><span>Active Bible studies</span><input type="number" min="0" name="active_bible_studies" defaultValue="0"/></label><label className="field"><span>Baptisms</span><input type="number" min="0" name="baptisms" defaultValue="0"/></label><label className="field"><span>Holy Ghost received</span><input type="number" min="0" name="holy_ghost_received" defaultValue="0"/></label></div>
        <div className="card" style={{padding:14,margin:'14px 0',background:'rgba(255,255,255,.03)'}}><div className="pill">NAME THE GUESTS</div><h3 style={{margin:'8px 0 4px'}}>Turn attendance into follow-up</h3><p className="small muted" style={{marginTop:0}}>Add a guest name here and Kingdom Network will create their Evangelism follow-up record automatically, assign it to this group leader, and schedule follow-up within 24 hours. Phone or email is helpful but not required.</p>
          {[1,2,3].map(n=><div className="report-grid" key={n} style={{marginTop:10}}><label className="field"><span>Guest {n} first name</span><input name={`guest_${n}_first_name`} placeholder="First name"/></label><label className="field"><span>Last name</span><input name={`guest_${n}_last_name`} placeholder="Last name"/></label><label className="field"><span>Phone</span><input name={`guest_${n}_phone`} type="tel" placeholder="Optional"/></label><label className="field"><span>Email</span><input name={`guest_${n}_email`} type="email" placeholder="Optional"/></label></div>)}
          <details style={{marginTop:10}}><summary style={{cursor:'pointer',fontWeight:700}}>Add up to 2 more guests</summary>{[4,5].map(n=><div className="report-grid" key={n} style={{marginTop:10}}><label className="field"><span>Guest {n} first name</span><input name={`guest_${n}_first_name`} placeholder="First name"/></label><label className="field"><span>Last name</span><input name={`guest_${n}_last_name`} placeholder="Last name"/></label><label className="field"><span>Phone</span><input name={`guest_${n}_phone`} type="tel" placeholder="Optional"/></label><label className="field"><span>Email</span><input name={`guest_${n}_email`} type="email" placeholder="Optional"/></label></div>)}</details>
        </div>
        <div className="card" style={{padding:14,margin:'14px 0',background:'rgba(255,255,255,.03)'}}><div className="pill">NAME THE MILESTONES</div><h3 style={{margin:'8px 0 4px'}}>Let leadership verify the Journey record</h3><p className="small muted" style={{marginTop:0}}>If you know who was baptized or received the Holy Ghost, enter the names below. One name per line or comma-separated. The church-wide reported numbers update immediately, while the named record goes to Pastor/admin for verification before changing that person's official Journey.</p><div className="report-grid"><label className="field"><span>Who was baptized?</span><textarea name="baptism_names" rows={3} placeholder="Name(s), if known"/></label><label className="field"><span>Who received the Holy Ghost?</span><textarea name="holy_ghost_names" rows={3} placeholder="Name(s), if known"/></label></div></div>
        <label className="field"><span>Lesson / topic</span><input name="lesson_title" placeholder="What was taught?"/></label><label className="field"><span>Follow-up / pastoral attention</span><textarea name="follow_up_notes" rows={4} placeholder="Prayer needs, guests to contact, pastoral attention, next actions…"/></label><button className="btn">Submit report</button></form></section>}
    </div>

    <aside><section className="card group-section"><div className="pill">RECENT REPORTS</div><h2>Meeting history</h2>{canReport?<div className="report-history">{reports.map((r:any)=><article className="report-card" key={r.id}><div className="report-top"><strong>{fmtDate(r.meeting_date)}</strong><span>{r.lesson_title||'No lesson title'}</span></div><div className="report-numbers"><div><strong>{r.attendance_count}</strong><span>attendance</span></div><div><strong>{r.first_time_guests}</strong><span>guests</span></div><div><strong>{r.active_bible_studies}</strong><span>studies</span></div><div><strong>{r.baptisms}</strong><span>baptisms</span></div><div><strong>{r.holy_ghost_received}</strong><span>Holy Ghost</span></div></div>{r.follow_up_notes&&<div className="report-notes">{r.follow_up_notes}</div>}</article>)}{!reports.length&&<div className="group-empty">No reports submitted yet.</div>}</div>:<div className="group-empty">Meeting reports are private to group leadership and church administration.</div>}</section></aside></div>
  </main>
}
