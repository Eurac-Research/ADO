This is the website project repository for the "Alpine Drought Observatory" (https://www.eurac.edu/en/institutes-centers/institute-for-alpine-environment/projects/ado). It consists of a map showing diffenrent indices and charts regarding drought.

Enjoy on https://ado.eurac.edu

## Stack

[Next.js](https://nextjs.org/) frontend with a [Mapbox](https://mapbox.com/) map and [Echarts](https://echarts.apache.org) charts. The project fetches data (geojson, json, md) from https://github.com/Eurac-Research/ado-data. "Hosted" on [Vercel](https://vercel.com).

## Branching

We use the "dev" (https://github.com/Eurac-Research/ADO/tree/dev) and featurebranches and pull requests to the "main" branch (https://github.com/Eurac-Research/ADO/tree/main). "Main" is never changed directly.

## Workflow / Dataflow

1. Data is pushed to https://github.com/Eurac-Research/ado-data daily (geojson, json)
2. GitHub Actions in ado-data repo:
   - Extracts feature data from GeoJSON files into optimized JSON files
   - Minifies all JSON/GeoJSON files for better performance
   - Triggers Vercel deployment
3. Frontend uses Next.js App Router with server-side rendering:
   - Base geometry cached server-side for optimal performance
   - Feature data fetched separately to avoid Next.js cache limits
   - Static generation for instant page loads

## FAQ

### How to add a new index?

1. Add the new data to ado-data repo (GeoJSON file for the new index)
2. Update timeseries JSON files to include the new index
3. Add the new index to the indices array in `app/page.tsx`
4. The system will automatically generate optimized feature files via GitHub Actions
