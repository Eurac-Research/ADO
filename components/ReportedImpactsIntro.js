function ReportedImpactsIntro() {
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
          Reported Impacts
        </h1>
        <p
          style={{
            fontSize: '12px',
            marginBottom: '12px',
            lineHeight: '1.2',
          }}
        >
          The reported drought impacts stem from the Alpine Drought Impact
          report Inventory (EDIIALPS V1.0) developed during the project period.
          To create EDIIALPS, information was gathered and transcribed from
          national databases and reports. Compiled knowledge on the impacts of
          historic and recent drought events from a variety of available
          information sources is presented as this has never been done across
          the European Alpine region. The Alpine Space covers the Alps and their
          foothills, as well as different climatic zones and therefore allows
          the consideration of water and natural resource flow and exchange
          typical of mountain regions. With the region's extent, we therefore
          include drought impacts not only at high altitudes, but also in
          downstream areas of the water-rich source regions (e.g. the river
          basins Po, Rhine, Danube etc.). Besides the most prominent impact
          category ‘agriculture and livestock farming’, many impact reports also
          relate to ‘public water supply’, ‘forestry’, ‘aquatic ecosystems’.
        </p>
        <p
          style={{
            fontSize: '12px',
            marginBottom: '12px',
            lineHeight: '1.2',
          }}
        >
          For further information on the database please read: Stephan, R.,
          Erfurt, M., Terzi, S., Žun, M., Kristan, B., Haslinger, K., and Stahl,
          K.: An inventory of Alpine drought impact reports to explore past
          droughts in a mountain region, Natural Hazards and Earth System
          Sciences Discussions, 21, 2485–2501, available at{' '}
          <a href="https://doi.org/10.5194/nhess-21-2485-2021">
            https://doi.org/10.5194/nhess-21-2485-2021
          </a>
          , 2021.
        </p>
        <p
          style={{
            fontSize: '12px',
            marginBottom: '12px',
            lineHeight: '1.2',
          }}
        >
          To access EDIIALPS as a plain dataset follow this link{' '}
          <a href="https://doi.org/10.6094/UNIFR/218623">
            https://doi.org/10.6094/UNIFR/218623
          </a>
        </p>
      </div>
    </div>
  )
}

export default ReportedImpactsIntro
