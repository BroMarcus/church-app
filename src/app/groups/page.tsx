import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays,Plus,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createGroup } from './actions'
import './groups.css'

export default async function GroupsPage({searchParams}:{searchParams:Promise<{error?:string}>}){
  const params=await searchParams
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const churchId=membership.church_id
  const isAdmin=['pastor','church_admin'].includes(membership.role)
  const [{data:groups},{data:groupMemberships},{data:churchMembers}]=await Promise.all([
    supabase.from('groups').select('*').eq('church_id',churchId).eq('active',true).order('name'),
    supabase.from('group_memberships').select('group_id,user_id,role'),
    isAdmin?supabase.from('church_memberships').select('user_id,role').eq('church_id',churchId).eq('status','active'):Promise.resolve({data:[] as any[]})
  ])
  const leaderIds=(groups??[]).map((g:any)=>g.leader_id).filter(Boolean)
  const churchUserIds=(churchMembers??[]).map((m:any)=>m.user_id)
  const ids=Array.from(new Set([...leaderIds,...churchUserIds]))
  let profiles:any[]=[]
  if(ids.length){const result=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ids);profiles=result.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p]))
  const counts=new Map<string,number>()
  for(const gm of groupMemberships??[])counts.set(gm.group_id,(counts.get(gm.group_id)??0)+1)
  const myGroupIds=new Set((groupMemberships??[]).filter((gm:any)=>gm.user_id===userId).map((gm:any)=>gm.group_id))
  const church=Array.isArray(membership.churches)?membership.churches[0]:membership.churches as any
  const memberOptions=(churchMembers??[]).map((m:any)=>{const p=pm.get(m.user_id);return {id:m.user_id,name:p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Member'}}).sort((a:any,b:any)=>a.name.localeCompare(b.name))

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Groups</div></div><Link className="ghost" href="/">← Home</Link></header>
    <section className="groups-hero card"><div><div className="pill">GROUP LIFE</div><h1>Friendship Groups</h1><p className="muted">People, attendance, guests, lessons and follow-up in one place.</p></div><div className="groups-stat"><strong>{groups?.length??0}</strong><span>active groups</span></div></section>
    {params.error&&<div className="notice error">{params.error}</div>}

    <section className="groups-grid">{(groups??[]).map((g:any)=>{const p=pm.get(g.leader_id);const leader=p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Leader not assigned';const mine=myGroupIds.has(g.id);return <Link href={`/groups/${g.id}`} className="card group-card" key={g.id}><div className="group-card-head"><div className="group-icon"><Users size={20}/></div>{mine&&<span className="mini-pill">MY GROUP</span>}</div><h2>{g.name}</h2><p>{g.description||'Church community group'}</p><div className="group-meta"><span><Users size={14}/>{counts.get(g.id)??0} members</span><span><CalendarDays size={14}/>{g.meeting_day||'Schedule TBD'} {g.meeting_time?String(g.meeting_time).slice(0,5):''}</span></div><div className="group-leader">Leader: <strong>{leader}</strong></div></Link>})}
      {!groups?.length&&<div className="card empty"><h3>No active groups yet.</h3><p className="muted">Church admins can create the first group below.</p></div>}
    </section>

    {isAdmin&&<section className="card create-group"><div className="section-heading"><div><div className="pill">ADMIN</div><h2>Create a group</h2></div><Plus/></div><form action={createGroup}><input type="hidden" name="church_id" value={churchId}/><div className="group-form-grid"><label className="field"><span>Group name</span><input name="name" required placeholder="e.g. North Madera Friendship Group"/></label><label className="field"><span>Group type</span><select name="group_type" defaultValue="friendship"><option value="friendship">Friendship</option><option value="youth">Youth</option><option value="college_career">College & Career</option><option value="men">Men</option><option value="women">Women</option><option value="juniors">Juniors</option><option value="miracle_land">Miracle Land</option><option value="other">Other</option></select></label><label className="field"><span>Leader</span><select name="leader_id" defaultValue=""><option value="">Assign later</option>{memberOptions.map((m:any)=><option value={m.id} key={m.id}>{m.name}</option>)}</select></label><label className="field"><span>Meeting day</span><select name="meeting_day" defaultValue="Tuesday"><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option><option>Sunday</option></select></label><label className="field"><span>Meeting time</span><input name="meeting_time" type="time"/></label></div><label className="field"><span>Description</span><textarea name="description" rows={3} placeholder="Who this group serves, neighborhood, or purpose"/></label><button className="btn">Create group</button></form></section>}
  </main>
}
