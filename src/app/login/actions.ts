'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

export async function login(formData:FormData){
  const supabase=await createClient()
  const email=text(formData,'email'),password=String(formData.get('password')??'')
  const {error}=await supabase.auth.signInWithPassword({email,password})
  if(error)redirect('/login?error='+encodeURIComponent(error.message))
  redirect('/')
}

export async function signup(formData:FormData){
  const supabase=await createClient()
  const email=text(formData,'email').toLowerCase(),password=String(formData.get('password')??''),firstName=text(formData,'first_name'),lastName=text(formData,'last_name'),inviteId=text(formData,'invite_id')
  if(!inviteId)redirect('/login?error='+encodeURIComponent('A valid church invitation is required to create a member account.'))
  if(!firstName||!lastName)redirect(`/login?invite=${encodeURIComponent(inviteId)}&error=`+encodeURIComponent('First and last name are required to create your account.'))
  const {data:valid,error:inviteError}=await supabase.rpc('validate_invite_email',{p_invite_id:inviteId,p_email:email})
  if(inviteError||!valid)redirect(`/login?invite=${encodeURIComponent(inviteId)}&error=`+encodeURIComponent('This invitation is expired, already used, revoked, or belongs to a different email address.'))
  const displayName=`${firstName} ${lastName}`.trim()
  const h=await headers()
  const origin=h.get('origin')||'https://kingdom-network-app.vercel.app'
  const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:origin,data:{first_name:firstName,last_name:lastName,display_name:displayName,invite_id:inviteId}}})
  if(error)redirect(`/login?invite=${encodeURIComponent(inviteId)}&error=`+encodeURIComponent(error.message))
  if(data.session)redirect('/')
  redirect('/login?message='+encodeURIComponent('Account created. Check your email to confirm your account, then sign in.'))
}
