'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const WelcomeModal = dynamic(() => import('@/components/WelcomeModal'), {
  ssr: false,
})

export default function DeferredWelcomeModal() {
  const [shouldLoadModal, setShouldLoadModal] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadModal = () => {
      if (!cancelled) {
        setShouldLoadModal(true)
      }
    }

    const timeoutId = globalThis.setTimeout(loadModal, 1200)
    return () => {
      cancelled = true
      globalThis.clearTimeout(timeoutId)
    }
  }, [])

  if (!shouldLoadModal) {
    return null
  }

  return <WelcomeModal />
}
