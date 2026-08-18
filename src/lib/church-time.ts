export function formatChurchDate(value:string|Date,timeZone:string,options:Intl.DateTimeFormatOptions={}){
  const date=value instanceof Date?value:new Date(value)
  return new Intl.DateTimeFormat('en-US',{timeZone,...options}).format(date)
}

export function formatChurchTime(value:string|Date,timeZone:string){
  return formatChurchDate(value,timeZone,{hour:'numeric',minute:'2-digit'})
}

export function formatChurchDay(value:string|Date,timeZone:string){
  return formatChurchDate(value,timeZone,{weekday:'short',month:'short',day:'numeric',year:'numeric'})
}

export function churchDateParts(value:string|Date,timeZone:string){
  const date=value instanceof Date?value:new Date(value)
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date)
  const out:Record<string,string>={}
  for(const part of parts)if(part.type!=='literal')out[part.type]=part.value
  return out
}

export function toChurchDateTimeLocal(value:string|Date|null|undefined,timeZone:string){
  if(!value)return ''
  const p=churchDateParts(value,timeZone)
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

export function churchDayNumber(value:string|Date,timeZone:string){return Number(churchDateParts(value,timeZone).day)}
export function churchMonthShort(value:string|Date,timeZone:string){return formatChurchDate(value,timeZone,{month:'short'})}
