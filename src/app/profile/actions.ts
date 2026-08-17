'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(formData:FormData,key:string)=>String(formData.get(key)??'').trim()
const nullable=(formData:FormData,key:string)=>{const v=text(formData,key);return v||null}

export async function updateProfile(formData:FormData){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const userId=data?.claims?.sub
  if(!userId)redirect('/login')
  const now=new Date().toISOString()
  const contactEmail=nullable(formData,'contact_email')
  if(contactEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))redirect('/profile?error='+encodeURIComponent('Enter a valid contact email address.'))
  const showContactEmail=formData.get('show_contact_email')==='on'
  const [profileResult,detailsResult]=await Promise.all([
    supabase.from('profiles').update({first_name:text(formData,'first_name'),last_name:text(formData,'last_name'),display_name:text(formData,'display_name'),bio:text(formData,'bio'),contact_email:contactEmail,show_contact_email:showContactEmail,updated_at:now}).eq('id',userId),
    supabase.from('member_private_details').update({phone:nullable(formData,'phone'),address_line1:nullable(formData,'address_line1'),address_line2:nullable(formData,'address_line2'),city:nullable(formData,'city'),state:nullable(formData,'state'),postal_code:nullable(formData,'postal_code'),birthday:nullable(formData,'birthday'),marriage_anniversary:nullable(formData,'marriage_anniversary'),updated_at:now}).eq('user_id',userId)
  ])
  const error=profileResult.error??detailsResult.error
  if(error)redirect('/profile?error='+encodeURIComponent(error.message))
  redirect('/profile?saved=1')
}
