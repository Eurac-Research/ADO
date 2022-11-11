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
        {text}
      </div>
    </div>
  )
}

export default ReportedImpactsIntro
