import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MailPlus,ShieldCheck,UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CopyInviteLink } from './copy-invite-link'
import { createChurchInvite,revokeChurchInvite } from './actions'
import './invites.css'

const roleLabel=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
const dateTime=(v:string)=>new Date(v).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})

export default async function InvitesPage({searchParams}:{searchParams:Promise<{created?:string;revoked?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const {data:invites}=await supabase.from('church_invites').select('id,email,role,expires_at,redeemed_at,revoked_at,created_at,created_by,redeemed_by').eq('church_id',membership.church_id).order('created_at',{ascending:false}).limit(100)
  const ids=Array.from(new Set((invites??[]).flatMap((i:any)=>[i.created_by,i.redeemed_by]).filter(Boolean)))
  let profiles:any[]=[]
  if(ids.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ids);profiles=r.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p]))
  const person=(id?:string|null)=>{const p=id?pm.get(id):null;return p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'—'}
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const now=Date.now()
  const rows=(invites??[]).map((invite:any)=>{const state=invite.redeemed_at?'redeemed':invite.revoked_at?'revoked':new Date(invite.expires_at).getTime()<=now?'expired':'open';return {...invite,state}})
  const open=rows.filter((i:any)=>i.state==='open').length

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Member Invitations</div></div><div className="row"><Link className="ghost" href="/church">← Church Admin</Link><Link className="ghost" href="/">Home</Link></div></header>
    <section className="invite-hero card"><div><div className="pill">MEMBER ONBOARDING</div><h1>Invite people intentionally.</h1><p className="muted">Each invite is tied to one email, one church and one starting role. Invite links expire and can only be redeemed once.</p></div><div className="admin-badge"><MailPlus size={22}/><div><strong>{open}</strong><span>open invite{open===1?'':'s'}</span></div></div></section>
    {query.created&&<div className="notice success">Invitation created. Copy the link and send it to the invited person.</div>}{query.revoked&&<div className="notice success">Invitation revoked.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <div className="invite-layout"><aside className="card invite-create"><div className="pill">NEW INVITE</div><h2>Create member invitation</h2><p className="small muted">For pilot security, pastor and church-admin roles are assigned only after the person joins.</p><form action={createChurchInvite} className="invite-form"><label><span>Email address</span><input name="email" type="email" required placeholder="member@example.com"/></label><label><span>Starting role</span><select name="role" defaultValue="member"><option value="member">Member</option><option value="group_leader">Group leader</option><option value="ministry_leader">Ministry leader</option><option value="minister">Minister</option></select></label><label><span>Expires in</span><select name="expires_days" defaultValue="7"><option value="1">1 day</option><option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></label><button className="btn"><UserPlus size={14}/> Create invitation</button></form></aside>

      <section className="invite-list">{rows.map((invite:any)=><article className="card invite-card" key={invite.id}><div className="invite-head"><div><strong className="invite-email">{invite.email}</strong><div className="invite-meta"><span>{roleLabel(invite.role)}</span><span>Created {dateTime(invite.created_at)}</span><span>By {person(invite.created_by)}</span></div></div><span className={`invite-state ${invite.state}`}>{invite.state}</span></div><div className="invite-meta"><span>Expires {dateTime(invite.expires_at)}</span>{invite.redeemed_at&&<span>Redeemed {dateTime(invite.redeemed_at)} by {person(invite.redeemed_by)}</span>}{invite.revoked_at&&<span>Revoked {dateTime(invite.revoked_at)}</span>}</div><div className="invite-actions">{invite.state==='open'&&<><CopyInviteLink inviteId={invite.id}/><form action={revokeChurchInvite}><input type="hidden" name="invite_id" value={invite.id}/><button className="ghost">Revoke</button></form></>}</div></article>)}{!rows.length&&<div className="card empty"><h3>No invitations yet.</h3><p className="muted">Create the first invitation to begin onboarding real members.</p></div>}</section></div>

    <section className="card invite-note"><div className="pill">SECURE FLOW</div><h3><ShieldCheck size={15}/> Forwarding the link does not transfer the invitation.</h3><p className="muted">The person must create the account using the exact invited email address. The membership role comes from the protected invite record, not from the URL or signup form.</p></section>
  </main>
}
