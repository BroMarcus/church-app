'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')
const langOf=(f:FormData)=>text(f,'lang')==='es'?'es':'en'
const loginUrl=(lang:string,extra='')=>`/login?lang=${lang}${extra}`
const callbackUrl=(lang:'en'|'es',mode:'signup'|'recovery',next:string)=>`${siteUrl}/auth/callback?lang=${lang}&mode=${mode}&next=${encodeURIComponent(next)}`
const recoveryUrl=(lang:'en'|'es')=>`${siteUrl}/auth/update-password?lang=${lang}`

function friendlyAuthEmailError(message:string,lang:'en'|'es'){
  const normalized=message.toLowerCase()
  if(normalized.includes('rate limit')||normalized.includes('over_email_send_rate_limit')||normalized.includes('security purposes')){
    return lang==='es'
      ? 'Se solicitaron demasiados correos en poco tiempo. Espera aproximadamente un minuto y solicita solo un correo nuevo. Hacer clic repetidamente puede extender la espera.'
      : 'Too many account emails were requested in a short period. Please wait about one minute, then request one fresh email. Repeated clicks can keep the cooldown active.'
  }
  return lang==='es'
    ? 'No pudimos enviar el correo de la cuenta en este momento. Espera un momento e inténtalo otra vez.'
    : 'We could not send the account email right now. Wait a moment and try again.'
}

export async function login(formData:FormData){
  const supabase=await createClient()
  const lang=langOf(formData)
  const email=text(formData,'email').toLowerCase(),password=String(formData.get('password')??'')
  const {data,error}=await supabase.auth.signInWithPassword({email,password})
  if(error){
    const normalized=error.message.toLowerCase()
    let message=lang==='es'
      ? 'No pudimos iniciar sesión. Revisa tus datos e inténtalo otra vez.'
      : 'We could not sign you in. Check your information and try again.'
    if(normalized.includes('invalid login credentials')) message=lang==='es'
      ? 'No pudimos iniciar sesión. Revisa el correo y la contraseña. Si no recuerdas la contraseña, usa “Olvidé mi contraseña” abajo.'
      : 'We could not sign you in. Double-check the email and password you created. If you just made this account, use Forgot password below to set a new password.'
    else if(normalized.includes('email not confirmed')) message=lang==='es'
      ? 'Tu correo todavía no está confirmado. Abre el correo de confirmación más reciente que te enviamos y confirma tu cuenta antes de iniciar sesión.'
      : 'Your email is not confirmed yet. Open the newest confirmation email we sent and confirm your account before signing in.'
    // Invalid credentials and unconfirmed email are normal member mistakes, not
    // production incidents. Keep unexpected auth failures visible to monitoring.
    if(!normalized.includes('invalid login credentials')&&!normalized.includes('email not confirmed')){
      console.error('login failed',{message:error.message})
    }
    redirect(loginUrl(lang,'&mode=signin&error='+encodeURIComponent(message)))
  }
  const userId=data.user?.id
  if(userId){
    const onboardingState=data.user?.user_metadata?.onboarding_completed
    if(onboardingState===false)redirect(`/start?welcome=1${lang==='es'?'&lang=es':''}`)
    if(onboardingState===undefined){
      const [{data:profile},{count:groups},{count:enrollments}]=await Promise.all([
        supabase.from('profiles').select('first_name,last_name,display_name,bio').eq('id',userId).maybeSingle(),
        supabase.from('group_memberships').select('*',{count:'exact',head:true}).eq('user_id',userId),
        supabase.from('course_enrollments').select('*',{count:'exact',head:true}).eq('user_id',userId)
      ])
      const hasBasicProfile=Boolean(profile?.first_name&&profile?.last_name)
      const hasActivity=(groups??0)>0||(enrollments??0)>0||Boolean(profile?.bio)
      if(hasBasicProfile&&!hasActivity)redirect(`/start?welcome=1${lang==='es'?'&lang=es':''}`)
    }
  }
  redirect(lang==='es'?'/?lang=es':'/')
}

export async function signup(formData:FormData){
  const supabase=await createClient()
  const lang=langOf(formData)
  const email=text(formData,'email').toLowerCase(),password=String(formData.get('password')??''),confirmPassword=String(formData.get('confirm_password')??''),firstName=text(formData,'first_name'),lastName=text(formData,'last_name'),inviteId=text(formData,'invite_id')
  const invitePart=inviteId?`&invite=${encodeURIComponent(inviteId)}`:''
  const fail=(en:string,es:string)=>redirect(loginUrl(lang,invitePart+'&mode=signup&error='+encodeURIComponent(lang==='es'?es:en)))
  if(!firstName||!lastName)fail('First and last name are required to create your account.','Se requieren nombre y apellido para crear tu cuenta.')
  if(!email)fail('Enter your email address.','Escribe tu correo electrónico.')
  if(password.length<8)fail('Your password must be at least 8 characters.','Tu contraseña debe tener por lo menos 8 caracteres.')
  if(password!==confirmPassword)fail('The two passwords do not match. Please type them again.','Las dos contraseñas no coinciden. Escríbelas de nuevo.')

  let publicSignup=false
  if(inviteId){
    const {data:valid,error:inviteError}=await supabase.rpc('validate_invite_email',{p_invite_id:inviteId,p_email:email})
    if(inviteError||!valid)fail('This invitation is expired, already used, revoked, or belongs to a different email address.','Esta invitación venció, ya fue usada, fue cancelada o pertenece a otro correo electrónico.')
  }else{
    const {data:status}=await supabase.rpc('get_public_signup_status')
    const row=Array.isArray(status)?status[0]:status
    if(!row?.open)fail('Public pilot signup is temporarily unavailable.','El registro público del piloto no está disponible temporalmente.')
    publicSignup=true
  }

  const displayName=`${firstName} ${lastName}`.trim()
  const startPath=`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:callbackUrl(lang,'signup',startPath),data:{first_name:firstName,last_name:lastName,display_name:displayName,invite_id:inviteId||null,public_signup:publicSignup,onboarding_completed:false,preferred_language:lang}}})
  if(error){console.error('signup failed',{message:error.message});redirect(loginUrl(lang,invitePart+'&mode=signup&error='+encodeURIComponent(friendlyAuthEmailError(error.message,lang))))}
  if(data.user&&Array.isArray(data.user.identities)&&data.user.identities.length===0){
    const message=lang==='es'
      ? 'Ese correo ya tiene una cuenta. Inicia sesión con tu contraseña existente o usa “Olvidé mi contraseña” si no la recuerdas.'
      : 'That email already has an account. Sign in with your existing password, or use “I forgot my password” if you do not remember it.'
    redirect(loginUrl(lang,'&mode=signin&message='+encodeURIComponent(message)))
  }
  if(data.session)redirect(startPath)
  const message=lang==='es'
    ? 'Cuenta creada. Enviamos un correo de confirmación. Revisa también Spam/Correo no deseado. Abre el correo más reciente; después te llevaremos directamente a Empieza Aquí.'
    : 'Account created. We sent a confirmation email. Check Spam/Junk too. Open the newest email; after confirmation we will take you directly to Start Here.'
  redirect(loginUrl(lang,'&mode=signin&message='+encodeURIComponent(message)))
}

export async function requestPasswordReset(formData:FormData){
  const supabase=await createClient()
  const lang=langOf(formData)
  const email=text(formData,'reset_email').toLowerCase()
  if(!email)redirect(loginUrl(lang,'&mode=signin&error='+encodeURIComponent(lang==='es'?'Escribe primero tu correo electrónico.':'Enter your email address first.')))
  // Password recovery must land in the browser. Supabase may return the recovery
  // session in the URL fragment, which a server Route Handler cannot read.
  const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:recoveryUrl(lang)})
  if(error){console.error('requestPasswordReset failed',{message:error.message});redirect(loginUrl(lang,'&mode=signin&error='+encodeURIComponent(friendlyAuthEmailError(error.message,lang))))}
  const message=lang==='es'
    ? 'Correo para cambiar la contraseña enviado. Revisa Recibidos y Spam/Correo no deseado. Abre solamente el enlace más reciente.'
    : 'Password reset email sent. Check Inbox and Spam/Junk, then open only the newest reset link.'
  redirect(loginUrl(lang,'&mode=signin&message='+encodeURIComponent(message)))
}

export async function resendConfirmation(formData:FormData){
  const supabase=await createClient()
  const lang=langOf(formData)
  const email=text(formData,'reset_email').toLowerCase()
  if(!email)redirect(loginUrl(lang,'&mode=signin&error='+encodeURIComponent(lang==='es'?'Escribe primero tu correo electrónico.':'Enter your email address first.')))
  const startPath=`/start?welcome=1${lang==='es'?'&lang=es':''}`
  const {error}=await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:callbackUrl(lang,'signup',startPath)}})
  if(error){console.error('resendConfirmation failed',{message:error.message});redirect(loginUrl(lang,'&mode=signin&error='+encodeURIComponent(friendlyAuthEmailError(error.message,lang))))}
  const message=lang==='es'
    ? 'Correo de confirmación enviado otra vez. Abre solamente el correo más reciente y revisa Spam/Correo no deseado si no aparece.'
    : 'Confirmation email sent again. Open only the newest email and check Spam/Junk if you do not see it.'
  redirect(loginUrl(lang,'&mode=signin&message='+encodeURIComponent(message)))
}
