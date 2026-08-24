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
  const supabase=await createClient()
  const lang=langOf(formData),next=safeJoinNext(text(formData,'next'))
  const rawInviteId=text(formData,'invite_id'),inviteId=safeInviteId(rawInviteId)
  const invitePart=inviteId?`&invite=${encodeURIComponent(inviteId)}`:''
  const nextPart=next?`&next=${encodeURIComponent(next)}`:''
  if(rawInviteId&&!inviteId)redirect(loginUrl(lang,'&mode=signin'+statusPart('error','invite_invalid')))
  const email=text(formData,'email').toLowerCase(),password=String(formData.get('password')??'')
  const emailError=emailIssue(email)
  if(emailError)redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error',emailError)))
  if(!password)redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error','missing_password')))
  if(password.length>EXISTING_PASSWORD_MAX)redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error','password_too_long')))
  const {data,error}=await supabase.auth.signInWithPassword({email,password})
  if(error){
    const authCode=boundedCode(error.code)
    let code='login_failed'
    if(authCode==='invalid_credentials')code='invalid_credentials'
    else if(authCode==='email_not_confirmed')code='email_unconfirmed'
    else console.error('login unavailable',{code:authCode,status:typeof error.status==='number'?String(error.status).slice(0,3):'unknown'})
    redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error',code)))
  }
  if(inviteId){
    const {data:redeemed,error:redeemError}=await supabase.rpc('redeem_invite_for_current_user',{p_invite_id:inviteId})
    const row=Array.isArray(redeemed)?redeemed[0]:redeemed
    if(redeemError||!row?.church_id){
      console.error('existing-account private invitation redemption failed',{code:redeemError?boundedCode(redeemError.code):'empty_redeem_result'})
      const {error:signOutError}=await supabase.auth.signOut({scope:'local'})
      if(signOutError)console.error('post-invite-failure sign out failed',{code:boundedCode(signOutError.code)})
      redirect(loginUrl(lang,'&mode=signin'+invitePart+statusPart('error','invite_redeem_failed')))
    }
    redirect(`/start?lang=${lang}&message_code=joined_existing`)
  }
  if(next)redirect(next)
  const userId=data.user?.id
  if(userId){
    const onboardingState=data.user?.user_metadata?.onboarding_completed
    if(onboardingState===false)redirect(`/start?welcome=1${lang==='es'?'&lang=es':''}`)
    if(onboardingState===undefined){
      const [profileResult,groupsResult,enrollmentsResult]=await Promise.all([
        supabase.from('profiles').select('first_name,last_name,display_name,bio').eq('id',userId).maybeSingle(),
        supabase.from('group_memberships').select('*',{count:'exact',head:true}).eq('user_id',userId),
        supabase.from('course_enrollments').select('*',{count:'exact',head:true}).eq('user_id',userId)
      ])
      const inferenceError=profileResult.error||groupsResult.error||enrollmentsResult.error
      if(inferenceError){
        console.error('legacy onboarding inference unavailable',{
          profile:profileResult.error?boundedCode(profileResult.error.code):'ok',
          groups:groupsResult.error?boundedCode(groupsResult.error.code):'ok',
          enrollments:enrollmentsResult.error?boundedCode(enrollmentsResult.error.code):'ok'
        })
      }else{
        const profile=profileResult.data
        const hasBasicProfile=Boolean(profile?.first_name&&profile?.last_name)
        const hasActivity=(groupsResult.count??0)>0||(enrollmentsResult.count??0)>0||Boolean(profile?.bio)
        if(hasBasicProfile&&!hasActivity)redirect(`/start?welcome=1${lang==='es'?'&lang=es':''}`)
      }
    }
  }
  redirect(lang==='es'?'/?lang=es':'/')
}

export async function signup(formData:FormData){
  const supabase=await createClient()
  const lang=langOf(formData)
  const email=text(formData,'email').toLowerCase(),password=String(formData.get('password')??''),confirmPassword=String(formData.get('confirm_password')??''),firstName=text(formData,'first_name'),lastName=text(formData,'last_name'),rawInviteId=text(formData,'invite_id')
  const inviteId=safeInviteId(rawInviteId)
  const invitePart=inviteId?`&invite=${encodeURIComponent(inviteId)}`:''
  const fail=(code:string)=>redirect(loginUrl(lang,invitePart+'&mode=signup'+statusPart('error',code)))
  if(rawInviteId&&!inviteId)fail('invite_invalid')
  if(!firstName||!lastName)fail('missing_name')
  if(firstName.length>NAME_MAX||lastName.length>NAME_MAX)fail('name_too_long')
  const emailError=emailIssue(email)
  if(emailError)fail(emailError)
  if(password.length<8)fail('weak_password')
  if(password.length>NEW_PASSWORD_MAX||confirmPassword.length>NEW_PASSWORD_MAX)fail('password_too_long')
  if(password!==confirmPassword)fail('password_mismatch')

  let publicSignup=false
  if(inviteId){
    const {data:valid,error:inviteError}=await supabase.rpc('validate_invite_email',{p_invite_id:inviteId,p_email:email})
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
    const {data:status,error:statusError}=await supabase.rpc('get_public_signup_status')
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
  const startPath=`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:callbackUrl(lang,'signup',startPath),data:{first_name:firstName,last_name:lastName,display_name:displayName,invite_id:inviteId||null,public_signup:publicSignup,onboarding_completed:false,preferred_language:lang}}})
  if(error){console.error('signup failed',{code:boundedCode(error.code)});redirect(loginUrl(lang,invitePart+'&mode=signup'+statusPart('error',authEmailErrorCode(error))))}
  if(data.user&&Array.isArray(data.user.identities)&&data.user.identities.length===0){redirect(loginUrl(lang,invitePart+'&mode=signin'+statusPart('message','account_exists')))}
  if(data.session)redirect(startPath)
  redirect(loginUrl(lang,'&mode=signin'+statusPart('message','account_created')))
}

export async function requestPasswordReset(formData:FormData){
  const supabase=await createClient()
  const lang=langOf(formData),next=safeJoinNext(text(formData,'next'))
  const rawInviteId=text(formData,'invite_id'),inviteId=safeInviteId(rawInviteId)
  const invitePart=inviteId?`&invite=${encodeURIComponent(inviteId)}`:''
  const nextPart=next?`&next=${encodeURIComponent(next)}`:''
  if(rawInviteId&&!inviteId)redirect(loginUrl(lang,'&mode=signin'+statusPart('error','invite_invalid')))
  const email=text(formData,'reset_email').toLowerCase()
  const emailError=emailIssue(email)
  if(emailError)redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error',emailError)))
  const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:recoveryUrl(lang,next,inviteId)})
  if(error){console.error('requestPasswordReset failed',{code:boundedCode(error.code)});redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error',authEmailErrorCode(error))))}
  redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('message','reset_sent')))
}

export async function resendConfirmation(formData:FormData){
  const supabase=await createClient()
  const lang=langOf(formData),next=safeJoinNext(text(formData,'next'))
  const rawInviteId=text(formData,'invite_id'),inviteId=safeInviteId(rawInviteId)
  const invitePart=inviteId?`&invite=${encodeURIComponent(inviteId)}`:''
  const nextPart=next?`&next=${encodeURIComponent(next)}`:''
  if(rawInviteId&&!inviteId)redirect(loginUrl(lang,'&mode=signin'+statusPart('error','invite_invalid')))
  const email=text(formData,'reset_email').toLowerCase()
  const emailError=emailIssue(email)
  if(emailError)redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error',emailError)))
  const startPath=next||`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const {error}=await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:callbackUrl(lang,'signup',startPath,inviteId)}})
  if(error){console.error('resendConfirmation failed',{code:boundedCode(error.code)});redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('error',authEmailErrorCode(error))))}
  redirect(loginUrl(lang,'&mode=signin'+invitePart+nextPart+statusPart('message','confirmation_sent')))
}