'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')
const boundedCode=(value:unknown)=>String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'unknown'
const diagnosticCode=(error:unknown,fallback:string)=>{
  if(error&&typeof error==='object'&&'code' in error)return boundedCode((error as {code?:unknown}).code)
  if(error instanceof Error)return boundedCode(error.name)
  return boundedCode(fallback)
}
const EMAIL_MAX=254
const NAME_MAX=80
const PHONE_MAX=40
const NEW_PASSWORD_MAX=128
const SLUG_MAX=120

function safeChurchSlug(value:string){
  const slug=value.trim().toLowerCase()
  return slug.length<=SLUG_MAX&&/^[a-z0-9][a-z0-9_-]*$/.test(slug)?slug:''
}

function emailIssue(email:string){
  if(!email)return 'missing_email'
  if(email.length>EMAIL_MAX||/\s/.test(email))return 'invalid_email'
  const at=email.indexOf('@')
  if(at<=0||at!==email.lastIndexOf('@')||at===email.length-1)return 'invalid_email'
  return ''
}

function joinSignupErrorCode(error:{code?:unknown;status?:unknown}){
  const code=boundedCode(error?.code)
  if(code==='over_email_send_rate_limit'||code==='over_request_rate_limit'||error?.status===429)return 'email_rate_limit'
  if(code==='weak_password')return 'password_rejected'
  if(code==='email_address_invalid')return 'invalid_email'
  return 'signup_failed'
}

export async function joinChurch(formData:FormData){
  const lang:'en'|'es'=text(formData,'lang')==='es'?'es':'en'
  const slug=safeChurchSlug(text(formData,'church_slug'))
  if(!slug)redirect(`/login?lang=${lang}&mode=signin`)
  const email=text(formData,'email').toLowerCase(),phone=text(formData,'phone'),firstName=text(formData,'first_name'),lastName=text(formData,'last_name')
  const password=String(formData.get('password')??''),confirm=String(formData.get('confirm_password')??'')
  const fail=(code:string)=>redirect(`/join/${encodeURIComponent(slug)}?lang=${lang}&error_code=${encodeURIComponent(code)}`)
  if(!firstName||!lastName)fail('missing_name')
  if(firstName.length>NAME_MAX||lastName.length>NAME_MAX)fail('name_too_long')
  const emailError=emailIssue(email)
  if(emailError)fail(emailError)
  if(phone.length>PHONE_MAX)fail('phone_too_long')
  if(password.length<8)fail('weak_password')
  if(password.length>NEW_PASSWORD_MAX||confirm.length>NEW_PASSWORD_MAX)fail('password_too_long')
  if(password!==confirm)fail('password_mismatch')

  let supabase:Awaited<ReturnType<typeof createClient>>
  try{supabase=await createClient()}
  catch(error){
    console.error('public church signup client unavailable',{code:diagnosticCode(error,'client_unavailable')})
    fail('signup_status_unavailable')
  }

  let statusResult
  try{statusResult=await supabase.rpc('get_public_signup_status_for_church',{p_church_slug:slug})}
  catch(error){
    console.error('public church signup status transport unavailable',{code:diagnosticCode(error,'signup_status_unavailable')})
    fail('signup_status_unavailable')
  }
  const {data:statusData,error:statusError}=statusResult
  if(statusError){
    console.error('public church signup status unavailable',{code:boundedCode(statusError.code)})
    fail('signup_status_unavailable')
  }
  const church:any=Array.isArray(statusData)?statusData[0]:statusData
  if(!church){
    console.error('public church signup status returned no result',{churchSlug:slug,code:'empty_signup_status'})
    fail('signup_status_unavailable')
  }
  if(!church.church_id)fail('missing_church')
  if(typeof church.open!=='boolean'){
    console.error('public church signup status returned malformed result',{churchSlug:slug,code:'malformed_signup_status'})
    fail('signup_status_unavailable')
  }
  if(!church.open)fail('signup_closed')

  const startPath=`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const callback=`${siteUrl}/auth/callback?lang=${lang}&mode=signup&next=${encodeURIComponent(startPath)}`
  const emailConsent=text(formData,'email_consent')==='on',smsConsent=text(formData,'sms_consent')==='on'
  const displayName=`${firstName} ${lastName}`.trim()
  let signupResult
  try{
    signupResult=await supabase.auth.signUp({
      email,password,
      options:{emailRedirectTo:callback,data:{first_name:firstName,last_name:lastName,display_name:displayName,phone:phone||null,public_signup:true,public_signup_church_id:church.church_id,onboarding_completed:false,preferred_language:lang,join_source:'church_link',email_consent:emailConsent,sms_consent:smsConsent}}
    })
  }catch(error){
    console.error('public church signup transport unavailable',{churchSlug:slug,code:diagnosticCode(error,'signup_unavailable')})
    fail('signup_failed')
  }
  const {data,error}=signupResult
  if(error){
    console.error('public church signup failed',{churchSlug:slug,code:boundedCode(error.code)})
    fail(joinSignupErrorCode(error))
  }
  if(!data?.user){
    console.error('public church signup returned incomplete auth state',{churchSlug:slug,code:'auth_state_missing'})
    fail('signup_failed')
  }
  if(Array.isArray(data.user.identities)&&data.user.identities.length===0){
    const next=`/join/${encodeURIComponent(slug)}?lang=${lang}`
    redirect(`/login?lang=${lang}&mode=signin&next=${encodeURIComponent(next)}&message_code=account_exists`)
  }
  if(data.session)redirect(startPath)
  redirect(`/login?lang=${lang}&mode=signin&message_code=account_created`)
}

export async function joinExistingChurch(formData:FormData){
  const lang:'en'|'es'=text(formData,'lang')==='es'?'es':'en'
  const slug=safeChurchSlug(text(formData,'church_slug'))
  if(!slug)redirect(`/login?lang=${lang}&mode=signin`)
  const fail=(code:string)=>redirect(`/join/${encodeURIComponent(slug)}?lang=${lang}&error_code=${encodeURIComponent(code)}`)

  let supabase:Awaited<ReturnType<typeof createClient>>
  try{supabase=await createClient()}
  catch(error){
    console.error('existing-account church join client unavailable',{code:diagnosticCode(error,'client_unavailable')})
    fail('join_failed')
  }

  let claimsResult
  try{claimsResult=await supabase.auth.getClaims()}
  catch(error){
    console.error('existing-account church join auth transport unavailable',{code:diagnosticCode(error,'auth_unavailable')})
    fail('join_failed')
  }
  const {data:claims,error:claimsError}=claimsResult
  if(claimsError){
    console.error('existing-account church join auth unavailable',{code:boundedCode(claimsError.code)})
    fail('join_failed')
  }
  if(!claims?.claims?.sub){
    const next=`/join/${encodeURIComponent(slug)}?lang=${lang}`
    redirect(`/login?lang=${lang}&mode=signin&next=${encodeURIComponent(next)}`)
  }

  let joinResult
  try{
    joinResult=await supabase.rpc('join_public_church_existing_account',{
      p_church_slug:slug,
      p_phone:null,
      p_email_consent:false,
      p_sms_consent:false,
      p_language:lang
    })
  }catch(error){
    console.error('existing-account church join transport unavailable',{churchSlug:slug,code:diagnosticCode(error,'join_unavailable')})
    fail('join_failed')
  }
  const {data,error}=joinResult
  if(error){
    const msg=String(error.message||'').toLowerCase()
    if(msg.includes('capacity'))fail('capacity_full')
    if(msg.includes('previous church access'))fail('inactive_access')
    console.error('existing-account church join failed',{churchSlug:slug,code:boundedCode(error.code)})
    fail('join_failed')
  }
  const row:any=Array.isArray(data)?data[0]:data
  if(!row){
    console.error('existing-account church join returned no result',{churchSlug:slug,code:'empty_join_result'})
    fail('join_failed')
  }
  if(typeof row.already_member!=='boolean'){
    console.error('existing-account church join returned malformed result',{churchSlug:slug,code:'malformed_join_result'})
    fail('join_failed')
  }
  redirect(`/start?lang=${lang}&message_code=${row.already_member?'already_joined':'joined_existing'}`)
}