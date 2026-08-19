import { verifyAuthLink } from './actions'

export default async function VerifyPage({searchParams}:{searchParams:Promise<{token_hash?:string;type?:string;next?:string}>}){
  const params=await searchParams
  const hasLink=Boolean(params.token_hash&&params.type)
  const isRecovery=params.type==='recovery'

  return <main className="login-wrap"><div className="login card"><div className="pill">KINGDOM NETWORK</div><h1>{isRecovery?'Reset your password':'Confirm your account'}</h1><p className="muted">{hasLink?(isRecovery?'Tap continue to securely open the password reset form.':'Tap continue to securely confirm your email address.'):'This account link is incomplete or invalid.'}</p>{hasLink?<form action={verifyAuthLink}><input type="hidden" name="token_hash" value={params.token_hash}/><input type="hidden" name="type" value={params.type}/><input type="hidden" name="next" value={params.next??'/'}/><button className="btn" type="submit">{isRecovery?'Continue password reset':'Confirm email'}</button></form>:<div className="notice error">Please return to Sign in and request a fresh email.</div>}<p className="small muted" style={{marginTop:16}}>For your security, Kingdom Network does not complete one-time account links until you tap the button above.</p><p className="small muted" style={{marginTop:16}}><a href="/login">Back to sign in</a></p></div></main>
}
