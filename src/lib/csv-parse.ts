export type CsvRecord=Record<string,string>

const normalizeHeader=(value:string)=>value.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')

export function parseCsv(input:string){
  const source=input.replace(/^\uFEFF/,'')
  const rows:string[][]=[]
  let row:string[]=[]
  let cell=''
  let quoted=false
  for(let i=0;i<source.length;i++){
    const ch=source[i]
    if(quoted){
      if(ch==='"'){
        if(source[i+1]==='"'){cell+='"';i++}
        else quoted=false
      }else cell+=ch
      continue
    }
    if(ch==='"'&&cell.length===0){quoted=true;continue}
    if(ch===','){row.push(cell);cell='';continue}
    if(ch==='\n'){
      row.push(cell);cell=''
      if(row.some(v=>v.trim()!==''))rows.push(row)
      row=[]
      continue
    }
    if(ch==='\r')continue
    cell+=ch
  }
  if(quoted)throw new Error('CSV contains an unclosed quoted field.')
  row.push(cell)
  if(row.some(v=>v.trim()!==''))rows.push(row)
  if(!rows.length)return {headers:[] as string[],records:[] as CsvRecord[]}
  const headers=rows[0].map(normalizeHeader)
  if(headers.some(h=>!h))throw new Error('Every CSV column needs a header.')
  if(new Set(headers).size!==headers.length)throw new Error('CSV contains duplicate column headers after normalization.')
  const records=rows.slice(1).map(values=>Object.fromEntries(headers.map((h,index)=>[h,(values[index]??'').trim()])))
  return {headers,records}
}
