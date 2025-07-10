import { useState, useCallback } from 'react'
import type { ReportedImpactsIntroProps } from '@/types'

export default function ReportedImpactsIntro({ 
  headline, 
  text 
}: ReportedImpactsIntroProps) {
  const [introOpen, setIntroOpen] = useState(true)
  
  const onClose = useCallback(() => {
    setIntroOpen(false)
  }, [])

  return (
    <>
      {introOpen && (
        <div className="impactsWrapper">
          <div className="closeImpactWrapper" onClick={onClose}>
            close x
          </div>

          <div className="impactsContent">
            <h1
              style={{
                fontSize: '24px',
                marginBottom: '10px',
                marginTop: '10px',
              }}
            >
              {headline}
            </h1>
            {text}
          </div>
        </div>
      )}
    </>
  )
}
