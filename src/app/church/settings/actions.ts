'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

export async function updateChurchSettings(formData:FormData){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const churchId=text(formData,'church_id')
  const {data:membership}=await supabase.from('church_memberships').select('role').eq('church_id',churchId).eq('user_id',userId).eq('status','active').single()
  if(!membership||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const brand=text(formData,'brand_color')||null
  if(brand&&!/^#[0-9a-fA-F]{6}$/.test(brand))redirect('/church/settings?error='+encodeURIComponent('Brand color must be a 6-digit hex color such as #6B4A8E.'))
  const website=text(formData,'website_url')||null
  if(website&&!/^https?:\/\//i.test(website))redirect('/church/settings?error='+encodeURIComponent('Website must begin with http:// or https://.'))
  const payload={name:text(formData,'name'),city:text(formData,'city')||null,state:text(formData,'state')||null,postal_code:text(formData,'postal_code')||null,address_line1:text(formData,'address_line1')||null,address_line2:text(formData,'address_line2')||null,timezone:text(formData,'timezone')||'America/Los_Angeles',website_url:website,contact_email:text(formData,'contact_email')||null,contact_phone:text(formData,'contact_phone')||null,welcome_message:text(formData,'welcome_message')||null,brand_color:brand}
  if(!payload.name)redirect('/church/settings?error='+encodeURIComponent('Church name is required.'))
  const {error}=await supabase.from('churches').update(payload).eq('id',churchId)
  if(error)redirect('/church/settings?error='+encodeURIComponent(error.message))
  revalidatePath('/church/settings');revalidatePath('/church');revalidatePath('/directory');revalidatePath('/');redirect('/church/settings?saved=1')
}
