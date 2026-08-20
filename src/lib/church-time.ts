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

export function formatTimeOfDay(value:string|null|undefined,locale='en-US'){
  if(!value)return ''
  const match=/^(\d{1,2}):(\d{2})/.exec(String(value))
  if(!match)return String(value)
  const date=new Date(Date.UTC(2000,0,1,Number(match[1]),Number(match[2])))
  return new Intl.DateTimeFormat(locale,{hour:'numeric',minute:'2-digit',timeZone:'UTC'}).format(date)
}

export function formatRecurringMeeting(frequency:string|null|undefined,day:string|null|undefined,time:string|null|undefined,lang:'en'|'es'='en'){
  if(!day&&!time)return lang==='es'?'Horario por confirmar':'Schedule TBD'
  const clock=formatTimeOfDay(time,lang==='es'?'es-US':'en-US')
  const frequencyLabels:Record<string,[string,string]>={weekly:['Weekly','Cada semana'],biweekly:['Every other week','Cada dos semanas'],monthly:['Monthly','Mensual'],seasonal:['Seasonal','Por temporada'],other:['Recurring','Recurrente']}
  const spanishDays:Record<string,string>={Monday:'lunes',Tuesday:'martes',Wednesday:'miércoles',Thursday:'jueves',Friday:'viernes',Saturday:'sábado',Sunday:'domingo'}
  const prefix=frequencyLabels[frequency||'weekly']?.[lang==='es'?1:0]??(lang==='es'?'Recurrente':'Recurring')
  const rawDay=day||'',dayLabel=lang==='es'?(spanishDays[rawDay]||rawDay):rawDay
  if(dayLabel&&clock)return lang==='es'?`${prefix}, ${dayLabel} a las ${clock}`:`${prefix}, ${dayLabel}${dayLabel.endsWith('s')?'':'s'} at ${clock}`
  if(dayLabel)return `${prefix}, ${dayLabel}`
  return `${prefix}, ${clock}`
}
