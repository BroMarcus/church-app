import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BriefcaseBusiness,Clock,UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAssignment,respondToAssignment } from './actions'
import './teams.css'

const personName=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church member'
const dateTime=(v:string)=>new Date(v).toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})

export default async function TeamsPage({searchParams}:{searchParams:Promise<{created?:string;responded?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const churchId=membership.church_id
  const canManage=['ministry_leader','minister','pastor','church_admin'].includes(membership.role)
  const [{data:assignments},{data:responses},{data:ministries},{data:churchMembers}]=await Promise.all([
    supabase.from('team_assignments').select('*').gte('starts_at',new Date(Date.now()-24*60*60*1000).toISOString()).order('starts_at').limit(100),
    supabase.from('team_assignment_responses').select('*'),
    supabase.from('ministries').select('id,name').eq('church_id',churchId).eq('active',true).order('name'),
    canManage?supabase.from('church_memberships').select('user_id,role').eq('church_id',churchId).eq('status','active'):Promise.resolve({data:[] as any[]})
  ])
  const ids=Array.from(new Set([...(assignments??[]).map((a:any)=>a.assigned_user_id),...(churchMembers??[]).map((m:any)=>m.user_id)]))
  let profiles:any[]=[]
  if(ids.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ids);profiles=r.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p]))
  const responseBy=new Map((responses??[]).map((r:any)=>[r.assignment_id,r]))
  const ministryBy=new Map((ministries??[]).map((m:any)=>[m.id,m.name]))
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const memberOptions=(churchMembers??[]).map((m:any)=>({id:m.user_id,name:personName(pm.get(m.user_id))})).sort((a:any,b:any)=>a.name.localeCompare(b.name))

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Teams</div></div><Link className="ghost" href="/">← Home</Link></header>
    <section className="teams-hero card"><div><div className="pill">TEAM SCHEDULES</div><h1>Know where you’re serving.</h1><p className="muted">Assignments, call times, confirmations and ministry schedules.</p></div><div className="hero-stat"><strong>{assignments?.length??0}</strong><span>upcoming assignments</span></div></section>
    {query.created&&<div className="notice success">Assignment created.</div>}{query.responded&&<div className="notice success">Your response was saved.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <div className="teams-layout"><section className="assignment-list">{(assignments??[]).map((a:any)=>{const response:any=responseBy.get(a.id);const mine=a.assigned_user_id===userId;return <article className="card assignment-card" key={a.id}><div className="assignment-head"><div><div className="assignment-person"><div className="avatar">{personName(pm.get(a.assigned_user_id)).slice(0,1).toUpperCase()}</div><div><strong>{personName(pm.get(a.assigned_user_id))}</strong><div className="small muted">{a.ministry_id?ministryBy.get(a.ministry_id)||'Ministry':'Church team'}</div></div></div><h2>{a.title}</h2></div><span className={`response-chip ${response?.response??''}`}>{response?.response??(a.confirmation_required?'awaiting response':'scheduled')}</span></div><div className="assignment-meta"><span><BriefcaseBusiness size={13}/>{dateTime(a.starts_at)}</span>{a.call_time&&<span><Clock size={13}/>Call time {dateTime(a.call_time)}</span>}</div>{a.notes&&<p className="muted">{a.notes}</p>}{mine&&a.confirmation_required&&<form action={respondToAssignment} className="response-actions"><input type="hidden" name="assignment_id" value={a.id}/><label className="field"><span>Optional note</span><input name="note" defaultValue={response?.note??''} placeholder="Anything leadership should know"/></label><button className="btn" name="response" value="confirmed"><UserCheck size={14}/> Confirm</button><button className="ghost" name="response" value="declined">Can’t serve</button></form>}</article>})}{!assignments?.length&&<div className="card team-empty"><h3>No upcoming assignments.</h3><p className="muted">Your team schedule will appear here.</p></div>}</section>

    <aside>{canManage?<section className="card create-assignment"><div className="pill">LEADERSHIP</div><h2>Schedule team member</h2><form action={createAssignment}><input type="hidden" name="church_id" value={churchId}/><label className="field"><span>Person</span><select name="assigned_user_id" required defaultValue=""><option value="" disabled>Choose member</option>{memberOptions.map((m:any)=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label className="field"><span>Ministry</span><select name="ministry_id" defaultValue=""><option value="">General church team</option>{(ministries??[]).map((m:any)=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label className="field"><span>Assignment</span><input name="title" required placeholder="e.g. Sound Booth – Sunday AM"/></label><label className="field"><span>Service / event time</span><input type="datetime-local" name="starts_at" required/></label><label className="field"><span>Call time</span><input type="datetime-local" name="call_time"/></label><label className="field"><span>Notes</span><textarea name="notes" rows={3} placeholder="Dress, location, setup instructions, etc."/></label><button className="btn">Create assignment</button></form></section>:<section className="card side"><div className="pill">MY TEAM</div><h3>Simple confirmations.</h3><p className="muted">When you’re assigned, confirm or decline here so your leader knows immediately.</p></section>}</aside></div>
  </main>
}
