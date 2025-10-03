import * as GeoTIFF from 'geotiff';

export interface ColorStop {
  value: number;
  color: string;
}

/**
 * Transform coordinates from Web Mercator (EPSG:3857) to WGS84 (EPSG:4326)
 * Web Mercator uses meters, WGS84 uses degrees
 */
function webMercatorToWGS84(x: number, y: number): [number, number] {
  const lon = (x / 20037508.34) * 180;
  const lat = (y / 20037508.34) * 180;
  const latDeg = (180 / Math.PI) * (2 * Math.atan(Math.exp(lat * Math.PI / 180)) - Math.PI / 2);
  return [lon, latDeg];
}

/**
 * Render optimized (pre-colorized) GeoTIFF from GitHub ado-data repository
 * TIFFs are in EPSG:3857 (Web Mercator) for perfect alignment with Mapbox
 */
export async function renderOptimizedGeoTIFF(
  week: number,
  year: number,
  index: string
): Promise<{ imageUrl: string; bounds: [number, number, number, number]; isYFlipped: boolean }> {
  const baseUrl = 'https://raw.githubusercontent.com/Eurac-Research/ado-data/main';
  const tiffUrl = `${baseUrl}/tiffs/optimized/${index}/${year}/week-${week}.tif`;
  const jpgUrl = `${baseUrl}/tiffs/optimized/${index}/${year}/week-${week}.jpg`;

  console.log('Loading TIFF for georeferencing:', tiffUrl);

  try {
    // Fetch the TIFF file to get georeferencing
    const response = await fetch(tiffUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch TIFF: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // Parse the TIFF to get georeferencing information
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();

    console.log('Optimized TIFF loaded. Dimensions:', image.getWidth(), 'x', image.getHeight());

    // Get the bounding box - now in Web Mercator (EPSG:3857) coordinates
    const bbox = image.getBoundingBox();
    const resolution = image.getResolution();
    const origin = image.getOrigin();

    console.log('=== GeoTIFF Metadata ===');
    console.log('Raw bbox (Web Mercator) [minX, minY, maxX, maxY]:', bbox);
    console.log('Origin (Web Mercator) [x, y]:', origin);
    console.log('Resolution [x, y]:', resolution);
    console.log('Image size [width, height]:', [image.getWidth(), image.getHeight()]);

    // Handle Y-axis flip
    const isYFlipped = resolution[1] < 0;
    console.log('Image Y-axis is flipped:', isYFlipped);

    let minX = bbox[0];
    let minY = bbox[1];
    let maxX = bbox[2];
    let maxY = bbox[3];

    console.log('Web Mercator coordinates (meters):');
    console.log('  minX (left):', minX, 'maxX (right):', maxX);
    console.log('  minY (bottom):', minY, 'maxY (top):', maxY);

    // Convert Web Mercator (EPSG:3857) to WGS84 (EPSG:4326) for Mapbox
    // Web Mercator uses meters, we need to convert to lon/lat degrees
    const [minLon, minLat] = webMercatorToWGS84(minX, minY);
    const [maxLon, maxLat] = webMercatorToWGS84(maxX, maxY);
    const [topLeftLon, topLeftLat] = webMercatorToWGS84(minX, maxY);
    const [bottomRightLon, bottomRightLat] = webMercatorToWGS84(maxX, minY);

    const bounds: [number, number, number, number] = [minLon, minLat, maxLon, maxLat];

    console.log('=== WGS84 Coordinates (for Mapbox) ===');
    console.log('Bounding box [minLon, minLat, maxLon, maxLat]:', bounds);
    console.log('Four corners in WGS84:');
    console.log('  Bottom-Left:', [minLon, minLat]);
    console.log('  Bottom-Right:', [bottomRightLon, bottomRightLat]);
    console.log('  Top-Left:', [topLeftLon, topLeftLat]);
    console.log('  Top-Right:', [maxLon, maxLat]);

    // Use the JPG for display (correct colors from GDAL colorization)
    // We only used the TIFF to get accurate georeferencing metadata
    console.log('Using JPG for display:', jpgUrl);

    return {
      imageUrl: jpgUrl,
      bounds,
      isYFlipped
    };
  } catch (error) {
    console.error('Error loading optimized TIFF:', error);
    throw error;
  }
}

// TypedArray type for TIFF rasters
type TypedArray = Uint8Array | Uint16Array | Uint32Array | Float32Array | Float64Array;

/**
 * Get available weeks for an index
 */
export async function getAvailableWeeks(index: string, year: number): Promise<number[]> {
  // For now, VHI has weeks 20-29 (approximate, based on DOY 153-225)
  if (index.toLowerCase() === 'vhi' && year === 2025) {
    return [20, 21, 22, 23, 24, 25, 26, 27, 28, 29];
  }
  return [];
}
