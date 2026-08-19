'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

export async function saveProphetPreferences(formData:FormData){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const lang=text(formData,'lang')==='es'?'es':'en'
  const frequency=text(formData,'frequency')
  if(!['off','once_daily','twice_daily'].includes(frequency))redirect(`/account/prophet?lang=${lang}&error=${encodeURIComponent(lang==='es'?'Frecuencia inválida.':'Invalid frequency.')}`)
  const payload={user_id:userId,frequency,morning_hour:8,evening_hour:19,quiet_start_hour:21,quiet_end_hour:7,scripture_encouragement:text(formData,'scripture_encouragement')==='on',responsibility_reminders:text(formData,'responsibility_reminders')==='on',updated_at:new Date().toISOString()}
  const {error}=await supabase.from('prophet_nudge_preferences').upsert(payload,{onConflict:'user_id'})
  if(error)redirect(`/account/prophet?lang=${lang}&error=${encodeURIComponent(error.message)}`)
  revalidatePath('/account/prophet');revalidatePath('/prophet');redirect(`/account/prophet?lang=${lang}&saved=1`)
}
