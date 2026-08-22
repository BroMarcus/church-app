'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')
const langOf=(f:FormData)=>text(f,'lang')==='es'?'es':'en'
const loginUrl=(lang:string,extra='')=>`/login?lang=${lang}${extra}`
const callbackUrl=(lang:'en'|'es',mode:'signup'|'recovery',next:string)=>`${siteUrl}/auth/callback?lang=${lang}&mode=${mode}&next=${encodeURIComponent(next)}`
function safeJoinNext(value:string){
  try{
    if(!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return ''
    const base='https://kingdom.invalid'
    const parsed=new URL(value,base)
    if(parsed.origin!==base||!parsed.pathname.startsWith('/join/'))return ''
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  }catch{return ''}
}
const recoveryUrl=(lang:'en'|'es',next='')=>`${siteUrl}/auth/update-password?lang=${lang}${safeJoinNext(next)?`&next=${encodeURIComponent(safeJoinNext(next))}`:''}`
const statusPart=(kind:'error'|'message',code:string)=>`&${kind}_code=${encodeURIComponent(code)}`
const boundedCode=(value:unknown)=>String(value||'unknown').slice(0,80)
function authEmailErrorCode(message:string){
  const normalized=message.toLowerCase()
  return normalized.includes('rate limit')||normalized.includes('over_email_send_rate_limit')||normalized.includes('security purposes')?'email_rate_limit':'email_failed'
}

export async function login(formData:FormData){
  const supabase=await createClient()
  const lang=langOf(formData),next=safeJoinNext(text(formData,'next'))
  const nextPart=next?`&next=${encodeURIComponent(next)}`:''
  const email=text(formData,'email').toLowerCase(),password=String(formData.get('password')??'')
  const {data,error}=await supabase.auth.signInWithPassword({email,password})
  if(error){
    const normalized=error.message.toLowerCase()
    let code='login_failed'
    if(normalized.includes('invalid login credentials'))code='invalid_credentials'
    else if(normalized.includes('email not confirmed'))code='email_unconfirmed'
    else console.error('login failed',{code:boundedCode(error.code)})
    redirect(loginUrl(lang,'&mode=signin'+nextPart+statusPart('error',code)))
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
  const email=text(formData,'email').toLowerCase(),password=String(formData.get('password')??''),confirmPassword=String(formData.get('confirm_password')??''),firstName=text(formData,'first_name'),lastName=text(formData,'last_name'),inviteId=text(formData,'invite_id')
  const invitePart=inviteId?`&invite=${encodeURIComponent(inviteId)}`:''
  const fail=(code:string)=>redirect(loginUrl(lang,invitePart+'&mode=signup'+statusPart('error',code)))
  if(!firstName||!lastName)fail('missing_name')
  if(!email)fail('missing_email')
  if(password.length<8)fail('weak_password')
  if(password!==confirmPassword)fail('password_mismatch')

  let publicSignup=false
  if(inviteId){
    const {data:valid,error:inviteError}=await supabase.rpc('validate_invite_email',{p_invite_id:inviteId,p_email:email})
    if(inviteError){
      console.error('signup invite validation unavailable',{code:boundedCode(inviteError.code)})
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
    if(!row?.open)fail('signup_closed')
    publicSignup=true
  }

  const displayName=`${firstName} ${lastName}`.trim()
  const startPath=`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:callbackUrl(lang,'signup',startPath),data:{first_name:firstName,last_name:lastName,display_name:displayName,invite_id:inviteId||null,public_signup:publicSignup,onboarding_completed:false,preferred_language:lang}}})
  if(error){console.error('signup failed',{code:boundedCode(error.code)});redirect(loginUrl(lang,invitePart+'&mode=signup'+statusPart('error',authEmailErrorCode(error.message))))}
  if(data.user&&Array.isArray(data.user.identities)&&data.user.identities.length===0){redirect(loginUrl(lang,'&mode=signin'+statusPart('message','account_exists')))}
  if(data.session)redirect(startPath)
  redirect(loginUrl(lang,'&mode=signin'+statusPart('message','account_created')))
}

export async function requestPasswordReset(formData:FormData){
  const supabase=await createClient()
  const lang=langOf(formData),next=safeJoinNext(text(formData,'next'))
  const nextPart=next?`&next=${encodeURIComponent(next)}`:''
  const email=text(formData,'reset_email').toLowerCase()
  if(!email)redirect(loginUrl(lang,'&mode=signin'+nextPart+statusPart('error','missing_email')))
  const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:recoveryUrl(lang,next)})
  if(error){console.error('requestPasswordReset failed',{code:boundedCode(error.code)});redirect(loginUrl(lang,'&mode=signin'+nextPart+statusPart('error',authEmailErrorCode(error.message))))}
  redirect(loginUrl(lang,'&mode=signin'+nextPart+statusPart('message','reset_sent')))
}

export async function resendConfirmation(formData:FormData){
  const supabase=await createClient()
  const lang=langOf(formData),next=safeJoinNext(text(formData,'next'))
  const nextPart=next?`&next=${encodeURIComponent(next)}`:''
  const email=text(formData,'reset_email').toLowerCase()
  if(!email)redirect(loginUrl(lang,'&mode=signin'+nextPart+statusPart('error','missing_email')))
  const startPath=next||`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const {error}=await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:callbackUrl(lang,'signup',startPath)}})
  if(error){console.error('resendConfirmation failed',{code:boundedCode(error.code)});redirect(loginUrl(lang,'&mode=signin'+nextPart+statusPart('error',authEmailErrorCode(error.message))))}
  redirect(loginUrl(lang,'&mode=signin'+nextPart+statusPart('message','confirmation_sent')))
}