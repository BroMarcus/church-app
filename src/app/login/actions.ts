'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')

function friendlyAuthEmailError(message:string){
  const normalized=message.toLowerCase()
  if(normalized.includes('rate limit')||normalized.includes('over_email_send_rate_limit')||normalized.includes('security purposes')){
    return 'Too many account emails were requested in a short period. Please wait about one minute, then request one fresh email. Repeated clicks can keep the cooldown active.'
  }
  return message
}

export async function login(formData:FormData){
  const supabase=await createClient()
  const email=text(formData,'email').toLowerCase(),password=String(formData.get('password')??'')
  const {data,error}=await supabase.auth.signInWithPassword({email,password})
  if(error){
    const message=error.message.toLowerCase().includes('invalid login credentials')
      ? 'We could not sign you in. Double-check the email and password you created. If you just made this account, use Forgot password below to set a new password.'
      : error.message
    redirect('/login?error='+encodeURIComponent(message))
  }
  const userId=data.user?.id
  if(userId){
    const [{data:profile},{count:groups},{count:enrollments}]=await Promise.all([
      supabase.from('profiles').select('first_name,last_name,display_name,bio').eq('id',userId).maybeSingle(),
      supabase.from('group_memberships').select('*',{count:'exact',head:true}).eq('user_id',userId),
      supabase.from('course_enrollments').select('*',{count:'exact',head:true}).eq('user_id',userId)
    ])
    const hasBasicProfile=Boolean(profile?.first_name&&profile?.last_name)
    const hasActivity=(groups??0)>0||(enrollments??0)>0||Boolean(profile?.bio)
    if(hasBasicProfile&&!hasActivity)redirect('/start?welcome=1')
  }
  redirect('/')
}

export async function signup(formData:FormData){
  const supabase=await createClient()
  const email=text(formData,'email').toLowerCase(),password=String(formData.get('password')??''),confirmPassword=String(formData.get('confirm_password')??''),firstName=text(formData,'first_name'),lastName=text(formData,'last_name'),inviteId=text(formData,'invite_id')
  if(!inviteId)redirect('/login?error='+encodeURIComponent('A valid church invitation is required to create a member account.'))
  if(!firstName||!lastName)redirect(`/login?invite=${encodeURIComponent(inviteId)}&error=`+encodeURIComponent('First and last name are required to create your account.'))
  if(password!==confirmPassword)redirect(`/login?invite=${encodeURIComponent(inviteId)}&error=`+encodeURIComponent('The two passwords do not match. Please type them again.'))
  const {data:valid,error:inviteError}=await supabase.rpc('validate_invite_email',{p_invite_id:inviteId,p_email:email})
  if(inviteError||!valid)redirect(`/login?invite=${encodeURIComponent(inviteId)}&error=`+encodeURIComponent('This invitation is expired, already used, revoked, or belongs to a different email address.'))
  const displayName=`${firstName} ${lastName}`.trim()
  const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:`${siteUrl}/start?welcome=1`,data:{first_name:firstName,last_name:lastName,display_name:displayName,invite_id:inviteId}}})
  if(error)redirect(`/login?invite=${encodeURIComponent(inviteId)}&error=`+encodeURIComponent(friendlyAuthEmailError(error.message)))
  if(data.session)redirect('/start?welcome=1')
  redirect('/login?message='+encodeURIComponent('Account created. We sent a confirmation email. If you do not see it, check Spam/Junk. After confirming, sign in with the password you created and we will guide you through Start Here.'))
}

export async function requestPasswordReset(formData:FormData){
  const supabase=await createClient()
  const email=text(formData,'reset_email').toLowerCase()
  if(!email)redirect('/login?error='+encodeURIComponent('Enter your email address first.'))
  const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${siteUrl}/auth/update-password`})
  if(error)redirect('/login?error='+encodeURIComponent(friendlyAuthEmailError(error.message)))
  redirect('/login?message='+encodeURIComponent('Password reset email sent. Check your Inbox and Spam/Junk folder, then open the newest reset link to choose a new password. If you need another email, wait at least one minute before requesting it.'))
}
