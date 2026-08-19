'use client'

import { QRCodeSVG } from 'qrcode.react'

export function JoinQr({url,label}:{url:string;label:string}){
  return <div style={{display:'grid',justifyItems:'center',gap:10}}><div style={{background:'white',padding:14,borderRadius:16}}><QRCodeSVG value={url} size={220} marginSize={1} title={label}/></div><div className="small muted" style={{textAlign:'center',maxWidth:300}}>{label}</div></div>
}
