import { createClient } from '@/lib/supabase/server'
import { login,signup } from './actions'

export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string;message?:string;invite?:string}>}){
  const params=await searchParams
  const supabase=await createClient()
  let invite:any=null
  if(params.invite){
    const {data}=await supabase.rpc('get_invite_preview',{p_invite_id:params.invite})
    invite=Array.isArray(data)?data[0]:data
  }
  const validInvite=Boolean(invite?.valid)

  return <main className="login-wrap"><div className="login card"><div className="pill">KINGDOM NETWORK • ALPHA</div><h1>Church life, connected.</h1><p className="muted">Community, discipleship, outreach, learning, ministry and schedules in one place.</p>
    {params.error&&<div className="notice error">{params.error}</div>}{params.message&&<div className="notice success">{params.message}</div>}
    {validInvite&&<div className="notice success"><strong>Invitation to {invite.church_name}</strong><div className="small" style={{marginTop:4}}>For {invite.masked_email} • invited as {String(invite.role).replaceAll('_',' ')} • expires {new Date(invite.expires_at).toLocaleDateString()}</div></div>}
    {params.invite&&!validInvite&&<div className="notice error">This invitation is expired, already used, revoked, or unavailable. You can still sign into an existing account below.</div>}
    <form><input type="hidden" name="invite_id" value={validInvite?params.invite??'':''}/><div className="row"><label className="field" style={{flex:1}}><span>First name</span><input name="first_name" autoComplete="given-name" required={validInvite}/></label><label className="field" style={{flex:1}}><span>Last name</span><input name="last_name" autoComplete="family-name" required={validInvite}/></label></div><label className="field"><span>Email</span><input name="email" type="email" autoComplete="email" required/></label><label className="field"><span>Password</span><input name="password" type="password" minLength={8} autoComplete="current-password" required/></label><div className="row"><button className="btn" formAction={login}>Sign in</button>{validInvite&&<button className="btn secondary" formAction={signup}>Accept invite & create account</button>}</div></form>
    <p className="small muted" style={{marginTop:16}}>{validInvite?'Create your account with the email address this invitation was sent to. After email confirmation, your church membership is connected automatically.':'New member accounts are created through a church invitation. Ask your church leadership for an invite link.'}</p>
  </div></main>
}
