'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const allowed=['pending_review','verified','rejected'] as const

export async function verifyDocument(formData:FormData){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const userId=data?.claims?.sub
  if(!userId)redirect('/login')
  const documentId=text(formData,'document_id')
  const status=text(formData,'verification_status')
  const notes=text(formData,'verification_notes')
  if(!documentId||!allowed.includes(status as (typeof allowed)[number]))redirect('/documents?error='+encodeURIComponent('Invalid document review.'))
  if(status==='rejected'&&!notes)redirect('/documents?error='+encodeURIComponent('Add a review note explaining why the document was rejected.'))
  const {data:doc}=await supabase.from('member_documents').select('church_id').eq('id',documentId).single()
  if(!doc?.church_id)redirect('/documents?error='+encodeURIComponent('Document not found.'))
  const {data:membership}=await supabase.from('church_memberships').select('role,status').eq('church_id',doc.church_id).eq('user_id',userId).eq('status','active').single()
  if(!membership||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const now=new Date().toISOString()
  const {error}=await supabase.from('member_documents').update({verification_status:status,verification_notes:notes||null,verified_by:status==='verified'?userId:null,verified_at:status==='verified'?now:null,updated_at:now}).eq('id',documentId)
  if(error)redirect('/documents?error='+encodeURIComponent(error.message))
  revalidatePath('/documents')
  revalidatePath('/church/readiness')
  redirect('/documents?reviewed=1')
}
