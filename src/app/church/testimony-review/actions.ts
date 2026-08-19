'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function reviewTestimony(formData:FormData){
  const id=String(formData.get('entry_id')??''),decision=String(formData.get('decision')??''),lang=String(formData.get('lang')??'')==='es'?'es':'en'
  if(!id||!['approved','declined'].includes(decision))redirect(`/church/testimony-review?lang=${lang}&error=${encodeURIComponent(lang==='es'?'Revisión inválida.':'Invalid review.')}`)
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();if(!claims?.claims?.sub)redirect('/login')
  const {error}=await supabase.rpc('review_shared_journey_entry',{p_entry_id:id,p_decision:decision})
  if(error)redirect(`/church/testimony-review?lang=${lang}&error=${encodeURIComponent(error.message)}`)
  revalidatePath('/church/testimony-review');revalidatePath('/testimonies');redirect(`/church/testimony-review?lang=${lang}&reviewed=1`)
}
