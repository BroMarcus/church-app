'use server'

import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

const keys=new Set(['community','prayer','messages','serve','outreach','documents','directory','updates','private_care','library','business','fundraising','network'])

export async function saveChurchFeatures(formData:FormData){
 const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub;if(!userId)redirect('/login')
 const {data:m}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single();if(!m?.church_id||!['pastor','church_admin'].includes(m.role))redirect('/')
 const rows=Array.from(keys).map(feature_key=>({church_id:m.church_id,feature_key,enabled:formData.get(feature_key)==='on',updated_by:userId,updated_at:new Date().toISOString()}))
 const {error}=await supabase.from('church_feature_settings').upsert(rows,{onConflict:'church_id,feature_key'})
 if(error){console.error('church feature settings save failed',{churchId:m.church_id,message:error.message});redirect('/church/features?error=Could+not+save+feature+settings')}
 revalidatePath('/');revalidatePath('/church/features');redirect('/church/features?saved=1')
}
