'use client'

import { useFormStatus } from 'react-dom'
import { CheckCircle2, WandSparkles } from 'lucide-react'

type Props={
  kind:'review'|'approve'
  lang:'en'|'es'
  label?:string
}

export function SetupActionButton({kind,lang,label}:Props){
  const {pending}=useFormStatus()
  const es=lang==='es'
  const pendingLabel=kind==='approve'
    ? (es?'Aprobando…':'Approving…')
    : (es?'Preparando…':'Preparing…')
  const normalLabel=label||(kind==='approve'
    ? (es?'Aprobar este plan':'Approve this plan')
    : (es?'Crear plan recomendado':'Create recommended plan'))
  const Icon=kind==='approve'?CheckCircle2:WandSparkles

  return <button className="btn" type="submit" disabled={pending} aria-disabled={pending} aria-busy={pending}>
    <Icon size={14}/>
    {pending?pendingLabel:normalLabel}
  </button>
}
