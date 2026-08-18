import { csvResponse,toCsv } from '@/lib/csv'

export async function GET(_request:Request,{params}:{params:Promise<{dataset:string}>}){
  const {dataset}=await params
  if(dataset==='outreach')return csvResponse('kingdom-network-outreach-import-template.csv',toCsv(['first_name','last_name','email','phone','stage','notes'],[['John','Smith','john@example.com','2095551234','new_contact','Met at Sunday service'],['Maria','Lopez','maria@example.com','','bible_study','Interested in Lesson 2']]))
  if(dataset==='member_invites')return csvResponse('kingdom-network-member-invite-template.csv',toCsv(['first_name','last_name','email','phone','role'],[['John','Smith','john@example.com','2095551234','member'],['Maria','Lopez','maria@example.com','','group_leader']]))
  return new Response('Unknown template',{status:404})
}
