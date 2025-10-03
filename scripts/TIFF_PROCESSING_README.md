# High-Resolution TIFF Processing Pipeline

## Overview

This pipeline automatically processes raw high-resolution drought index TIFFs by:
1. **Extracting colormaps** from ADO metadata JSON files
2. **Colorizing TIFFs** using GDAL color relief
3. **Optimizing** to Cloud-Optimized GeoTIFF (COG) format
4. **Generating PNG fallbacks** for web browsers

## Architecture

### Current vs Proposed Comparison

| Aspect | Current (Client-side) | Proposed (Server-side) |
|--------|----------------------|------------------------|
| File size | 15-16 MB | 2-5 MB (70-90% smaller) |
| Download time | ~12 seconds | ~2-4 seconds |
| Client processing | 54ms colorization | ~10ms decode only |
| Mobile performance | Heavy CPU usage | Light CPU usage |
| Caching | Per-user cache | CDN cached |
| Total load time | ~12 seconds | **~2-4 seconds** |

### Performance Improvement: **3-6x faster! 🚀**

## File Structure

```
ado-data/
├── json/nuts/metadata/
│   ├── VHI.json                    # Source metadata with colormap
│   ├── SPI-1.json
│   └── ...
│
├── tiffs/
│   ├── raw/                        # Original TIFFs (not served to frontend)
│   │   ├── VHI/
│   │   │   └── 2025/
│   │   │       ├── vhi_8d_doy2025153_231m_laea.tif  (15 MB)
│   │   │       ├── vhi_8d_doy2025161_231m_laea.tif
│   │   │       └── ...
│   │   ├── SPI-1/
│   │   └── ...
│   │
│   ├── colormaps/                  # Auto-generated GDAL colormaps
│   │   ├── VHI-colormap.txt        # Extracted from VHI.json
│   │   ├── SPI-1-colormap.txt
│   │   └── ...
│   │
│   └── optimized/                  # Processed TIFFs (served to frontend)
│       ├── VHI/
│       │   └── 2025/
│       │       ├── week-22.tif     # COG format (2-5 MB) ✓
│       │       ├── week-22.png     # PNG fallback (1-3 MB) ✓
│       │       ├── week-23.tif
│       │       └── ...
│       ├── SPI-1/
│       └── ...
```

## Setup

### 1. Install Dependencies

```bash
# Install GDAL (macOS)
brew install gdal

# Install GDAL (Ubuntu/GitHub Actions)
sudo apt-get install gdal-bin python3-gdal

# Install Node.js dependencies
npm install
```

### 2. Generate GDAL Colormaps from Metadata

```bash
# Process single index
node scripts/convert-metadata-to-gdal-colormap.js \
  /path/to/ado-data/json/nuts/metadata/VHI.json

# Process all indices
for metadata in /path/to/ado-data/json/nuts/metadata/*.json; do
  node scripts/convert-metadata-to-gdal-colormap.js "$metadata"
done
```

**Output:** `VHI-colormap.txt`, `SPI-1-colormap.txt`, etc.

### 3. Process TIFFs Locally (Optional)

```bash
# Set paths
RAW_TIFF="/path/to/raw/vhi_8d_doy2025153_231m_laea.tif"
COLORMAP="/path/to/colormaps/VHI-colormap.txt"
OUTPUT_DIR="/path/to/optimized/VHI/2025"

mkdir -p "$OUTPUT_DIR"

# Step 1: Apply colorization
gdaldem color-relief \
  "$RAW_TIFF" \
  "$COLORMAP" \
  "$OUTPUT_DIR/week-22-colored.tif" \
  -alpha \
  -co COMPRESS=DEFLATE

# Step 2: Convert to Cloud-Optimized GeoTIFF
gdal_translate \
  -of COG \
  -co COMPRESS=DEFLATE \
  -co PREDICTOR=2 \
  -co NUM_THREADS=ALL_CPUS \
  -co BLOCKSIZE=512 \
  -co OVERVIEWS=AUTO \
  "$OUTPUT_DIR/week-22-colored.tif" \
  "$OUTPUT_DIR/week-22.tif"

# Step 3: Generate PNG fallback
gdal_translate \
  -of PNG \
  -co ZLEVEL=9 \
  "$OUTPUT_DIR/week-22-colored.tif" \
  "$OUTPUT_DIR/week-22.png"

# Clean up intermediate file
rm "$OUTPUT_DIR/week-22-colored.tif"
```

### 4. Deploy GitHub Action

Copy `.github/workflows/process-tiffs.yml` to your ado-data repository:

```bash
cp scripts/github-action-process-tiffs.yml \
   /path/to/ado-data/.github/workflows/process-tiffs.yml
```

The action will automatically:
- Trigger on new TIFF uploads or metadata changes
- Process all TIFFs in parallel
- Commit optimized files back to the repo

## Frontend Integration

### Update HighResTiffLayer Component

```typescript
// Before (Client-side processing)
const tiffUrl = `/tifs/${filename}.tif` // 15 MB, needs colorization

// After (Server-side processed)
const tiffUrl = `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/tiffs/optimized/${index}/${year}/week-${week}.tif`
// Or use PNG fallback:
const pngUrl = `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/tiffs/optimized/${index}/${year}/week-${week}.png`
```

### Simplified Rendering (No Colorization Needed!)

```typescript
// Remove colorization code
// const colorLUT = createColorLookupTable(colorStops) ❌

// Just decode and display
const image = await tiff.getImage()
const canvas = await image.readRGB() // Already colored! ✓
```

## Benefits

### 1. **Performance** 🚀
- **70-90% smaller files**: 15MB → 2-5MB
- **3-6x faster loading**: 12s → 2-4s
- **No client-side processing**: Just decode & display

### 2. **User Experience** ✨
- Much faster on mobile devices
- Lower battery consumption
- Works better on slow connections
- Instant map interactions (no processing lag)

### 3. **Developer Experience** 🛠️
- **Automatic processing**: Push raw TIFFs, get optimized versions
- **Version control**: Update colors without client changes
- **Consistent rendering**: Same colors for all users
- **Multiple formats**: TIFF for accuracy, PNG for compatibility

### 4. **Cost & Scalability** 💰
- **Free GitHub storage** (reasonable sizes)
- **Free GitHub Actions** (generous free tier)
- **CDN caching**: jsDelivr caches processed files
- **Reduced bandwidth**: 70-90% less data transfer

## Metadata Format

Each index has a metadata JSON file with colormap:

```json
{
  "short_name": "VHI",
  "colormap": {
    "paint": {
      "fill-color": {
        "stops": [
          [0, "rgba(132,76,20,0.7)"],     // Brown: extremely low
          [25, "rgba(253,174,97,0.7)"],   // Orange: low
          [50, "rgba(255,255,191,0.7)"],  // Yellow: average
          [75, "rgba(171,217,126,0.7)"],  // Light green: high
          [100, "rgba(51,160,44,0.7)"]    // Dark green: extremely high
        ]
      }
    }
  }
}
```

The conversion script automatically:
1. Parses `rgba()` strings
2. Extracts RGB + Alpha values
3. Generates GDAL-compatible format
4. Handles opacity (0.7 → 179/255)

## GDAL Colormap Format

```text
# GDAL Color Relief for VHI
# Format: value R G B A

0 132 76 20 179
25 253 174 97 179
50 255 255 191 179
75 171 217 126 179
100 51 160 44 179
```

## Troubleshooting

### GDAL not found
```bash
# macOS
brew install gdal

# Ubuntu
sudo apt-get install gdal-bin
```

### Check GDAL version
```bash
gdalinfo --version
# Should be >= 3.0 for COG support
```

### Verify colormap format
```bash
# Test colorization
gdaldem color-relief \
  input.tif \
  colormap.txt \
  output.tif \
  -alpha
```

### Check COG validity
```bash
# Install rio-cogeo
pip install rio-cogeo

# Validate
rio cogeo validate output.tif
```

## Next Steps

1. ✅ **Set up conversion script** (Done!)
2. ⏳ Copy GitHub Action to ado-data repo
3. ⏳ Upload raw TIFFs to `tiffs/raw/`
4. ⏳ Trigger action (automatic processing)
5. ⏳ Update frontend to fetch optimized TIFFs
6. ⏳ Remove client-side colorization code
7. ⏳ Test and measure performance improvements

## Resources

- [GDAL Color Relief Documentation](https://gdal.org/programs/gdaldem.html#color-relief)
- [Cloud-Optimized GeoTIFF](https://www.cogeo.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [ADO Metadata Format](https://github.com/Eurac-Research/ado-data)
