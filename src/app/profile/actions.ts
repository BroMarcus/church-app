'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(formData:FormData,key:string)=>String(formData.get(key)??'').trim()
const nullable=(formData:FormData,key:string)=>{const v=text(formData,key);return v||null}

function parseDateInput(value:string|null){
  if(!value)return null
  const iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const us=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value)
  const parts=iso?[Number(iso[1]),Number(iso[2]),Number(iso[3])]:us?[Number(us[3]),Number(us[1]),Number(us[2])]:null
  if(!parts)return undefined
  const [year,month,day]=parts,date=new Date(Date.UTC(year,month-1,day))
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return undefined
  return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

export async function updateProfile(formData:FormData){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const userId=data?.claims?.sub
  const lang=text(formData,'lang')==='es'?'es':'en'
  const suffix=lang==='es'?'&lang=es':''
  if(!userId)redirect(`/login${lang==='es'?'?lang=es':''}`)
  const now=new Date().toISOString(),contactEmail=nullable(formData,'contact_email')
  if(contactEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))redirect(`/profile?error=${encodeURIComponent(lang==='es'?'Escribe un correo de contacto válido.':'Enter a valid contact email address.')}${suffix}`)
  const birthday=parseDateInput(nullable(formData,'birthday')),anniversary=parseDateInput(nullable(formData,'marriage_anniversary'))
  if(birthday===undefined||anniversary===undefined)redirect(`/profile?error=${encodeURIComponent(lang==='es'?'Usa el formato MM/DD/AAAA para las fechas.':'Use MM/DD/YYYY for birthday and anniversary dates.')}${suffix}`)
  const showContactEmail=formData.get('show_contact_email')==='on',showJourneyProgress=formData.get('show_journey_progress')==='on'
  const [profileResult,detailsResult]=await Promise.all([
    supabase.from('profiles').update({first_name:text(formData,'first_name'),last_name:text(formData,'last_name'),display_name:text(formData,'display_name'),bio:text(formData,'bio'),contact_email:contactEmail,show_contact_email:showContactEmail,show_journey_progress:showJourneyProgress,show_journey_comparison:showJourneyProgress,updated_at:now}).eq('id',userId),
    supabase.from('member_private_details').update({phone:nullable(formData,'phone'),address_line1:nullable(formData,'address_line1'),address_line2:nullable(formData,'address_line2'),city:nullable(formData,'city'),state:nullable(formData,'state'),postal_code:nullable(formData,'postal_code'),birthday,marriage_anniversary:anniversary,updated_at:now}).eq('user_id',userId)
  ])
  const error=profileResult.error??detailsResult.error
  if(error){console.error('updateProfile failed',{message:error.message});redirect(`/profile?error=${encodeURIComponent(lang==='es'?'No pudimos guardar tu perfil. Inténtalo otra vez.':'We could not save your profile. Please try again.')}${suffix}`)}
  redirect(`/profile?saved=1${suffix}`)
}

export async function updateBaptism(formData:FormData){
  const supabase=await createClient(),{data}=await supabase.auth.getClaims(),userId=data?.claims?.sub
  const lang=text(formData,'lang')==='es'?'es':'en',suffix=lang==='es'?'&lang=es':''
  if(!userId)redirect(`/login${lang==='es'?'?lang=es':''}`)
  const baptized=formData.get('baptized')==='on',date=parseDateInput(nullable(formData,'baptism_date'))
  if(date===undefined)redirect(`/profile?error=${encodeURIComponent(lang==='es'?'Usa MM/DD/AAAA para la fecha de bautismo.':'Use MM/DD/YYYY for the baptism date.')}${suffix}`)
  const {data:membership}=await supabase.from('church_memberships').select('church_id').eq('user_id',userId).eq('status','active').limit(1).maybeSingle()
  if(!membership?.church_id)redirect(`/profile?error=${encodeURIComponent(lang==='es'?'No encontramos una membresía activa.':'We could not find an active church membership.')}${suffix}`)
  const {error}=await supabase.rpc('update_my_baptism_details',{
    p_church_id:membership.church_id,p_baptized:baptized,p_baptism_date:baptized?date:null,
    p_officiant_name:baptized?nullable(formData,'baptism_officiant_name'):null,p_church_name:baptized?nullable(formData,'baptism_church_name'):null,
    p_pastor_name:baptized?nullable(formData,'baptism_pastor_name'):null,p_visible:baptized&&formData.get('show_baptism_details')==='on'
  })
  if(error){console.error('updateBaptism failed',{message:error.message});redirect(`/profile?error=${encodeURIComponent(lang==='es'?'No pudimos guardar los datos de bautismo.':'We could not save your baptism information.')}${suffix}`)}
  redirect(`/profile?saved=1${suffix}`)
}
