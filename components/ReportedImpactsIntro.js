import { useState, useCallback } from 'react'

function ReportedImpactsIntro({ headline = 0, text = 0 }) {
  const [introOpen, setIntroOpen] = useState(true)
  const onClose = useCallback(async (event) => {
    setIntroOpen()
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

export default ReportedImpactsIntro
