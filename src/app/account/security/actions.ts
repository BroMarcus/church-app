'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

export async function changeLoginEmail(formData:FormData){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  if(!claims?.claims?.sub)redirect('/login')
  const email=text(formData,'email').toLowerCase()
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))redirect('/account/security?error='+encodeURIComponent('Enter a valid email address.'))
  const {error}=await supabase.auth.updateUser({email})
  if(error)redirect('/account/security?error='+encodeURIComponent(error.message))
  redirect('/account/security?email=1')
}

export async function changePassword(formData:FormData){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  if(!claims?.claims?.sub)redirect('/login')
  const password=String(formData.get('password')??''),confirm=String(formData.get('confirm_password')??'')
  if(password.length<12)redirect('/account/security?error='+encodeURIComponent('Use at least 12 characters for your new password.'))
  if(password!==confirm)redirect('/account/security?error='+encodeURIComponent('The password confirmation does not match.'))
  const {error}=await supabase.auth.updateUser({password})
  if(error)redirect('/account/security?error='+encodeURIComponent(error.message))
  redirect('/account/security?password=1')
}

export async function signOutEverywhere(){
  const supabase=await createClient()
  await supabase.auth.signOut({scope:'global'})
  redirect('/login?message='+encodeURIComponent('Signed out of all Kingdom Network sessions.'))
}
