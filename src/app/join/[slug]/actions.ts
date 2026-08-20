'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')

function joinSignupErrorCode(message:string){
  const lower=message.toLowerCase()
  if(lower.includes('rate limit')||lower.includes('security purposes')||lower.includes('over_email_send_rate_limit'))return 'email_rate_limit'
  if(lower.includes('password'))return 'password_rejected'
  return 'signup_failed'
}

export async function joinChurch(formData:FormData){
  const supabase=await createClient()
  const lang:'en'|'es'=text(formData,'lang')==='es'?'es':'en'
  const slug=text(formData,'church_slug').toLowerCase()
  const email=text(formData,'email').toLowerCase(),phone=text(formData,'phone'),firstName=text(formData,'first_name'),lastName=text(formData,'last_name')
  const password=String(formData.get('password')??''),confirm=String(formData.get('confirm_password')??'')
  const fail=(code:string)=>redirect(`/join/${encodeURIComponent(slug)}?lang=${lang}&error_code=${encodeURIComponent(code)}`)
  if(!slug)fail('missing_church')
  if(!firstName||!lastName)fail('missing_name')
  if(!email)fail('missing_email')
  if(password.length<8)fail('weak_password')
  if(password!==confirm)fail('password_mismatch')

  const {data:statusData,error:statusError}=await supabase.rpc('get_public_signup_status_for_church',{p_church_slug:slug})
  const church:any=Array.isArray(statusData)?statusData[0]:statusData
  if(statusError||!church?.church_id||!church?.open)fail('signup_closed')

  const startPath=`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const callback=`${siteUrl}/auth/callback?lang=${lang}&mode=signup&next=${encodeURIComponent(startPath)}`
  const emailConsent=text(formData,'email_consent')==='on',smsConsent=text(formData,'sms_consent')==='on'
  const displayName=`${firstName} ${lastName}`.trim()
  const {data,error}=await supabase.auth.signUp({
    email,password,
    options:{emailRedirectTo:callback,data:{first_name:firstName,last_name:lastName,display_name:displayName,phone:phone||null,public_signup:true,public_signup_church_id:church.church_id,onboarding_completed:false,preferred_language:lang,join_source:'church_link',email_consent:emailConsent,sms_consent:smsConsent}}
  })
  if(error){
    console.error('public church signup failed',{churchSlug:slug,message:error.message})
    fail(joinSignupErrorCode(error.message))
  }
  if(data.user&&Array.isArray(data.user.identities)&&data.user.identities.length===0){
    const next=`/join/${encodeURIComponent(slug)}?lang=${lang}`
    redirect(`/login?lang=${lang}&mode=signin&next=${encodeURIComponent(next)}&message_code=account_exists`)
  }
  if(data.session)redirect(startPath)
  redirect(`/login?lang=${lang}&mode=signin&message_code=account_created`)
}

export async function joinExistingChurch(formData:FormData){
  const supabase=await createClient()
  const lang:'en'|'es'=text(formData,'lang')==='es'?'es':'en'
  const slug=text(formData,'church_slug').toLowerCase()
  const fail=(code:string)=>redirect(`/join/${encodeURIComponent(slug)}?lang=${lang}&error_code=${encodeURIComponent(code)}`)
  if(!slug)fail('missing_church')

  const {data:claims}=await supabase.auth.getClaims()
  if(!claims?.claims?.sub){
    const next=`/join/${encodeURIComponent(slug)}?lang=${lang}`
    redirect(`/login?lang=${lang}&mode=signin&next=${encodeURIComponent(next)}`)
  }

  const {data,error}=await supabase.rpc('join_public_church_existing_account',{
    p_church_slug:slug,
    p_phone:null,
    p_email_consent:false,
    p_sms_consent:false,
    p_language:lang
  })
  if(error){
    const msg=error.message.toLowerCase()
    if(msg.includes('capacity'))fail('capacity_full')
    if(msg.includes('previous church access'))fail('inactive_access')
    console.error('existing-account church join failed',{churchSlug:slug,message:error.message})
    fail('join_failed')
  }
  const row:any=Array.isArray(data)?data[0]:data
  const message=lang==='es'
    ? row?.already_member?'Tu cuenta ya estaba conectada con esta iglesia.':'Tu cuenta existente ya está conectada con esta iglesia.'
    : row?.already_member?'Your account was already connected to this church.':'Your existing account is now connected to this church.'
  redirect(`/start?lang=${lang}&message=${encodeURIComponent(message)}`)
}