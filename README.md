This is the website project repository for the "Alpine Drought Observatory" (https://www.eurac.edu/en/institutes-centers/institute-for-alpine-environment/projects/ado). It consists of a map showing diffenrent indices and charts regarding drought.

Enjoy on https://ado-eurac.vercel.app


## Stack
[Next.js](https://nextjs.org/) frontend with a [Mapbox](https://mapbox.com/) map and [Recharts](https://recharts.org/) charts. The project fetches data (geojson, json, md) from https://github.com/Eurac-Research/ado-data. "Hosted" on [Vercel](https://vercel.com).


## Branching
We use the DEV and featurebranches and pull requests to master. Master is never changed directly.


## Workflow / Dataflow 

1. Data is pushed to https://github.com/Eurac-Research/ado-data on a daily basis (geojson, json)
2. In the "ado-data" repo a "Github Action" triggers a deploy to [Vercel](https://vercel.com) on every push. 
3. The frontend is build and instantly published with the new geojson data. Until the next build the data (more precise the map-data) stays the same. The map-data is part of the frontend due to nextjs [getStaticProps](https://nextjs.org/docs/basic-features/data-fetching#getstaticprops-static-generation). Note: the overlay chart data (json with historical data for every region) is fetched directly from the github repo "ado-data".

## FAQ

### How to add a new index?

1. Add the new data to the ado-data repo (one geojson file for the new index). Update the "timeseries" json files to reflect the new index
2. In the frontend code update the [getStaticPath](https://nextjs.org/docs/basic-features/data-fetching#getstaticpaths-static-generation) section to allow the new index to be processed as "slug". **Note** this could be made dynamic in case by adding the inices list to the ado-data repo and fetch it from there instead of this static list.


```js
export async function getStaticPaths() {
  const indices = ['cdi','sma','spei-1','spei-12','spei-2','spei-3','spei-6','spi-1', 'spi-12', 'spi-3', 'spi-6', 'vci', 'vhi']
  // Get the paths we want to pre-render based on posts
  const paths = indices.map((index) => ({
    params: { slug: index },
  }))
  // { fallback: false } means other routes should 404.
  return { paths, fallback: false }
}
```

3. Add the new index to the navigation bar (the slug is the equivalent to the geojson file - it's a simple name-convention)
4. Update the ```const yaxis``` to refelct the right yaxis domain range for the data (used for the charts).

