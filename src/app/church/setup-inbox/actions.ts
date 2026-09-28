'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const cleanTitle=(fileName:string)=>fileName.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim()
const slugify=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)
const langOf=(formData?:FormData)=>String(formData?.get('lang')||'en')==='es'?'es':'en'
const inbox=(lang:string,error?:'review'|'approve'|'access')=>{const p=lang==='es'?'/church/setup-inbox?lang=es':'/church/setup-inbox';if(!error)return p;return `${p}${p.includes('?')?'&':'?'}error=${error}`}
const boundedCode=(value:unknown)=>String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'unknown'
const diagnosticCode=(error:unknown,fallback:string)=>{
 if(error&&typeof error==='object'&&'code' in error)return boundedCode((error as {code?:unknown}).code)
 if(error instanceof Error)return boundedCode(error.name)
 return boundedCode(fallback)
}
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const setupId=(formData:FormData,lang:string,error:'review'|'approve')=>{const value=String(formData.get('id')||'').trim();if(!UUID_RE.test(value))redirect(inbox(lang,error));return value}

type ActorContext={
 supabase:Awaited<ReturnType<typeof createClient>>|null
 userId:string|null
 membership:{church_id:string;role:string}|null
 readError:'client'|'auth'|'membership'|null
 errorCode:string|null
}

async function actor():Promise<ActorContext>{
 let supabase:Awaited<ReturnType<typeof createClient>>
 try{supabase=await createClient()}
 catch(error){
  const code=diagnosticCode(error,'client_unavailable')
  console.error('Setup Inbox client unavailable',{code})
  return {supabase:null,userId:null,membership:null,readError:'client',errorCode:code}
 }
 let claimsResult
 try{claimsResult=await supabase.auth.getClaims()}
 catch(error){
  const code=diagnosticCode(error,'claims_unavailable')
  console.error('Setup Inbox claims transport unavailable',{code})
  return {supabase,userId:null,membership:null,readError:'auth',errorCode:code}
 }
 const {data:claims,error:claimsError}=claimsResult
 if(claimsError)return {supabase,userId:null,membership:null,readError:'auth',errorCode:boundedCode(claimsError.code)}
 const userId=claims?.claims?.sub
 if(!userId)return {supabase,userId:null,membership:null,readError:null,errorCode:null}
 let membershipResult
 try{membershipResult=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).maybeSingle()}
 catch(error){
  const code=diagnosticCode(error,'membership_unavailable')
  console.error('Setup Inbox membership transport unavailable',{code})
  return {supabase,userId,membership:null,readError:'membership',errorCode:code}
 }
 const {data:membership,error:membershipError}=membershipResult
 if(membershipError)return {supabase,userId,membership:null,readError:'membership',errorCode:boundedCode(membershipError.code)}
 return {supabase,userId,membership:membership as ActorContext['membership'],readError:null,errorCode:null}
}

function requireActorRead(ctx:ActorContext,lang:string,action:string){
 if(ctx.readError||!ctx.supabase){
  console.error('Setup Inbox action authorization unavailable',{action,stage:ctx.readError||'client',code:ctx.errorCode||'unknown'})
  redirect(inbox(lang,'access'))
 }
 if(!ctx.userId)redirect(`/login?lang=${lang}&mode=signin`)
 if(!ctx.membership?.church_id||!['pastor','church_admin'].includes(ctx.membership.role))redirect(lang==='es'?'/?lang=es':'/')
}

function buildPlan(row:any){
 const name=cleanTitle(row.file_name||'Uploaded material'),text=`${row.file_name||''} ${row.notes||''}`.toLowerCase(),category=row.category||'unsorted'
 const guessed=category==='unsorted'?(/lesson|class|curriculum|manual|discipleship|first steps|study/.test(text)?'curriculum':/logo|brand|letterhead/.test(text)?'branding':/calendar|schedule|event/.test(text)?'calendar':/certificate|credential/.test(text)?'certificates':/policy|procedure|handbook/.test(text)?'policies':/form|application|checklist/.test(text)?'forms':'resource'):category
 const plans:any={curriculum:{kind:'course_draft',destination:'Learning Center',title:`Create a draft course from “${name}”`,summary:'Create an unpublished course shell, keep the original file attached to the setup record, and leave lesson extraction/review for the next step.',confidence:'medium',approveLabel:'Create draft course'},branding:{kind:'branding_review',destination:'Church Settings / Media',title:`Review “${name}” for church branding`,summary:'Keep the file private in Setup Inbox and route it to branding review before changing any live logo or colors.',confidence:'high',approveLabel:'Mark ready for branding'},calendar:{kind:'calendar_review',destination:'Calendar',title:`Review “${name}” for events`,summary:'Route this material to Calendar review. No live events will be created until dates and details are confirmed.',confidence:'medium',approveLabel:'Mark ready for calendar'},forms:{kind:'workflow_review',destination:'Forms & Workflows',title:`Review “${name}” as a form/workflow`,summary:'Prepare this file for conversion into a reusable church form or checklist after leadership review.',confidence:'high',approveLabel:'Mark ready for forms'},policies:{kind:'policy_review',destination:'Leadership / Policies',title:`Review “${name}” as church policy`,summary:'Keep the source intact and route it for leadership approval before exposing it to members.',confidence:'high',approveLabel:'Mark ready for policy review'},certificates:{kind:'certificate_review',destination:'Documents / Certificates',title:`Review “${name}” as a certificate or credential`,summary:'Route this file to the document/certificate workflow. No credential will be issued automatically.',confidence:'high',approveLabel:'Mark ready for documents'},leadership:{kind:'leadership_review',destination:'Leadership Records',title:`Review “${name}” for leadership use`,summary:'Route this material to leadership records or training after pastor/admin approval.',confidence:'high',approveLabel:'Mark ready for leadership'},media:{kind:'media_review',destination:'Media Library',title:`Review “${name}” for the Media Library`,summary:'Prepare this media asset for later publishing; it stays private until approved.',confidence:'high',approveLabel:'Mark ready for media'},resource:{kind:'resource_review',destination:'Kingdom Guide / Resource Library',title:`Review “${name}” as a trusted resource`,summary:'Route this file to resource review so authority, visibility, topic and current/legacy status can be set before members see it.',confidence:'low',approveLabel:'Mark ready for resources'}}
 return plans[guessed]||plans.resource
}

export async function generateSetupPlan(formData:FormData){
 const lang=langOf(formData),id=setupId(formData,lang,'review'),ctx=await actor();requireActorRead(ctx,lang,'generate-one');const supabase=ctx.supabase!,membership=ctx.membership!
 let rowResult
 try{rowResult=await supabase.from('church_setup_uploads').select('*').eq('id',id).eq('church_id',membership.church_id).maybeSingle()}
 catch(error){console.error('generateSetupPlan read transport unavailable',{churchId:membership.church_id,id,code:diagnosticCode(error,'setup_read_unavailable')});redirect(inbox(lang,'review'))}
 const {data:row,error:rowError}=rowResult
 if(rowError){console.error('generateSetupPlan read failed',{churchId:membership.church_id,id,code:boundedCode(rowError.code)});redirect(inbox(lang,'review'))}
 if(!row||row.status==='ready')redirect(inbox(lang))
 const plan=buildPlan(row)
 let updateResult
 try{updateResult=await supabase.from('church_setup_uploads').update({review_plan:plan,review_confidence:plan.confidence,reviewed_at:new Date().toISOString(),status:'reviewing',suggested_destination:plan.destination}).eq('id',id).eq('church_id',membership.church_id).neq('status','ready').select('id').maybeSingle()}
 catch(error){console.error('generateSetupPlan update transport unavailable',{churchId:membership.church_id,id,code:diagnosticCode(error,'setup_update_unavailable')});redirect(inbox(lang,'review'))}
 const {data:updated,error}=updateResult
 if(error||!updated){console.error('generateSetupPlan failed',{churchId:membership.church_id,id,code:boundedCode(error?.code)});redirect(inbox(lang,'review'))}
 revalidatePath('/church/setup-inbox')
}

export async function generateAllSetupPlans(formData:FormData){
 const lang=langOf(formData),ctx=await actor();requireActorRead(ctx,lang,'generate-all');const supabase=ctx.supabase!,membership=ctx.membership!
 let rowsResult
 try{rowsResult=await supabase.from('church_setup_uploads').select('*').eq('church_id',membership.church_id).eq('status','received')}
 catch(error){console.error('generateAllSetupPlans read transport unavailable',{churchId:membership.church_id,code:diagnosticCode(error,'setup_read_unavailable')});redirect(inbox(lang,'review'))}
 const {data:rows,error:readError}=rowsResult
 if(readError){console.error('generateAllSetupPlans read failed',{churchId:membership.church_id,code:boundedCode(readError.code)});redirect(inbox(lang,'review'))}
 for(const row of rows??[]){
  const plan=buildPlan(row)
  let updateResult
  try{updateResult=await supabase.from('church_setup_uploads').update({review_plan:plan,review_confidence:plan.confidence,reviewed_at:new Date().toISOString(),status:'reviewing',suggested_destination:plan.destination}).eq('id',row.id).eq('church_id',membership.church_id).eq('status','received').select('id').maybeSingle()}
  catch(error){console.error('generateAllSetupPlans update transport unavailable',{churchId:membership.church_id,id:String(row.id||'').slice(0,36),code:diagnosticCode(error,'setup_update_unavailable')});redirect(inbox(lang,'review'))}
  const {data:updated,error}=updateResult
  if(error||!updated){console.error('generateAllSetupPlans update failed',{churchId:membership.church_id,id:String(row.id||'').slice(0,36),code:boundedCode(error?.code)});redirect(inbox(lang,'review'))}
 }
 revalidatePath('/church/setup-inbox')
}

export async function approveSetupPlan(formData:FormData){
 const lang=langOf(formData),id=setupId(formData,lang,'approve'),ctx=await actor();requireActorRead(ctx,lang,'approve');const supabase=ctx.supabase!,userId=ctx.userId!,membership=ctx.membership!
 let rowResult
 try{rowResult=await supabase.from('church_setup_uploads').select('*').eq('id',id).eq('church_id',membership.church_id).maybeSingle()}
 catch(error){console.error('approveSetupPlan read transport unavailable',{churchId:membership.church_id,id,code:diagnosticCode(error,'setup_read_unavailable')});redirect(inbox(lang,'approve'))}
 const {data:row,error:rowError}=rowResult
 if(rowError||!row?.review_plan){console.error('approveSetupPlan read failed',{churchId:membership.church_id,id,code:boundedCode(rowError?.code)});redirect(inbox(lang,'approve'))}
 if(row.status==='ready'){revalidatePath('/church/setup-inbox');return}
 if(row.status!=='reviewing'){console.error('approveSetupPlan invalid state',{churchId:membership.church_id,id,status:String(row.status||'unknown').slice(0,40)});redirect(inbox(lang,'approve'))}
 const plan:any=row.review_plan;let createdId:string|null=row.created_record_id??null,createdType:string|null=row.created_record_type??null
 if(plan.kind==='course_draft'){
  const title=cleanTitle(row.file_name||'New Course'),slug=`${slugify(title)||'course'}-${String(row.id).slice(0,8)}`
  let existingResult
  try{existingResult=await supabase.from('courses').select('id,published').eq('church_id',membership.church_id).eq('slug',slug).maybeSingle()}
  catch(error){console.error('approveSetupPlan existing course lookup transport unavailable',{churchId:membership.church_id,id,code:diagnosticCode(error,'course_lookup_unavailable')});redirect(inbox(lang,'approve'))}
  const {data:existing,error:existingError}=existingResult
  if(existingError){console.error('approveSetupPlan existing course lookup failed',{churchId:membership.church_id,id,code:boundedCode(existingError.code)});redirect(inbox(lang,'approve'))}
  if(existing?.id){
   if(existing.published){console.error('approveSetupPlan refused published deterministic course',{churchId:membership.church_id,id,courseId:String(existing.id).slice(0,36)});redirect(inbox(lang,'approve'))}
   createdId=existing.id;createdType='course'
  }else{
   let courseResult
   try{courseResult=await supabase.from('courses').insert({church_id:membership.church_id,title,slug,description:`Draft created from Setup Inbox source: ${row.file_name}. Review and build lessons before publishing.`,category:'discipleship',published:false,created_by:userId}).select('id').single()}
   catch(error){console.error('approveSetupPlan course creation transport unavailable',{churchId:membership.church_id,id,code:diagnosticCode(error,'course_create_unavailable')});redirect(inbox(lang,'approve'))}
   const {data:course,error}=courseResult
   if(error||!course?.id){console.error('approveSetupPlan course creation failed',{churchId:membership.church_id,id,code:boundedCode(error?.code)});redirect(inbox(lang,'approve'))}
   createdId=course.id;createdType='course'
  }
 }
 let finalResult
 try{finalResult=await supabase.from('church_setup_uploads').update({status:'ready',approved_at:new Date().toISOString(),created_record_id:createdId,created_record_type:createdType}).eq('id',id).eq('church_id',membership.church_id).eq('status','reviewing').select('id').maybeSingle()}
 catch(error){console.error('approveSetupPlan status update transport unavailable',{churchId:membership.church_id,id,createdId:createdId?String(createdId).slice(0,36):null,code:diagnosticCode(error,'setup_approve_unavailable')});redirect(inbox(lang,'approve'))}
 const {data:updated,error:updateError}=finalResult
 if(updateError||!updated){console.error('approveSetupPlan status update failed',{churchId:membership.church_id,id,createdId:createdId?String(createdId).slice(0,36):null,code:boundedCode(updateError?.code)});redirect(inbox(lang,'approve'))}
 revalidatePath('/church/setup-inbox');revalidatePath('/learning')
}
