'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const langOf=(f:FormData)=>text(f,'lang')==='es'?'es':'en'
const securityUrl=(lang:string,extra='')=>`/account/security?lang=${lang}${extra}`

export async function changeLoginEmail(formData:FormData){
  const lang=langOf(formData),supabase=await createClient(),{data:claims}=await supabase.auth.getClaims()
  if(!claims?.claims?.sub)redirect(`/login?lang=${lang}`)
  const email=text(formData,'email').toLowerCase()
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))redirect(securityUrl(lang,'&error='+encodeURIComponent(lang==='es'?'Escribe un correo válido.':'Enter a valid email address.')))
  const {error}=await supabase.auth.updateUser({email})
  if(error)redirect(securityUrl(lang,'&error='+encodeURIComponent(error.message)))
  redirect(securityUrl(lang,'&email=1'))
}

export async function changePassword(formData:FormData){
  const lang=langOf(formData),supabase=await createClient(),{data:claims}=await supabase.auth.getClaims()
  if(!claims?.claims?.sub)redirect(`/login?lang=${lang}`)
  const password=String(formData.get('password')??''),confirm=String(formData.get('confirm_password')??'')
  if(password.length<12)redirect(securityUrl(lang,'&error='+encodeURIComponent(lang==='es'?'Usa por lo menos 12 caracteres para tu nueva contraseña.':'Use at least 12 characters for your new password.')))
  if(password!==confirm)redirect(securityUrl(lang,'&error='+encodeURIComponent(lang==='es'?'Las contraseñas no coinciden.':'The password confirmation does not match.')))
  const {error}=await supabase.auth.updateUser({password})
  if(error)redirect(securityUrl(lang,'&error='+encodeURIComponent(error.message)))
  redirect(securityUrl(lang,'&password=1'))
}

export async function signOutEverywhere(formData:FormData){
  const lang=langOf(formData),supabase=await createClient()
  await supabase.auth.signOut({scope:'global'})
  redirect(`/login?lang=${lang}&mode=signin&message=${encodeURIComponent(lang==='es'?'Sesión cerrada en todos los dispositivos.':'Signed out of all Kingdom Network sessions.')}`)
}