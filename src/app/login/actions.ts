'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')
const langOf=(f:FormData)=>text(f,'lang')==='es'?'es':'en'
const loginUrl=(lang:string,extra='')=>`/login?lang=${lang}${extra}`
const EMAIL_MAX=254
const NAME_MAX=80
const NEW_PASSWORD_MAX=128
const EXISTING_PASSWORD_MAX=4096
const INVITE_MAX=128
const JOIN_NEXT_MAX=500
const INVITE_ID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function safeInviteId(value:string){return value.length<=INVITE_MAX&&INVITE_ID_PATTERN.test(value)?value:''}
function safeJoinNext(value:string){
  try{
    if(!value||value.length>JOIN_NEXT_MAX||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return ''
    const base='https://kingdom.invalid'
    const parsed=new URL(value,base)
    if(parsed.origin!==base||!parsed.pathname.startsWith('/join/'))return ''
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  }catch{return ''}
}
const callbackUrl=(lang:'en'|'es',mode:'signup'|'recovery',next:string,invite='')=>`${siteUrl}/auth/callback?lang=${lang}&mode=${mode}&next=${encodeURIComponent(next)}${safeInviteId(invite)?`&invite=${encodeURIComponent(safeInviteId(invite))}`:''}`
const recoveryUrl=(lang:'en'|'es',next='',invite='')=>`${siteUrl}/auth/update-password?lang=${lang}${safeJoinNext(next)?`&next=${encodeURIComponent(safeJoinNext(next))}`:''}${safeInviteId(invite)?`&invite=${encodeURIComponent(safeInviteId(invite))}`:''}`
const statusPart=(kind:'error'|'message',code:string)=>`&${kind}_code=${encodeURIComponent(code)}`
const boundedCode=(value:unknown)=>String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'unknown'
const diagnosticCode=(error:unknown,fallback:string)=>{
  if(typeof error==='object'&&error&&'code' in error)return boundedCode((error as {code?:unknown}).code)
  if(error instanceof Error)return boundedCode(error.name)
  return boundedCode(fallback)
}
type SupabaseServerClient=Awaited<ReturnType<typeof createClient>>
async function getSupabase(context:string){
  try{return await createClient()}
  catch(error){console.error(`${context} client unavailable`,{code:diagnosticCode(error,'client_unavailable')});return null}
}
async function redeemInvite(supabase:SupabaseServerClient,inviteId:string,context:string){
  try{
    const {data:redeemed,error}=await supabase.rpc('redeem_invite_for_current_user',{p_invite_id:inviteId})
    const row=Array.isArray(redeemed)?redeemed[0]:redeemed
    if(error||!row?.church_id){
      console.error(`${context} invitation redemption failed`,{code:error?boundedCode(error.code):'empty_redeem_result'})
      return false
    }
    return true
  }catch(error){
    console.error(`${context} invitation redemption unavailable`,{code:diagnosticCode(error,'invite_redeem_unavailable')})
    return false
  }
}
async function cleanupLocalSession(supabase:SupabaseServerClient,context:string){
  for(let attempt=1;attempt<=2;attempt+=1){
    try{
      const {error}=await supabase.auth.signOut({scope:'local'})
      if(error){
        console.error(`${context} local sign out failed`,{attempt,code:boundedCode(error.code)})
        continue
      }
      let verification
      try{verification=await supabase.auth.getSession()}
      catch(error){
        console.error(`${context} local sign out verification unavailable`,{attempt,code:diagnosticCode(error,'session_check_unavailable')})
        continue
      }
      if(verification.error){
        console.error(`${context} local sign out verification failed`,{attempt,code:boundedCode(verification.error.code)})
        continue
      }
      if(!verification.data.session)return true
      console.error(`${context} local session still present after sign out`,{attempt,code:'session_still_present'})
    }catch(error){
      console.error(`${context} local sign out unavailable`,{attempt,code:diagnosticCode(error,'signout_unavailable')})
    }
  }
  return false
}
function emailIssue(email:string){
  if(!email)return 'missing_email'
  if(email.length>EMAIL_MAX||/\s/.test(email))return 'invalid_email'
  const at=email.indexOf('@')
  if(at<=0||at!==email.lastIndexOf('@')||at===email.length-1)return 'invalid_email'
  return ''
}
function authEmailErrorCode(error:{code?:unknown;status?:unknown}){
  const code=boundedCode(error?.code)
  if(code==='over_email_send_rate_limit'||code==='over_request_rate_limit'||error?.status===429)return 'email_rate_limit'
  if(code==='email_exists'||code==='user_already_exists')return 'account_exists'
  if(code==='weak_password')return 'weak_password'
  if(code==='email_address_invalid')return 'invalid_email'
  return 'email_failed'
}

export async function login(formData:FormData){
  const lang=langOf(formData),next=safeJoinNext(text(formData,'next'))
  const rawInviteId=text(formData,'invite_id'),inviteId=safeInviteId(rawInviteId)
  const invitePart=inviteId?`&invite=${encodeURIComponent(inviteId)}`:''
  const nextPart=next?`&next=${encodeURIComponent(next)}`:''
  if(rawInviteId&&!inviteId)redirect(loginUrl(lang,'&mode=signin'+statusPart('error','invite_malformed')))
  const email=text(formData,'email').toLowerCase(),password=String(formData.get('password')??'')
  const emailError=emailIssue(email)
  if(emailError)redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error',emailError)))
  if(!password)redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error','missing_password')))
  if(password.length>EXISTING_PASSWORD_MAX)redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error','password_too_long')))
  const supabase=await getSupabase('login')
  if(!supabase)redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error','login_failed')))

  let signInResult
  try{signInResult=await supabase.auth.signInWithPassword({email,password})}
  catch(authError){
    console.error('login transport unavailable',{code:diagnosticCode(authError,'signin_unavailable')})
    redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error','login_failed')))
  }
  const {data,error}=signInResult
  if(error){
    const authCode=boundedCode(error.code)
    let code='login_failed'
    if(authCode==='invalid_credentials')code='invalid_credentials'
    else if(authCode==='email_not_confirmed')code='email_unconfirmed'
    else console.error('login unavailable',{code:authCode,status:typeof error.status==='number'?String(error.status).slice(0,3):'unknown'})
    redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error',code)))
  }
  if(!data?.session||!data.user?.id){
    console.error('login returned incomplete auth state',{code:'auth_state_missing'})
    redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error','login_failed')))
  }
  if(inviteId){
    const redeemed=await redeemInvite(supabase,inviteId,'existing-account private')
    if(!redeemed){
      const cleanupSucceeded=await cleanupLocalSession(supabase,'post-invite-failure')
      if(!cleanupSucceeded)redirect(`/account/security?lang=${lang}&invite=${encodeURIComponent(inviteId)}&status=signout_failed`)
      redirect(loginUrl(lang,'&mode=signin'+invitePart+statusPart('error','invite_redeem_failed')))
    }
    redirect(`/start?lang=${lang}&message_code=joined_existing`)
  }
  if(next)redirect(next)
  const userId=data.user.id
  if(userId){
    const onboardingState=data.user?.user_metadata?.onboarding_completed
    if(onboardingState===false)redirect(`/start?welcome=1&lang=${lang}`)
    if(onboardingState===undefined){
      let historyResults
      try{
        historyResults=await Promise.all([
          supabase.from('profiles').select('first_name,last_name,display_name,bio').eq('id',userId).maybeSingle(),
          supabase.from('group_memberships').select('*',{count:'exact',head:true}).eq('user_id',userId),
          supabase.from('course_enrollments').select('*',{count:'exact',head:true}).eq('user_id',userId)
        ])
      }catch(inferenceError){
        console.error('legacy onboarding inference transport unavailable',{code:diagnosticCode(inferenceError,'inference_unavailable')})
      }
      if(historyResults){
        const [profileResult,groupsResult,enrollmentsResult]=historyResults
        const inferenceError=profileResult.error||groupsResult.error||enrollmentsResult.error
        if(inferenceError){
          console.error('legacy onboarding inference unavailable',{
            profile:profileResult.error?boundedCode(profileResult.error.code):'ok',
            groups:groupsResult.error?boundedCode(groupsResult.error.code):'ok',
            enrollments:enrollmentsResult.error?boundedCode(enrollmentsResult.error.code):'ok'
          })
        }else{
          const profile=profileResult.data
          const hasActivity=(groupsResult.count??0)>0||(enrollmentsResult.count??0)>0||Boolean(profile?.bio)
          if(!hasActivity)redirect(`/start?welcome=1&lang=${lang}`)
        }
      }
    }
  }
  redirect(`/?lang=${lang}`)
}

export async function signup(formData:FormData){
  const lang=langOf(formData)
  const email=text(formData,'email').toLowerCase(),password=String(formData.get('password')??''),confirmPassword=String(formData.get('confirm_password')??''),firstName=text(formData,'first_name'),lastName=text(formData,'last_name'),rawInviteId=text(formData,'invite_id')
  const inviteId=safeInviteId(rawInviteId)
  const invitePart=inviteId?`&invite=${encodeURIComponent(inviteId)}`:''
  const fail=(code:string)=>redirect(loginUrl(lang,invitePart+'&mode=signup'+statusPart('error',code)))
  if(rawInviteId&&!inviteId)redirect(loginUrl(lang,'&mode=signin'+statusPart('error','invite_malformed')))
  if(!firstName||!lastName)fail('missing_name')
  if(firstName.length>NAME_MAX||lastName.length>NAME_MAX)fail('name_too_long')
  const emailError=emailIssue(email)
  if(emailError)fail(emailError)
  if(password.length<8)fail('weak_password')
  if(password.length>NEW_PASSWORD_MAX||confirmPassword.length>NEW_PASSWORD_MAX)fail('password_too_long')
  if(password!==confirmPassword)fail('password_mismatch')
  const supabase=await getSupabase('signup')
  if(!supabase)fail(inviteId?'invite_check_unavailable':'signup_status_unavailable')

  let publicSignup=false
  if(inviteId){
    let inviteResult
    try{inviteResult=await supabase.rpc('validate_invite_email',{p_invite_id:inviteId,p_email:email})}
    catch(inviteError){
      console.error('signup invite validation transport unavailable',{code:diagnosticCode(inviteError,'invite_check_unavailable')})
      fail('invite_check_unavailable')
    }
    const {data:valid,error:inviteError}=inviteResult
    if(inviteError){
      console.error('signup invite validation unavailable',{code:boundedCode(inviteError.code)})
      fail('invite_check_unavailable')
    }
    if(typeof valid!=='boolean'){
      console.error('signup invite validation returned no decision',{code:'empty_invite_validation'})
      fail('invite_check_unavailable')
    }
    if(!valid)fail('invite_invalid')
  }else{
    let statusResult
    try{statusResult=await supabase.rpc('get_public_signup_status')}
    catch(statusError){
      console.error('public signup status transport unavailable',{code:diagnosticCode(statusError,'signup_status_unavailable')})
      fail('signup_status_unavailable')
    }
    const {data:status,error:statusError}=statusResult
    if(statusError){
      console.error('public signup status unavailable',{code:boundedCode(statusError.code)})
      fail('signup_status_unavailable')
    }
    const row=Array.isArray(status)?status[0]:status
    if(!row||typeof row.open!=='boolean'){
      console.error('public signup status returned no usable decision',{code:'invalid_signup_status'})
      fail('signup_status_unavailable')
    }
    if(!row.open)fail('signup_closed')
    publicSignup=true
  }

  const displayName=`${firstName} ${lastName}`.trim()
  const startPath=`/start?welcome=1&lang=${lang}`
  let signupResult
  try{
    signupResult=await supabase.auth.signUp({email,password,options:{emailRedirectTo:callbackUrl(lang,'signup',startPath,inviteId),data:{first_name:firstName,last_name:lastName,display_name:displayName,public_signup:publicSignup,onboarding_completed:false,preferred_language:lang}}})
  }catch(signupError){
    console.error('signup transport unavailable',{code:diagnosticCode(signupError,'signup_unavailable')})
    fail('email_failed')
  }
  const {data,error}=signupResult
  if(error){console.error('signup failed',{code:boundedCode(error.code)});redirect(loginUrl(lang,invitePart+'&mode=signup'+statusPart('error',authEmailErrorCode(error))))}
  if(!data?.user){
    console.error('signup returned incomplete auth state',{code:'auth_state_missing'})
    fail('email_failed')
  }
  if(Array.isArray(data.user.identities)&&data.user.identities.length===0){redirect(loginUrl(lang,invitePart+'&mode=signin'+statusPart('message','account_exists')))}
  if(data.session&&inviteId){
    const redeemed=await redeemInvite(supabase,inviteId,'new-account private')
    if(!redeemed){
      const cleanupSucceeded=await cleanupLocalSession(supabase,'post-signup-invite')
      if(!cleanupSucceeded)redirect(`/account/security?lang=${lang}&invite=${encodeURIComponent(inviteId)}&status=signout_failed`)
      redirect(loginUrl(lang,'&mode=signin'+invitePart+statusPart('error','invite_redeem_failed')))
    }
    redirect(`/start?lang=${lang}&message_code=joined_invite`)
  }
  if(data.session)redirect(startPath)
  redirect(loginUrl(lang,'&mode=signin'+invitePart+statusPart('message','account_created')))
}

export async function requestPasswordReset(formData:FormData){
  const lang=langOf(formData),next=safeJoinNext(text(formData,'next'))
  const rawInviteId=text(formData,'invite_id'),inviteId=safeInviteId(rawInviteId)
  const invitePart=inviteId?`&invite=${encodeURIComponent(inviteId)}`:''
  const nextPart=next?`&next=${encodeURIComponent(next)}`:''
  if(rawInviteId&&!inviteId)redirect(loginUrl(lang,'&mode=signin'+statusPart('error','invite_malformed')))
  const email=text(formData,'reset_email').toLowerCase()
  const emailError=emailIssue(email)
  if(emailError)redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error',emailError)))
  const supabase=await getSupabase('password reset request')
  if(!supabase)redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error','email_failed')))
  let resetResult
  try{resetResult=await supabase.auth.resetPasswordForEmail(email,{redirectTo:recoveryUrl(lang,next,inviteId)})}
  catch(error){
    console.error('requestPasswordReset transport unavailable',{code:diagnosticCode(error,'reset_request_unavailable')})
    redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error','email_failed')))
  }
  if(resetResult.error){
    console.error('requestPasswordReset failed',{code:boundedCode(resetResult.error.code)})
    redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error',authEmailErrorCode(resetResult.error))))
  }
  redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('message','reset_sent')))
}

export async function resendConfirmation(formData:FormData){
  const lang=langOf(formData),next=safeJoinNext(text(formData,'next'))
  const rawInviteId=text(formData,'invite_id'),inviteId=safeInviteId(rawInviteId)
  const invitePart=inviteId?`&invite=${encodeURIComponent(inviteId)}`:''
  const nextPart=next?`&next=${encodeURIComponent(next)}`:''
  if(rawInviteId&&!inviteId)redirect(loginUrl(lang,'&mode=signin'+statusPart('error','invite_malformed')))
  const email=text(formData,'reset_email').toLowerCase()
  const emailError=emailIssue(email)
  if(emailError)redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error',emailError)))
  const supabase=await getSupabase('confirmation resend')
  if(!supabase)redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error','email_failed')))
  const startPath=next||`/start?welcome=1&lang=${lang}`
  let resendResult
  try{resendResult=await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:callbackUrl(lang,'signup',startPath,inviteId)}})}
  catch(error){
    console.error('resendConfirmation transport unavailable',{code:diagnosticCode(error,'confirmation_resend_unavailable')})
    redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error','email_failed')))
  }
  if(resendResult.error){
    console.error('resendConfirmation failed',{code:boundedCode(resendResult.error.code)})
    redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error',authEmailErrorCode(resendResult.error))))
  }
  redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('message','confirmation_sent')))
}