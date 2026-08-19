import { createClient } from '@/lib/supabase/server'
import { login,signup,requestPasswordReset } from './actions'

export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string;message?:string;invite?:string}>}){
  const params=await searchParams
  const supabase=await createClient()
  let invite:any=null
  if(params.invite){
    const {data}=await supabase.rpc('get_invite_preview',{p_invite_id:params.invite})
    invite=Array.isArray(data)?data[0]:data
  }
  const validInvite=Boolean(invite?.valid)

  return <main className="login-wrap"><div className="login card"><div className="pill">KINGDOM NETWORK • ALPHA</div><h1>{validInvite?'You’re invited.':'Church life, connected.'}</h1><p className="muted">{validInvite?`Create your ${invite.church_name} account below.`:'Community, discipleship, outreach, learning, ministry and schedules in one place.'}</p>
    {params.error&&<div className="notice error">{params.error}</div>}{params.message&&<div className="notice success">{params.message}</div>}
    {validInvite&&<div className="notice success"><strong>Invitation to {invite.church_name}</strong><div className="small" style={{marginTop:4}}>For {invite.masked_email} • invited as {String(invite.role).replaceAll('_',' ')} • expires {new Date(invite.expires_at).toLocaleDateString()}</div></div>}
    {params.invite&&!validInvite&&<div className="notice error">This invitation is expired, already used, revoked, or unavailable. If you already created your account, sign in below.</div>}
    <form><input type="hidden" name="invite_id" value={validInvite?params.invite??'':''}/>{validInvite&&<><div className="row"><label className="field" style={{flex:1}}><span>First name</span><input name="first_name" autoComplete="given-name" required/></label><label className="field" style={{flex:1}}><span>Last name</span><input name="last_name" autoComplete="family-name" required/></label></div></>}<label className="field"><span>Email</span><input name="email" type="email" autoComplete="email" required/></label><label className="field"><span>{validInvite?'Create password':'Password'}</span><input name="password" type="password" minLength={8} autoComplete={validInvite?'new-password':'current-password'} required/></label>{validInvite&&<label className="field"><span>Type password again</span><input name="confirm_password" type="password" minLength={8} autoComplete="new-password" required/></label>}<div className="row"><button className="btn" formAction={login}>Sign in</button>{validInvite&&<button className="btn secondary" formAction={signup}>Accept invite & create account</button>}</div></form>
    <p className="small muted" style={{marginTop:16}}>{validInvite?'Use the exact email address your invitation was sent to. After creating the account, confirm the email we send you, then return here and sign in.':'New member accounts are created through a church invitation. Ask your church leadership for an invite link.'}</p>
    <div style={{marginTop:20,paddingTop:16,borderTop:'1px solid rgba(255,255,255,.12)'}}><strong>Trouble signing in?</strong><p className="small muted">Enter the email used for your account and we’ll send a password-reset link.</p><form><label className="field"><span>Account email</span><input name="reset_email" type="email" autoComplete="email" required/></label><button className="btn secondary" formAction={requestPasswordReset}>Forgot password</button></form></div>
  </div></main>
}
