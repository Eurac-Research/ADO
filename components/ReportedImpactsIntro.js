function ReportedImpactsIntro({ headline = 0, text = 0 }) {
  return (
    <div className="impactsWrapper">
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
        <p
          style={{
            fontSize: '12px',
            marginBottom: '12px',
            lineHeight: '1.2',
          }}
        >
          {text}
        </p>
      </div>
    </div>
  )
}

export default ReportedImpactsIntro
