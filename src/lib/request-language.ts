export type SupportedLanguage='en'|'es'

type LanguagePreference={
  language:SupportedLanguage
  quality:number
  order:number
}

export function resolveRequestLanguage(request:{headers:Headers},url:URL):SupportedLanguage{
  const explicit=url.searchParams.get('lang')
  if(explicit==='en'||explicit==='es')return explicit

  const preferences:LanguagePreference[]=[]
  for(const [order,entry] of (request.headers.get('accept-language')||'').split(',').entries()){
    const [rawTag,...rawParams]=entry.trim().split(';')
    const tag=(rawTag||'').trim().toLowerCase()
    const language:SupportedLanguage|null=tag==='es'||tag.startsWith('es-')?'es':tag==='en'||tag.startsWith('en-')?'en':null
    if(!language)continue

    let quality=1
    const qualityParam=rawParams.map((param)=>param.trim().toLowerCase()).find((param)=>param.startsWith('q='))
    if(qualityParam){
      const parsed=Number.parseFloat(qualityParam.slice(2))
      quality=Number.isFinite(parsed)&&parsed>=0&&parsed<=1?parsed:0
    }
    if(quality>0)preferences.push({language,quality,order})
  }

  preferences.sort((a,b)=>b.quality-a.quality||a.order-b.order)
  return preferences[0]?.language||'en'
}
