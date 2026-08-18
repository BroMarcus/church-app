'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

export async function updateMessageReportStatus(formData:FormData){
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const reportId=text(formData,'report_id'),status=text(formData,'status')
  if(!reportId||!['reviewed','closed'].includes(status))redirect('/church/message-reports?error='+encodeURIComponent('Invalid report update.'))
  const {data:report}=await supabase.from('message_reports').select('church_id').eq('id',reportId).single()
  if(!report?.church_id)redirect('/church/message-reports?error='+encodeURIComponent('Report not found.'))
  const {data:membership}=await supabase.from('church_memberships').select('role').eq('church_id',report.church_id).eq('user_id',userId).eq('status','active').single()
  if(!membership||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const {error}=await supabase.from('message_reports').update({status}).eq('id',reportId)
  if(error)redirect('/church/message-reports?error='+encodeURIComponent(error.message))
  revalidatePath('/church/message-reports');revalidatePath('/church');redirect('/church/message-reports?saved=1')
}
