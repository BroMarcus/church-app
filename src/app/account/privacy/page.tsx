import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Eye,EyeOff,LockKeyhole,MessageCircle,ShieldCheck,UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { savePrivacySettings } from './actions'
import './privacy.css'

export default async function PrivacyPage({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const {data:profile}=await supabase.from('profiles').select('directory_visible,messaging_preference,show_contact_email,show_verified_credentials,show_learning_trophies,contact_email').eq('id',userId).single()
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Privacy</div></div><div className="row"><Link className="ghost" href="/profile">My profile</Link><Link className="ghost" href="/">← Home</Link></div></header>
    <section className="privacy-hero card"><div><div className="pill">MY PRIVACY</div><h1>Control what other members can see and do.</h1><p className="muted">These settings affect the church Directory, profile achievements and private member messaging.</p></div><div className="hero-stat"><ShieldCheck size={24}/><span>Member controlled</span></div></section>
    {query.saved&&<div className="notice success">Privacy settings saved.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <div className="privacy-layout"><section className="card privacy-card"><div className="pill">VISIBILITY & CONTACT</div><h2>Your church-visible profile</h2><form action={savePrivacySettings}><div className="privacy-options">
      <div className="privacy-option"><label><input type="checkbox" name="directory_visible" defaultChecked={profile?.directory_visible??true}/><div><strong><UserRound size={12}/> Show me in the church Directory</strong><span>When off, ordinary members will not see you while browsing the Directory. Leadership and operational features can still identify you where required.</span></div></label></div>
      <div className="privacy-option"><label><input type="checkbox" name="show_contact_email" defaultChecked={profile?.show_contact_email??false}/><div><strong>Show my separate contact email</strong><span>This controls the contact email you chose for church members. It never exposes the email used to sign into Kingdom Network.</span></div></label>{profile?.contact_email&&<div className="privacy-state">Current contact email: {profile.contact_email}</div>}</div>
      <div className="privacy-option"><label><input type="checkbox" name="show_verified_credentials" defaultChecked={profile?.show_verified_credentials??true}/><div><strong>Show verified credentials on my church profile</strong><span>Examples include approved training/readiness credentials. Leadership still retains the underlying verified record even if you hide the public badge display.</span></div></label></div>
      <div className="privacy-option"><label><input type="checkbox" name="show_learning_trophies" defaultChecked={profile?.show_learning_trophies??true}/><div><strong>Show learning trophies on my church profile</strong><span>Controls fun learning achievements only. It does not affect your actual Learning Center progress.</span></div></label></div>
      <div className="privacy-option"><div><strong><MessageCircle size={12}/> Who may start/send private messages to me?</strong><span>Changing this setting is enforced at the database level, including existing conversations.</span></div><select name="messaging_preference" defaultValue={profile?.messaging_preference??'church'}><option value="church">Any active member of my local church</option><option value="leaders_only">Church leaders only</option><option value="none">Nobody</option></select></div>
    </div><button className="btn privacy-save">Save privacy settings</button></form></section>

    <aside className="privacy-aside"><article className="card privacy-note"><div className="pill">LOGIN EMAIL</div><h3>Still private.</h3><p><LockKeyhole size={12}/> Your authentication/login email is not controlled by the Directory setting and is not exposed to ordinary church members.</p></article><article className="card privacy-note"><div className="pill">PRIVATE CHURCH RECORDS</div><h3>Not affected by profile visibility.</h3><p>Pastoral Care, private documents, group home addresses, Outreach notes and leadership-only verified milestones keep their own stricter access rules.</p></article><article className="card privacy-note"><div className="pill">MESSAGING</div><h3>Blocks still override preferences.</h3><p>If either participant has blocked the other, messaging stays unavailable even when the general preference would normally allow it.</p></article><article className="card privacy-note"><div className="pill">DIRECTORY</div><h3>{profile?.directory_visible??true?<><Eye size={12}/> Currently visible</>:<><EyeOff size={12}/> Currently hidden</>}</h3><p>You can change this whenever you need to.</p></article></aside></div>
  </main>
}
