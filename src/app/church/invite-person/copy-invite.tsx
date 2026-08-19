'use client'

import { useState } from 'react'
import { Check,Copy } from 'lucide-react'

export function CopyKnownInvite({url,label}:{url:string;label:string}){
  const [copied,setCopied]=useState(false)
  async function copy(){try{await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),1800)}catch{setCopied(false)}}
  return <button className="btn" type="button" onClick={copy}>{copied?<><Check size={14}/> Copied</>:<><Copy size={14}/> {label}</>}</button>
}
