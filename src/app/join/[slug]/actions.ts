'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')

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
    const lower=error.message.toLowerCase()
    if(lower.includes('rate limit')||lower.includes('security purposes'))fail('Too many confirmation emails were requested. Wait about one minute and try once more.','Se solicitaron demasiados correos. Espera aproximadamente un minuto e inténtalo una vez más.')
    fail(error.message,error.message)
  }
  if(data.user&&Array.isArray(data.user.identities)&&data.user.identities.length===0){
    redirect(`/login?lang=${lang}&mode=signin&message=${encodeURIComponent(lang==='es'?'Ese correo ya tiene una cuenta. Inicia sesión y Kingdom Network conservará tu cuenta existente.':'That email already has an account. Sign in and Kingdom Network will keep your existing account.')}`)
  }
  if(data.session)redirect(startPath)
  redirect(`/login?lang=${lang}&mode=signin&message=${encodeURIComponent(lang==='es'?`Cuenta creada para ${church.church_name}. Revisa tu correo y confirma la cuenta; después irás a Empieza Aquí.`:`Account created for ${church.church_name}. Check your email and confirm the account; then you’ll go to Start Here.`)}`)
}
