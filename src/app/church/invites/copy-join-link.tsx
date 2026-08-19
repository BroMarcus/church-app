'use client'

import { useState } from 'react'
import { Check,Copy } from 'lucide-react'

export function CopyJoinLink({url,lang='en'}:{url:string;lang?:'en'|'es'}){
  const [copied,setCopied]=useState(false)
  const es=lang==='es'
  async function copy(){
    try{await navigator.clipboard.writeText(url);setCopied(true);window.setTimeout(()=>setCopied(false),1800)}catch{window.prompt(es?'Copia este enlace permanente:':'Copy this permanent join link:',url)}
  }
  return <button className="btn" type="button" onClick={copy}>{copied?<><Check size={13}/> {es?'Copiado':'Copied'}</>:<><Copy size={13}/> {es?'Copiar enlace permanente':'Copy permanent join link'}</>}</button>
}
