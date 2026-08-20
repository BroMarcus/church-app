export type KingdomGuideIntent=
  |'group_roster'
  |'group_absences'
  |'lesson_builder'
  |'today_schedule'
  |'schedule_manage'
  |'team_manage'
  |'finance'
  |'pastor_center'
  |'content_event'
  |'content_learning'
  |'outreach'
  |'unknown'

const has=(value:string,...phrases:string[])=>phrases.some(phrase=>value.includes(phrase))

export function classifyKingdomGuideCommand(input:string):KingdomGuideIntent{
  const value=input.toLowerCase().replace(/[’']/g,"'").replace(/\s+/g,' ').trim()
  if(!value)return'unknown'
  if(has(value,'missed group','miss group','absent from group','group attendance','who was missing','who missed'))return'group_absences'
  if(has(value,'group roster','my roster','roll sheet','roll-sheet')||has(value,"my group's roster",'my group roster'))return'group_roster'
  if(has(value,'build this week','build a lesson','write a lesson','help me build','prepare a lesson','lesson for this week'))return'lesson_builder'
  if(has(value,"who's preaching",'who is preaching',"who's serving",'who is serving','schedule today','serving today','preaching today'))return'today_schedule'
  if(has(value,'schedule someone','make a schedule','edit schedule','manage schedule','church schedule','team schedule'))return'schedule_manage'
  if(has(value,'manage team','team roster','team roles','assign team role','edit team'))return'team_manage'
  if(has(value,'finance','tithes','offerings','church bills','pay bills','church money'))return'finance'
  if(has(value,'pastor dashboard','pastor center','command center','church overview'))return'pastor_center'
  if(has(value,'create event','new event','make an event','church event'))return'content_event'
  if(has(value,'create class','new class','create course','new course','create lesson','new lesson','edit lesson','edit course'))return'content_learning'
  if(has(value,'bible study','follow up','follow-up','outreach','guest needs help','assign a bible study'))return'outreach'
  return'unknown'
}
