'use client'

import {Printer} from 'lucide-react'

export function CertificatePrintButton({label}:{label:string}){
  return <button className="btn no-print" onClick={()=>window.print()}><Printer size={15}/> {label}</button>
}
