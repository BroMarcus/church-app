'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const allowed=['pending_review','verified','rejected'] as const
const langOf=(f:FormData)=>text(f,'lang')==='es'?'es':'en'
const docsUrl=(lang:string,extra='')=>`/documents?lang=${lang}${extra}`

export async function verifyDocument(formData:FormData){
  const lang=langOf(formData),supabase=await createClient()
  const {data}=await supabase.auth.getClaims(),userId=data?.claims?.sub
  if(!userId)redirect(`/login?lang=${lang}`)
  const documentId=text(formData,'document_id'),status=text(formData,'verification_status'),notes=text(formData,'verification_notes')
  if(!documentId||!allowed.includes(status as (typeof allowed)[number]))redirect(docsUrl(lang,'&error='+encodeURIComponent(lang==='es'?'Revisión de documento inválida.':'Invalid document review.')))
  if(status==='rejected'&&!notes)redirect(docsUrl(lang,'&error='+encodeURIComponent(lang==='es'?'Agrega una nota explicando por qué fue rechazado.':'Add a review note explaining why the document was rejected.')))
  const {data:doc}=await supabase.from('member_documents').select('church_id').eq('id',documentId).single()
  if(!doc?.church_id)redirect(docsUrl(lang,'&error='+encodeURIComponent(lang==='es'?'No encontramos el documento.':'Document not found.')))
  const {data:membership}=await supabase.from('church_memberships').select('role,status').eq('church_id',doc.church_id).eq('user_id',userId).eq('status','active').single()
  if(!membership||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const now=new Date().toISOString()
  const {error}=await supabase.from('member_documents').update({verification_status:status,verification_notes:notes||null,verified_by:status==='verified'?userId:null,verified_at:status==='verified'?now:null,updated_at:now}).eq('id',documentId)
  if(error)redirect(docsUrl(lang,'&error='+encodeURIComponent(error.message)))
  revalidatePath('/documents');revalidatePath('/church/readiness');redirect(docsUrl(lang,'&reviewed=1'))
}