import Link from 'next/link'
import { redirect } from 'next/navigation'
import { KeyRound,LogOut,Mail,ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { changeLoginEmail,changePassword,signOutEverywhere } from './actions'
import './security.css'

export default async function AccountSecurityPage({searchParams}:{searchParams:Promise<{email?:string;password?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:userData}=await supabase.auth.getUser()
  const loginEmail=userData.user?.email||String(claims?.claims?.email??'')

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">My Account • Security</div></div><div className="row"><Link className="ghost" href="/account/privacy">Privacy</Link><Link className="ghost" href="/account/data">My Data</Link><Link className="ghost" href="/">← Home</Link></div></header>
    <section className="security-hero card"><div><div className="pill">ACCOUNT SECURITY</div><h1>Manage the account used to sign into Kingdom Network.</h1><p className="muted">Login email, password and active sessions are separate from the contact information you choose to show church members.</p></div><div className="hero-stat"><ShieldCheck size={24}/><span>Signed-in account</span></div></section>
    {query.email&&<div className="notice success">Login email change requested. Follow the confirmation instructions sent by Supabase Auth.</div>}{query.password&&<div className="notice success">Password updated.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <section className="security-grid"><article className="card security-card"><div className="pill">LOGIN EMAIL</div><h2><Mail size={15}/> Change sign-in email</h2><p className="small muted">This does not change the separate Contact Email shown on your church profile.</p><div className="security-current"><strong>Current login email</strong><span>{loginEmail||'Not available'}</span></div><form action={changeLoginEmail} className="security-form"><label><span>New login email</span><input name="email" type="email" required autoComplete="email"/></label><button className="btn">Request email change</button></form><div className="security-warning">Email changes require the Supabase confirmation flow. Before broader member use, the production Auth Site URL / redirect allowlist must point to the permanent Kingdom Network domain rather than localhost.</div></article>

      <article className="card security-card"><div className="pill">PASSWORD</div><h2><KeyRound size={15}/> Change password</h2><p className="small muted">Use a unique password you do not reuse on another account.</p><form action={changePassword} className="security-form"><label><span>New password</span><input name="password" type="password" minLength={12} required autoComplete="new-password"/></label><label><span>Confirm new password</span><input name="confirm_password" type="password" minLength={12} required autoComplete="new-password"/></label><button className="btn">Update password</button></form><div className="security-current"><strong>Kingdom Network minimum</strong><span>12 characters on this form. Supabase’s leaked-password protection should also be enabled before the broader pilot.</span></div></article>

      <article className="card security-card security-danger"><div className="pill">SESSIONS</div><h2><LogOut size={15}/> Sign out everywhere</h2><p className="small muted">Use this if you signed in on a device you no longer control or think your account session may be compromised.</p><form action={signOutEverywhere}><button className="btn">Sign out all sessions</button></form></article>

      <article className="card security-card"><div className="pill">CONTACT EMAIL</div><h2>What other members see</h2><p className="small muted">The Contact Email field lives on your member profile and has its own Show/Hide privacy setting. Changing the login email here does not automatically publish it to your church.</p><div className="row"><Link className="ghost" href="/profile">Edit contact email</Link><Link className="ghost" href="/account/privacy">Privacy settings</Link></div></article></section>

    <section className="card security-note"><div className="pill">ACCOUNT MODEL</div><p>Your authentication account proves who is signed in. Church membership, role, verified milestones and member-facing profile data are separate records. Keeping those layers separate prevents an ordinary profile edit from becoming an account-security or leadership-permission change.</p></section>
  </main>
}
