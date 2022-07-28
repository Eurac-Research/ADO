export function updatePercentiles(featureCollection, accessor) {
  const {features} = featureCollection;

  return {
    type: 'FeatureCollection',
    features: features.map(f => {
      const value = accessor(f);
      const properties = {
        ...f.properties,
        value
      };
      return {...f, properties};
    })
  };
}
