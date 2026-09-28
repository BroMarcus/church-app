'use client'

import {useFormStatus} from 'react-dom'

type Props={
  lang:'en'|'es'
  idle:string
  pending:string
  className?:string
  help?:string
}

export function PrayerPendingButton({lang,idle,pending,className='btn',help}:Props){
  const {pending:isPending}=useFormStatus()
  const defaultHelp=lang==='es'
    ? 'Toca una sola vez y mantén esta página abierta hasta que termine.'
    : 'Tap once and keep this page open until it finishes.'

  return <div style={{display:'grid',gap:6}}>
    {help!==''&&<span className="small muted">{help??defaultHelp}</span>}
    <button
      className={className}
      disabled={isPending}
      aria-disabled={isPending}
      aria-busy={isPending}
    >{isPending?pending:idle}</button>
    <span className="small muted" role="status" aria-live="polite">
      {isPending?(lang==='es'?'Guardando. No vuelvas a tocar el botón.':'Saving. Do not tap the button again.'):''}
    </span>
  </div>
}
