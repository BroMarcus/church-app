'use server'

import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

async function manager(){
 const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub;if(!userId)redirect('/login')
 const {data:m}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single();if(!m?.church_id)redirect('/')
 const {data:permission}=await supabase.rpc('current_user_has_church_permission',{p_church_id:m.church_id,p_permission_key:'manage_members'});if(!['pastor','church_admin'].includes(m.role)&&!permission)redirect('/')
 return {supabase,userId,churchId:m.church_id}
}

export async function updateFormSubmissionWork(formData:FormData){
 const {supabase,userId,churchId}=await manager(),id=text(formData,'submission_id'),status=text(formData,'status')
 if(!['new','in_review','approved','declined','completed'].includes(status))redirect('/church/inbox?error=Choose+a+valid+status')
 const due=text(formData,'due_at')
 const patch:any={status,owner_user_id:text(formData,'owner_user_id')||null,next_action:text(formData,'next_action')||null,due_at:due?new Date(`${due}T12:00:00`).toISOString():null,leadership_note:text(formData,'leadership_note')||null,updated_at:new Date().toISOString()}
 if(['approved','declined','completed'].includes(status)){patch.decided_by=userId;patch.decided_at=new Date().toISOString()}else{patch.decided_by=null;patch.decided_at=null}
 const {error}=await supabase.from('church_form_submissions').update(patch).eq('id',id).eq('church_id',churchId)
 if(error){console.error('work inbox form update failed',{id,message:error.message});redirect('/church/inbox?error=Could+not+save+this+work+item')}
 revalidatePath('/church/inbox');redirect('/church/inbox?saved=Work+item+updated')
}
