'use server'

import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

const text=(formData:FormData,key:string)=>String(formData.get(key)??'').trim()
const withLang=(path:string,lang:string)=>lang==='es'?`${path}${path.includes('?')?'&':'?'}lang=es`:path

export async function submitFiveSpotRequest(formData:FormData){
  const lang=text(formData,'lang')==='es'?'es':'en'
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(withLang('/login',lang))
  const {data:membership}=await supabase.from('church_memberships').select('church_id').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')

  const scripture=text(formData,'scripture')
  const titleIdea=text(formData,'title_idea')
  const mainThought=text(formData,'main_thought')
  const shortOutline=text(formData,'short_outline')
  if(!scripture||!titleIdea||!mainThought||!shortOutline){
    redirect(withLang('/calendar/five-spot?error='+encodeURIComponent(lang==='es'?'Completa Escritura, título/idea, pensamiento principal y bosquejo corto.':'Complete Scripture, title/idea, main thought, and short outline.'),lang))
  }

  const {error}=await supabase.from('five_spot_requests').insert({
    church_id:membership.church_id,
    requester_user_id:userId,
    scripture:scripture.slice(0,500),
    title_idea:titleIdea.slice(0,160),
    main_thought:mainThought.slice(0,2000),
    short_outline:shortOutline.slice(0,6000),
    notes:text(formData,'notes')||null,
    status:'submitted',
    created_by:userId
  })
  if(error){
    console.error('submitFiveSpotRequest failed',{code:error.code,message:error.message})
    redirect(withLang('/calendar/five-spot?error='+encodeURIComponent(lang==='es'?'No pudimos enviar tu solicitud de 5 Spot.':'We could not submit your 5 Spot request.'),lang))
  }

  revalidatePath('/calendar/five-spot')
  revalidatePath('/calendar/manage')
  redirect(withLang('/calendar/five-spot?submitted=1',lang))
}
