'use client'

export function PrintCertificateButton({label}:{label:string}){
  return <button className="btn" onClick={()=>window.print()}>{label}</button>
}
