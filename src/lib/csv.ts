export function csvCell(value:unknown){
  if(value===null||value===undefined)return ''
  const text=typeof value==='object'?JSON.stringify(value):String(value)
  return /[",\n\r]/.test(text)?`"${text.replaceAll('"','""')}"`:text
}

export function toCsv(headers:string[],rows:unknown[][]){
  return [headers.map(csvCell).join(','),...rows.map(row=>row.map(csvCell).join(','))].join('\r\n')+'\r\n'
}

export function csvResponse(filename:string,content:string){
  return new Response('\uFEFF'+content,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${filename.replaceAll('"','')}"`,'Cache-Control':'no-store'}})
}
