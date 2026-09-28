'use server'

import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

export async function resolveConnectionReview(formData:FormData){
  const lang=text(formData,'lang')==='es'?'es':'en'
  const reviewId=text(formData,'review_id')
  const contactId=text(formData,'contact_id')
  const dismiss=text(formData,'dismiss')==='true'
  if(!reviewId||(!dismiss&&!contactId))redirect(`/outreach/reviews?error=1&lang=${lang}`)
  const supabase=await createClient()
  const {error}=await supabase.rpc('resolve_outreach_connection_review',{
    p_review_id:reviewId,
    p_contact_id:dismiss?null:contactId,
    p_dismiss:dismiss
  })
  if(error)redirect(`/outreach/reviews?error=1&lang=${lang}`)
  revalidatePath('/outreach/reviews')
  revalidatePath('/outreach')
  redirect(`/outreach/reviews?saved=1&lang=${lang}`)
}
