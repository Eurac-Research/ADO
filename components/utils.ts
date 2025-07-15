export function updatePercentiles(featureCollection: any, accessor: (f: any) => any) {
  const { features } = featureCollection;

  return {
    type: 'FeatureCollection',
    features: features.map((f: any) => {
      const value = accessor(f);
      const properties = {
        ...f.properties,
        value
      };
      return { ...f, properties };
    })
  };
}
