'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')

function friendlySignupError(message:string,lang:'en'|'es'){
  const lower=message.toLowerCase()
  if(lower.includes('rate limit')||lower.includes('over_email_send_rate_limit')||lower.includes('security purposes')){
    return lang==='es'
      ? 'Se solicitaron demasiados correos en poco tiempo. Espera aproximadamente un minuto y solicita solo un correo nuevo.'
      : 'Too many account emails were requested in a short period. Wait about one minute, then request one fresh email.'
  }
  if(lower.includes('already registered')||lower.includes('already been registered')||lower.includes('user already registered')){
    return lang==='es'
      ? 'Ese correo ya tiene una cuenta. Inicia sesión con esa cuenta en vez de crear otra.'
      : 'That email already has an account. Sign in with that account instead of creating another one.'
  }
  return lang==='es'
    ? 'No pudimos crear la cuenta en este momento. Inténtalo otra vez en unos momentos. Si ya tienes una cuenta, inicia sesión.'
    : 'We could not create the account right now. Try again in a moment. If you already have an account, sign in instead.'
}

export async function joinChurch(formData:FormData){
  const supabase=await createClient()
  const lang=text(formData,'lang')==='es'?'es':'en'
  const slug=text(formData,'church_slug').toLowerCase()
  const email=text(formData,'email').toLowerCase(),phone=text(formData,'phone'),firstName=text(formData,'first_name'),lastName=text(formData,'last_name')
  const password=String(formData.get('password')??''),confirm=String(formData.get('confirm_password')??'')
  const fail=(en:string,es:string)=>redirect(`/join/${encodeURIComponent(slug)}?lang=${lang}&error=${encodeURIComponent(lang==='es'?es:en)}`)
  if(!slug)fail('Church link is missing.','Falta el enlace de la iglesia.')
  if(!firstName||!lastName)fail('First and last name are required.','Se requieren nombre y apellido.')
  if(!email)fail('Enter your email address.','Escribe tu correo electrónico.')
  if(password.length<8)fail('Your password must be at least 8 characters.','Tu contraseña debe tener por lo menos 8 caracteres.')
  if(password!==confirm)fail('The passwords do not match.','Las contraseñas no coinciden.')

  const {data:statusData,error:statusError}=await supabase.rpc('get_public_signup_status_for_church',{p_church_slug:slug})
  const church:any=Array.isArray(statusData)?statusData[0]:statusData
  if(statusError||!church?.church_id||!church?.open)fail('This church is not accepting public signups right now.','Esta iglesia no está aceptando registros públicos en este momento.')

  const startPath=`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const callback=`${siteUrl}/auth/callback?lang=${lang}&mode=signup&next=${encodeURIComponent(startPath)}`
  const emailConsent=text(formData,'email_consent')==='on',smsConsent=text(formData,'sms_consent')==='on'
  const displayName=`${firstName} ${lastName}`.trim()
  const {data,error}=await supabase.auth.signUp({
    email,password,
    options:{emailRedirectTo:callback,data:{first_name:firstName,last_name:lastName,display_name:displayName,phone:phone||null,public_signup:true,public_signup_church_id:church.church_id,onboarding_completed:false,preferred_language:lang,join_source:'church_link',email_consent:emailConsent,sms_consent:smsConsent}}
  })
  if(error){
    console.error('joinChurch signup failed',{message:error.message})
    const message=friendlySignupError(error.message,lang)
    fail(message,message)
  }
  if(data.user&&Array.isArray(data.user.identities)&&data.user.identities.length===0){
    const message=lang==='es'
      ? 'Ese correo ya tiene una cuenta. Inicia sesión con tu cuenta existente. Si todavía no estás conectado con esta iglesia, un administrador puede añadir tu cuenta sin crear otra.'
      : 'That email already has an account. Sign in with your existing account. If you are not connected to this church yet, a church admin can add that account without creating another one.'
    redirect(`/login?lang=${lang}&mode=signin&message=${encodeURIComponent(message)}`)
  }
  if(data.session)redirect(startPath)
  redirect(`/login?lang=${lang}&mode=signin&message=${encodeURIComponent(lang==='es'?`Cuenta creada para ${church.church_name}. Revisa tu correo y confirma la cuenta; después irás a Empieza Aquí.`:`Account created for ${church.church_name}. Check your email and confirm the account; then you’ll go to Start Here.`)}`)
}
