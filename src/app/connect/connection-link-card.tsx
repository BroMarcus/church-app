'use client'

import {useState} from 'react'

export function ConnectionLinkCard({token,label,meta,active=true,lang='en'}:{token:string;label:string;meta?:string;active?:boolean;lang?:'en'|'es'}){
  const [copied,setCopied]=useState(false)
  const es=lang==='es'
  const relative=`/connect/${token}`
  const full=()=>`${window.location.origin}${relative}`
  const copy=async()=>{try{await navigator.clipboard.writeText(full());setCopied(true);setTimeout(()=>setCopied(false),1500)}catch{setCopied(false)}}
  const share=async()=>{if(!navigator.share){await copy();return}try{await navigator.share({title:label,text:es?'Conéctese con nosotros':'Connect with us',url:full()})}catch{}}
  return <div className="connect-link-card">
    <div><strong>{label}</strong>{meta&&<div className="connect-muted">{meta}</div>}<div className="connect-path">{relative}</div></div>
    <div className="connect-link-actions"><button type="button" onClick={copy}>{copied?(es?'Copiado':'Copied'):(es?'Copiar enlace':'Copy link')}</button><button type="button" onClick={share}>{es?'Compartir':'Share'}</button>{!active&&<span className="connect-status-off">{es?'Pausado':'Paused'}</span>}</div>
  </div>
}
