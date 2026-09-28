'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Copy,Check } from 'lucide-react'
import { PUBLIC_APP_ORIGIN } from '@/lib/public-app-origin'

export function OutreachInviteLink({inviteId}:{inviteId:string}){
  const [copied,setCopied]=useState(false)
  const searchParams=useSearchParams()
  const es=searchParams.get('lang')==='es'
  async function copy(){
    const url=`${PUBLIC_APP_ORIGIN}/login?invite=${encodeURIComponent(inviteId)}${es?'&lang=es':''}`
    try{
      await navigator.clipboard.writeText(url)
      setCopied(true);setTimeout(()=>setCopied(false),1800)
    }catch{
      window.prompt(es?'Copia este enlace de invitación:':'Copy this invitation link:',url)
    }
  }
  return <button type="button" className="btn" onClick={copy}>{copied?<><Check size={13}/> {es?'Copiado':'Copied'}</>:<><Copy size={13}/> {es?'Copiar enlace de invitación':'Copy invitation link'}</>}</button>
}
