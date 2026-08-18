'use client'

import { useState } from 'react'
import { Check,Copy } from 'lucide-react'

export function CopyInviteLink({inviteId}:{inviteId:string}){
  const [copied,setCopied]=useState(false)
  async function copy(){
    const url=`${window.location.origin}/login?invite=${encodeURIComponent(inviteId)}`
    try{await navigator.clipboard.writeText(url);setCopied(true);window.setTimeout(()=>setCopied(false),1800)}catch{window.prompt('Copy this invitation link:',url)}
  }
  return <button className="ghost" type="button" onClick={copy}>{copied?<><Check size={13}/> Copied</>:<><Copy size={13}/> Copy invite link</>}</button>
}
