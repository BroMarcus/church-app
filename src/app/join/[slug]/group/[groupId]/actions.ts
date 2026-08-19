'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')

export async function joinThroughGroup(formData:FormData){
  const supabase=await createClient()
  const lang=text(formData,'lang')==='es'?'es':'en'
  const slug=text(formData,'church_slug').toLowerCase(),groupId=text(formData,'group_id')
  const email=text(formData,'email').toLowerCase(),phone=text(formData,'phone'),firstName=text(formData,'first_name'),lastName=text(formData,'last_name')
  const password=String(formData.get('password')??''),confirm=String(formData.get('confirm_password')??'')
  const base=`/join/${encodeURIComponent(slug)}/group/${encodeURIComponent(groupId)}?lang=${lang}`
  const fail=(en:string,es:string)=>redirect(`${base}&error=${encodeURIComponent(lang==='es'?es:en)}`)
  if(!slug||!groupId)fail('Friendship Group link is incomplete.','El enlace del Grupo de Amistad está incompleto.')
  if(!firstName||!lastName)fail('First and last name are required.','Se requieren nombre y apellido.')
  if(!email)fail('Enter your email address.','Escribe tu correo electrónico.')
  if(password.length<8)fail('Your password must be at least 8 characters.','Tu contraseña debe tener por lo menos 8 caracteres.')
  if(password!==confirm)fail('The passwords do not match.','Las contraseñas no coinciden.')

  const {data:joinData,error:joinError}=await supabase.rpc('get_public_friendship_group_join',{p_church_slug:slug,p_group_id:groupId})
  const join:any=Array.isArray(joinData)?joinData[0]:joinData
  if(joinError||!join?.church_id||!join?.group_id)fail('This Friendship Group join link is not available.','Este enlace del Grupo de Amistad no está disponible.')
  if(!join.open)fail('This church is not accepting public signups right now.','Esta iglesia no está aceptando registros públicos en este momento.')

  const startPath=`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const callback=`${siteUrl}/auth/callback?lang=${lang}&mode=signup&next=${encodeURIComponent(startPath)}`
  const emailConsent=text(formData,'email_consent')==='on',smsConsent=text(formData,'sms_consent')==='on'
  const displayName=`${firstName} ${lastName}`.trim()
  const {data,error}=await supabase.auth.signUp({
    email,password,
    options:{emailRedirectTo:callback,data:{first_name:firstName,last_name:lastName,display_name:displayName,phone:phone||null,public_signup:true,public_signup_church_id:join.church_id,onboarding_completed:false,preferred_language:lang,join_source:'friendship_group',join_group_id:join.group_id,email_consent:emailConsent,sms_consent:smsConsent}}
  })
  if(error){
    const lower=error.message.toLowerCase()
    if(lower.includes('rate limit')||lower.includes('security purposes'))fail('Too many confirmation emails were requested. Wait about one minute and try again.','Se solicitaron demasiados correos. Espera aproximadamente un minuto e inténtalo otra vez.')
    fail(error.message,error.message)
  }
  if(data.user&&Array.isArray(data.user.identities)&&data.user.identities.length===0){
    redirect(`/login?lang=${lang}&mode=signin&message=${encodeURIComponent(lang==='es'?'Ese correo ya tiene una cuenta. Inicia sesión y tu cuenta existente se conservará.':'That email already has an account. Sign in and your existing account will be kept.')}`)
  }
  if(data.session)redirect(startPath)
  redirect(`/login?lang=${lang}&mode=signin&message=${encodeURIComponent(lang==='es'?`Cuenta creada para ${join.church_name} por medio de ${join.group_name}. Revisa tu correo y confirma la cuenta.`:`Account created for ${join.church_name} through ${join.group_name}. Check your email and confirm the account.`)}`)
}
