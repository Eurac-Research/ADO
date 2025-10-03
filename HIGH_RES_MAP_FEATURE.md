# High-Resolution TIFF Map Feature

## Overview
This feature adds support for displaying high-resolution GeoTIFF layers on the Mapbox map as an alternative to the standard GeoJSON visualization. Currently implemented for the VHI (Vegetation Health Index) with 10 weekly TIFF files.

## Features Implemented

### 1. **High Resolution Map Button**
- **Location**: Above the legend in the control panel (left side of map)
- **Visibility**: Only shown when viewing the VHI index
- **Design**: Prominent toggle button with icon
  - **Inactive state**: White background with blue border, shows "High Resolution Map"
  - **Active state**: Blue background, shows "Standard Map"

### 2. **TIFF Layer Rendering**
- **Technology**: Uses `geotiff` library to parse TIFF files
- **Colorization**: Manually applies VHI color scheme to TIFF data
  - Respects the existing VHI legend colors
  - Interpolates colors between stops for smooth gradients
  - Handles null/undefined values as transparent pixels
- **Integration**: Rendered as a Mapbox raster layer overlay

### 3. **Week Timeline Slider**
- **Location**: Bottom center of map (above the main control panel)
- **Functionality**:
  - Shows current week label (e.g., "Week 22")
  - Displays range: first week to last week
  - Slider to navigate through weeks
  - Previous/Next buttons for step-by-step navigation
  - Shows progress (e.g., "3 of 10")
- **Design**: Semi-transparent white background with blur effect

### 4. **Available TIFF Data**
Currently available VHI TIFFs for 2025:
- Day of Year 153 (Week 22) - June 2
- Day of Year 161 (Week 23) - June 10
- Day of Year 169 (Week 25) - June 18
- Day of Year 177 (Week 26) - June 26
- Day of Year 185 (Week 27) - July 4
- Day of Year 193 (Week 28) - July 12
- Day of Year 201 (Week 29) - July 20
- Day of Year 209 (Week 30) - July 28
- Day of Year 217 (Week 31) - August 5
- Day of Year 225 (Week 33) - August 13

**Note**: Files are 8-day composites, hence the gaps in day numbers

## File Structure

### New Files Created

1. **`/lib/tiff-renderer.ts`**
   - Core rendering logic for GeoTIFF files
   - Color interpolation functions
   - TIFF availability helpers
   - Week calculation utilities

2. **`/components/HighResTiffLayer.tsx`**
   - React component for TIFF layer management
   - Mapbox layer integration
   - Week slider UI
   - Loading and error states

3. **`/types/plotty.d.ts`**
   - TypeScript type definitions for plotty library
   - (Currently not used, kept for future reference)

### Modified Files

1. **`/app/[slug]/index-client.tsx`**
   - Added High Resolution Map button
   - Integrated HighResTiffLayer component
   - State management for showing/hiding TIFF layer
   - Color stops configuration from metadata

## Technical Details

### Color Mapping
The VHI colormap from metadata:
```json
{
  "stops": [
    [0, "rgba(132,76,20,0.7)"],    // Extremely low vitality (brown)
    [25, "rgba(253,174,97,0.7)"],   // Low vitality (orange)
    [50, "rgba(255,255,191,0.7)"],  // Average vitality (yellow)
    [75, "rgba(171,217,126,0.7)"],  // High vitality (light green)
    [100, "rgba(51,160,44,0.7)"]    // Extremely high vitality (green)
  ]
}
```

### TIFF File Naming Convention
- Format: `vhi_8d_doy{YEAR}{DOY}_{RESOLUTION}_laea.tif`
- Example: `vhi_8d_doy2025153_231m_laea.tif`
- Where:
  - `8d` = 8-day composite
  - `doy` = day of year
  - `231m` = 231-meter resolution
  - `laea` = Lambert Azimuthal Equal-Area projection

### Layer Rendering Process
1. Fetch TIFF file from `/tifs/` directory
2. Parse TIFF using geotiff library
3. Extract raster data and bounding box
4. Apply color interpolation pixel-by-pixel
5. Convert to ImageData
6. Convert ImageData to base64 PNG
7. Add as Mapbox image source
8. Render as raster layer with 0.8 opacity

## Future Enhancements

### API Integration
When TIFFs become available via API:

1. Update `getAvailableTiffs()` in `tiff-renderer.ts`:
```typescript
export async function getAvailableTiffs(index: string): Promise<string[]> {
  // Fetch from API instead of hardcoded list
  const response = await fetch(`/api/tiffs/${index}`);
  const data = await response.json();
  return data.tiffUrls;
}
```

2. Support for all indices (not just VHI):
   - Remove the VHI-only check in button visibility
   - Pass appropriate color stops for each index
   - Update file naming pattern if different

### Performance Optimizations
- Cache rendered TIFF images
- Preload adjacent weeks for smoother navigation
- Use Web Workers for TIFF processing
- Implement progressive loading for large TIFFs

### Additional Features
- Animation mode (auto-play through weeks)
- Custom opacity slider
- Side-by-side comparison with GeoJSON
- Export high-res image functionality
- Date picker for direct week selection

## Usage Instructions

1. Navigate to any index page (e.g., `/vhi`)
2. Look for the "High Resolution Map" button above the legend
3. Click the button to activate high-resolution mode
4. Use the week slider at the bottom to navigate through time
5. Click "Standard Map" to return to GeoJSON view

## Dependencies

- **geotiff**: ^2.0.7 - For parsing GeoTIFF files
- **plotty**: ^0.4.9 - (Optional, not currently used)
- **react-map-gl**: ^7.1.9 - Mapbox GL JS React wrapper
- **mapbox-gl**: ^2.7.0 - Mapbox GL JS

## Notes

- The feature is currently only visible for the VHI index
- TIFF files must be placed in the `/public/tifs/` directory (Next.js requirement for serving static files)
- The legend remains unchanged and applies to both GeoJSON and TIFF views
- TIFF layer is rendered with 80% opacity for better visibility
- Layer automatically removes when switching back to standard view
