'use client'

import { useEffect, useState } from 'react'
import './phone-proof.css'

type Lang = 'en' | 'es'

const copy = {
  en: {
    pill: 'PHONE PROOF',
    title: 'Checking the phone-test station…',
    body: 'Keep this page open. We are verifying your account, church access, and the deployed build before showing saved test evidence.',
  },
  es: {
    pill: 'PRUEBA EN TELÉFONO',
    title: 'Verificando la estación de prueba…',
    body: 'Mantén esta página abierta. Estamos verificando tu cuenta, acceso a la iglesia y la versión desplegada antes de mostrar la evidencia guardada.',
  },
} as const

function currentLanguage(): Lang {
  if (typeof window === 'undefined') return 'en'
  const requested = new URLSearchParams(window.location.search).get('lang')
  if (requested === 'es') return 'es'
  if (requested === 'en') return 'en'
  return document.documentElement.lang.toLowerCase().startsWith('es') ? 'es' : 'en'
}

export default function PhoneProofLoading() {
  const [lang, setLang] = useState<Lang>('en')

  useEffect(() => {
    setLang(currentLanguage())
  }, [])

  const t = copy[lang]

  return (
    <main className="phone-proof-shell" aria-busy="true">
      <section className="local-note" role="status" aria-live="polite">
        <div className="pill">{t.pill}</div>
        <h1>{t.title}</h1>
        <p>{t.body}</p>
      </section>
    </main>
  )
}
