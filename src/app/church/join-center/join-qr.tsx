'use client'

import { useRef } from 'react'
import { Download,Printer } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,(char)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[char]||char))

export function JoinQr({url,label,es=false}:{url:string;label:string;es?:boolean}){
  const qrRef=useRef<HTMLDivElement>(null)
  const serializedQr=()=>{const svg=qrRef.current?.querySelector('svg');return svg?new XMLSerializer().serializeToString(svg):null}
  function downloadQr(){
    const markup=serializedQr();if(!markup)return
    const blob=new Blob([markup],{type:'image/svg+xml;charset=utf-8'}),objectUrl=URL.createObjectURL(blob),anchor=document.createElement('a')
    anchor.href=objectUrl;anchor.download='kingdom-network-join-qr.svg';document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(objectUrl)
  }
  function printQr(){
    const markup=serializedQr();if(!markup)return
    const popup=window.open('','_blank','width=720,height=820');if(!popup)return
    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(es?'Únete a Kingdom Network':'Join Kingdom Network')}</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:48px;color:#111}h1{font-size:34px;margin-bottom:10px}p{font-size:18px;line-height:1.5}.qr{display:inline-block;padding:22px;border:2px solid #111;border-radius:20px;margin:24px}.url{font-size:14px;word-break:break-all;margin-top:16px}@media print{body{padding:24px}}</style></head><body><h1>${escapeHtml(es?'Únete a Kingdom Network':'Join Kingdom Network')}</h1><p>${escapeHtml(label)}</p><div class="qr">${markup}</div><div class="url">${escapeHtml(url)}</div></body></html>`)
    popup.document.close();popup.focus();setTimeout(()=>popup.print(),150)
  }
  return <div style={{display:'grid',justifyItems:'center',gap:10}}><div ref={qrRef} style={{background:'white',padding:14,borderRadius:16}}><QRCodeSVG value={url} size={220} marginSize={1} title={label}/></div><div className="small muted" style={{textAlign:'center',maxWidth:300}}>{label}</div><div className="row" style={{gap:8,justifyContent:'center',flexWrap:'wrap'}}><button className="ghost" type="button" onClick={downloadQr}><Download size={13}/> {es?'Descargar QR':'Download QR'}</button><button className="ghost" type="button" onClick={printQr}><Printer size={13}/> {es?'Imprimir letrero':'Print sign'}</button></div></div>
}
