# Renders the MaterialCommunityIcons "warehouse" glyph to a white PNG on a
# transparent background, for use as the Expo splash image.
#
# The glyph is drawn oversized, then cropped to its actual inked bounds and
# re-centred on a square canvas. Icon fonts carry uneven internal padding, so
# centring on the font's reported metrics leaves the mark visibly off-centre.

Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$fontPath = Join-Path $projectRoot 'node_modules\@expo\vector-icons\build\vendor\react-native-vector-icons\Fonts\MaterialCommunityIcons.ttf'
$outPath  = Join-Path $projectRoot 'assets\images\splash-icon.png'

if (-not (Test-Path $fontPath)) { throw "Font not found: $fontPath" }

# U+F0F81, outside the BMP, so it needs a surrogate pair.
$glyph = [char]::ConvertFromUtf32(987009)

$collection = New-Object System.Drawing.Text.PrivateFontCollection
$collection.AddFontFile($fontPath)
$family = $collection.Families[0]

# Oversized scratch canvas: the glyph is drawn big, measured, then scaled down
# by cropping, which keeps the antialiased edges clean.
$scratchSize = 2048
$scratch = New-Object System.Drawing.Bitmap($scratchSize, $scratchSize)
$g = [System.Drawing.Graphics]::FromImage($scratch)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
# AntiAlias, not ClearType: subpixel rendering assumes an opaque background and
# leaves coloured fringes on a transparent one.
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

$font = New-Object System.Drawing.Font($family, 1200, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center

$g.DrawString($glyph, $font, $brush, ($scratchSize / 2), ($scratchSize / 2), $format)
$g.Flush()
$g.Dispose()

# Inked bounds: scan for any pixel with alpha, so the crop follows the mark
# itself rather than the font's advance box.
$minX = $scratchSize; $minY = $scratchSize; $maxX = -1; $maxY = -1
$data = $scratch.LockBits(
  (New-Object System.Drawing.Rectangle(0, 0, $scratchSize, $scratchSize)),
  [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
  [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$stride = $data.Stride
$bytes = New-Object byte[] ($stride * $scratchSize)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
$scratch.UnlockBits($data)

for ($y = 0; $y -lt $scratchSize; $y++) {
  $row = $y * $stride
  for ($x = 0; $x -lt $scratchSize; $x++) {
    # BGRA byte order; index 3 is alpha.
    if ($bytes[$row + ($x * 4) + 3] -gt 8) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}

if ($maxX -lt 0) { throw "Glyph rendered empty - the font may not contain U+F0F81." }

$inkW = $maxX - $minX + 1
$inkH = $maxY - $minY + 1
Write-Output "Inked bounds: ${inkW}x${inkH} at ($minX,$minY)"

# Final canvas. The mark occupies ~62% of the width, leaving breathing room so
# it does not crowd the edges when Expo scales it to imageWidth.
$outSize = 1024
$target = [int]($outSize * 0.62)
$scale = [Math]::Min($target / $inkW, $target / $inkH)
$drawW = [int]($inkW * $scale)
$drawH = [int]($inkH * $scale)

$out = New-Object System.Drawing.Bitmap($outSize, $outSize)
$og = [System.Drawing.Graphics]::FromImage($out)
$og.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$og.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$og.Clear([System.Drawing.Color]::Transparent)

$destRect = New-Object System.Drawing.Rectangle(
  [int](($outSize - $drawW) / 2), [int](($outSize - $drawH) / 2), $drawW, $drawH)
$srcRect = New-Object System.Drawing.Rectangle($minX, $minY, $inkW, $inkH)
$og.DrawImage($scratch, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$og.Flush()

$out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$og.Dispose(); $out.Dispose(); $scratch.Dispose()
$font.Dispose(); $brush.Dispose(); $format.Dispose(); $collection.Dispose()

Write-Output "Wrote $outPath (${outSize}x${outSize}, mark ${drawW}x${drawH})"
