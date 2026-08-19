'use client'

import { useState } from 'react'
import { Check,Copy } from 'lucide-react'

export function CopyInviteLink({inviteId,lang='en'}:{inviteId:string;lang?:'en'|'es'}){
  const [copied,setCopied]=useState(false)
  const es=lang==='es'
  async function copy(){
    const url=`${window.location.origin}/login?invite=${encodeURIComponent(inviteId)}${es?'&lang=es':''}`
    try{await navigator.clipboard.writeText(url);setCopied(true);window.setTimeout(()=>setCopied(false),1800)}catch{window.prompt(es?'Copia este enlace de invitación:':'Copy this invitation link:',url)}
  }
  return <button className="ghost" type="button" onClick={copy}>{copied?<><Check size={13}/> {es?'Copiado':'Copied'}</>:<><Copy size={13}/> {es?'Copiar enlace':'Copy invite link'}</>}</button>
}
