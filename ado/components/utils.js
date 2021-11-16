export function updatePercentiles(featureCollection, accessor) {
  const {features} = featureCollection;
  return {
    type: 'FeatureCollection',
    features: features.map(f => {
      const value = accessor(f);

      console.log("f: ", f);
      
      const properties = {
        ...f.properties,
        value
      };

      console.log("properties: ", properties);

      return {...f, properties};
    })
  };
}
