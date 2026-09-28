'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PUBLIC_APP_ORIGIN } from '@/lib/public-app-origin'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const siteUrl=PUBLIC_APP_ORIGIN

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
    redirect(`/login?lang=${lang}&mode=signin&next=${encodeURIComponent(base)}&message=${encodeURIComponent(lang==='es'?'Ese correo ya tiene una cuenta. Inicia sesión y tu cuenta existente se conservará.':'That email already has an account. Sign in and your existing account will be kept.')}`)
  }
  if(data.session)redirect(startPath)
  redirect(`/login?lang=${lang}&mode=signin&message=${encodeURIComponent(lang==='es'?`Cuenta creada para ${join.church_name} por medio de ${join.group_name}. Revisa tu correo y confirma la cuenta.`:`Account created for ${join.church_name} through ${join.group_name}. Check your email and confirm the account.`)}`)
}


export async function joinExistingThroughGroup(formData:FormData){
  const supabase=await createClient()
  const lang=text(formData,'lang')==='es'?'es':'en'
  const slug=text(formData,'church_slug').toLowerCase(),groupId=text(formData,'group_id')
  const base=`/join/${encodeURIComponent(slug)}/group/${encodeURIComponent(groupId)}?lang=${lang}`
  const fail=(en:string,es:string)=>redirect(`${base}&error=${encodeURIComponent(lang==='es'?es:en)}`)
  if(!slug||!groupId)fail('Friendship Group link is incomplete.','El enlace del Grupo de Amistad está incompleto.')

  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}&mode=signin&next=${encodeURIComponent(base)}`)

  const {data:joinData,error:joinError}=await supabase.rpc('get_public_friendship_group_join',{p_church_slug:slug,p_group_id:groupId})
  const join:any=Array.isArray(joinData)?joinData[0]:joinData
  if(joinError||!join?.church_id||!join?.group_id)fail('This Friendship Group join link is not available.','Este enlace del Grupo de Amistad no está disponible.')
  if(!join.open)fail('This church is not accepting public signups right now.','Esta iglesia no está aceptando registros públicos en este momento.')

  const {error:churchJoinError}=await supabase.rpc('join_public_church_existing_account',{
    p_church_slug:slug,
    p_phone:null,
    p_email_consent:false,
    p_sms_consent:false,
    p_language:lang
  })
  if(churchJoinError){
    const message=churchJoinError.message.toLowerCase()
    if(message.includes('previous church access'))fail('Your previous access to this church is inactive. Ask a church administrator to restore it.','Tu acceso anterior a esta iglesia está inactivo. Pide a un administrador que lo restaure.')
    if(message.includes('capacity'))fail('This church’s public pilot is currently full.','El piloto público de esta iglesia está lleno en este momento.')
    console.error('existing-account group church join failed',{churchSlug:slug,groupId,message:churchJoinError.message})
    fail('We could not connect your account to this church yet.','Todavía no pudimos conectar tu cuenta con esta iglesia.')
  }

  const {data:membership}=await supabase.from('group_memberships').select('group_id,groups(name,group_type,active)').eq('user_id',userId)
  const rows=membership??[]
  const already=rows.some((row:any)=>row.group_id===groupId)
  if(already){
    const message=lang==='es'?'Tu cuenta ya está conectada con este Grupo de Amistad.':'Your account is already connected to this Friendship Group.'
    redirect(`/start?lang=${lang}&message=${encodeURIComponent(message)}`)
  }
  const otherFriendship=rows.find((row:any)=>{const group=Array.isArray(row.groups)?row.groups[0]:row.groups;return group?.active&&group?.group_type==='friendship'&&row.group_id!==groupId})
  if(otherFriendship)fail('You already belong to another active Friendship Group. Ask a leader if you need to transfer groups.','Ya perteneces a otro Grupo de Amistad activo. Pide ayuda a un líder si necesitas cambiar de grupo.')

  const {data:pending}=await supabase.from('group_join_requests').select('id').eq('group_id',groupId).eq('user_id',userId).eq('status','pending').limit(1).maybeSingle()
  if(!pending?.id){
    const {error:requestError}=await supabase.from('group_join_requests').insert({group_id:groupId,church_id:join.church_id,user_id:userId,message:lang==='es'?'Solicitud enviada desde la invitación del Grupo de Amistad.':'Request sent from the Friendship Group invitation.'})
    if(requestError&&requestError.code!=='23505'){
      console.error('existing-account group request failed',{churchSlug:slug,groupId,message:requestError.message})
      fail('Your church connection is ready, but we could not send the Friendship Group request. Try again.','Tu conexión con la iglesia está lista, pero no pudimos enviar la solicitud al Grupo de Amistad. Inténtalo otra vez.')
    }
  }

  const message=lang==='es'
    ? `Tu cuenta está conectada con ${join.church_name}. Enviamos tu solicitud a ${join.group_name} para que el líder pueda darte seguimiento.`
    : `Your account is connected to ${join.church_name}. We sent your request to ${join.group_name} so the group leader can follow up.`
  redirect(`/start?lang=${lang}&message=${encodeURIComponent(message)}`)
}
