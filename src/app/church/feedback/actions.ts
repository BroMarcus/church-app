'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

export async function updatePilotFeedbackStatus(formData:FormData){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:m}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!m?.church_id||!['pastor','church_admin'].includes(m.role))redirect('/')
  const id=text(formData,'id'),status=['new','reviewing','resolved'].includes(text(formData,'status'))?text(formData,'status'):'new'
  if(!id)return
  await supabase.from('pilot_feedback').update({status,resolved_at:status==='resolved'?new Date().toISOString():null}).eq('id',id).eq('church_id',m.church_id)
  revalidatePath('/church/feedback')
}
