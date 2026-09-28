'use client'

import { useSearchParams } from 'next/navigation'
import { useFormStatus } from 'react-dom'

export function ReportSubmitButton(){
  const {pending}=useFormStatus()
  const searchParams=useSearchParams()
  const es=searchParams.get('lang')==='es'
  const help=es
    ? 'Toca Enviar reporte una sola vez. Mantén esta página abierta hasta que termine.'
    : 'Tap Submit report once. Keep this page open until it finishes.'
  const idle=es?'Enviar reporte':'Submit report'
  const saving=es?'Enviando reporte…':'Submitting report…'
  const status=pending
    ? (es?'Guardando el reporte. No vuelvas a tocar el botón.':'Saving the report. Do not tap the button again.')
    : ''

  return <div style={{display:'grid',gap:8}}>
    <p id="group-report-submit-help" className="small muted" style={{margin:0}}>{help}</p>
    <button
      className="btn"
      disabled={pending}
      aria-disabled={pending}
      aria-busy={pending}
      aria-describedby="group-report-submit-help group-report-submit-status"
    >{pending?saving:idle}</button>
    <span id="group-report-submit-status" className="small muted" role="status" aria-live="polite">{status}</span>
  </div>
}
