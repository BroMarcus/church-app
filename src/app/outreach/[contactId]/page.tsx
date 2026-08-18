import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Link2,Mail,ShieldCheck,UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { OutreachHistory } from '../outreach-history'
import { createOutreachMemberInvite } from './actions'
import { OutreachInviteLink } from './invite-link'
import '../outreach.css'

const personName=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church member'

export default async function OutreachContactPage({params,searchParams}:{params:Promise<{contactId:string}>;searchParams:Promise<{invite?:string;error?:string}>}){
  const [{contactId},query]=await Promise.all([params,searchParams])
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name,timezone)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const {data:contact}=await supabase.from('outreach_contacts').select('*').eq('id',contactId).eq('church_id',membership.church_id).maybeSingle()
  if(!contact)redirect('/outreach?error='+encodeURIComponent('Outreach contact not found or unavailable to you.'))
  const canInvite=['pastor','church_admin'].includes(membership.role)
  let linkedProfile:any=null
  if(contact.member_user_id){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').eq('id',contact.member_user_id).maybeSingle();linkedProfile=r.data??null}
  const {data:interactions}=await supabase.from('outreach_interactions').select('id,contact_id,interaction_type,occurred_at,summary,bible_study_lesson,recorded_by,profiles:recorded_by(display_name,first_name,last_name)').eq('contact_id',contactId).order('occurred_at',{ascending:false})
  let openInvite:any=null
  if(canInvite&&!contact.member_user_id){const r=await supabase.from('church_invites').select('id,email,expires_at,created_at').eq('church_id',membership.church_id).eq('outreach_contact_id',contactId).is('redeemed_at',null).is('revoked_at',null).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(1).maybeSingle();openInvite=r.data??null}
  const inviteId=query.invite||openInvite?.id||null
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const timeZone=church?.timezone||'UTC'
  const name=[contact.first_name,contact.last_name].filter(Boolean).join(' ')||'Outreach contact'

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Outreach</div></div><div className="row"><Link className="ghost" href="/outreach">← Outreach Pipeline</Link><Link className="ghost" href="/">Home</Link></div></header>
    <section className="outreach-hero card"><div><div className="pill">OUTREACH PERSON</div><h1>{name}</h1><p className="muted">Follow-up history and the bridge from Outreach into a real Kingdom Network member account.</p></div><div className="hero-stat"><strong>{String(contact.stage).replaceAll('_',' ')}</strong><span>current stage</span></div></section>
    {query.error&&<div className="notice error">{query.error}</div>}

    <div className="outreach-layout"><section className="contact-list"><article className="card contact-card"><div className="contact-head"><div className="contact-name"><div className="avatar">{name.slice(0,1).toUpperCase()}</div><div><strong>{name}</strong><div className="small muted">{contact.email||'No email added'}{contact.phone?` • ${contact.phone}`:''}</div></div></div><span className="stage-chip">{String(contact.stage).replaceAll('_',' ')}</span></div>{contact.prayer_request&&<p className="muted">Prayer request: {contact.prayer_request}</p>}{contact.notes&&<p className="muted">Notes: {contact.notes}</p>}<OutreachHistory contactId={contactId} interactions={interactions??[]} timeZone={timeZone}/></article></section>

    <aside><section className="card create-outreach"><div className="pill">MEMBER CONNECTION</div>{contact.member_user_id?<><UserCheck size={24}/><h2>Linked to Kingdom Network</h2><p className="small muted">This Outreach history is now connected to the member account for {personName(linkedProfile)}. The Outreach record remains preserved instead of becoming a duplicate guest.</p><Link className="btn" href={`/directory/${contact.member_user_id}`}>Open member profile</Link></>:canInvite?<><Link2 size={24}/><h2>Invite into Kingdom Network</h2><p className="small muted">The invitation is email-bound and expires after seven days. When the invited person creates the account, this Outreach record links to that member automatically.</p>{contact.email?inviteId?<div style={{display:'grid',gap:8}}><div className="notice success"><Mail size={12}/> Invitation ready for {contact.email}.</div><OutreachInviteLink inviteId={inviteId}/>{openInvite?.expires_at&&<span className="small muted">Expires {new Date(openInvite.expires_at).toLocaleString()}</span>}</div>:<form action={createOutreachMemberInvite}><input type="hidden" name="contact_id" value={contactId}/><button className="btn"><Mail size={13}/> Create secure member invitation</button></form>:<div className="notice error">Add an email address to this Outreach person before creating a member invitation.</div>}</>:<><ShieldCheck size={24}/><h2>Admin invitation required</h2><p className="small muted">A pastor or church admin can create the secure account invitation. Outreach leaders can continue follow-up without being able to issue account access.</p></>}</section></aside></div>
  </main>
}
