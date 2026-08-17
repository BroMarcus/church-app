export type Requirement={id:string;requirement_type:string;requirement_key:string|null;label:string;required:boolean;weight:number|null}

export function checkRequirement(r:Requirement,m:any,activeMember:boolean){
  if(r.requirement_type==='membership')return activeMember
  if(r.requirement_type==='holy_ghost')return m?.holy_ghost_received===true
  if(r.requirement_type==='baptism')return m?.baptized===true
  if(r.requirement_type==='covenant')return m?.covenant_current===true
  if(r.requirement_type==='course'){
    const map:Record<string,string>={first_steps:'first_steps_status',salt_series:'salt_series_status',soul_winning:'soul_winning_status',timothys:'timothys_status',school_pastors:'school_pastors_status'}
    const value=m?.[map[r.requirement_key??'']]
    return value==='completed'||value==='waived'
  }
  if(r.requirement_type==='training'){
    const map:Record<string,string>={child_abuse:'child_abuse_training_status',sexual_harassment:'sexual_harassment_training_status'}
    return m?.[map[r.requirement_key??'']]==='current'
  }
  return false
}

export function qualification(requirements:Requirement[],m:any,activeMember:boolean){
  const required=requirements.filter(r=>r.required)
  const checks=required.map(r=>({...r,met:checkRequirement(r,m,activeMember)}))
  const met=checks.filter(r=>r.met).length
  const score=required.length?Math.round(met/required.length*100):100
  return{score,qualified:score===100,checks,missing:checks.filter(r=>!r.met)}
}
