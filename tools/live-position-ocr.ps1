param(
  [int]$IntervalSeconds = 2,
  [string]$ImagePath = "",
  [switch]$Once,
  [switch]$ResetRegion,
  [switch]$NoPost,
  [switch]$NoStable,
  [switch]$UseTemplates,
  [switch]$NoTemplates,
  [string]$TrainText = "",
  [switch]$ResetTemplates,
  [switch]$ClearTemplatesOnly,
  [int]$X = -1,
  [int]$Y = -1,
  [int]$Width = 0,
  [int]$Height = 0
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
$DataDir = Join-Path $RootDir "data"
$ConfigPath = Join-Path $DataDir "ocr-region.json"
$TemplatePath = Join-Path $DataDir "ocr-digit-templates.json"
$CapturePath = Join-Path $DataDir "ocr-capture.png"
$OcrImagePath = Join-Path $DataDir "ocr-last.png"
$PreviewPath = Join-Path $DataDir "ocr-preview.png"
$ServerUrl = "http://127.0.0.1:8765"
$MinRegionWidth = 80
$MinRegionHeight = 18
$script:LastCoordinate = $null
$script:LastSentCoordinate = $null
$script:PendingCoordinate = $null
$script:PendingCount = 0
$script:RejectedJumpCount = 0
$script:MissingCoordinateCount = 0
$script:WasCoordinateHidden = $false
$script:UseTemplates = $UseTemplates -and -not $NoTemplates

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class DpiAwareness {
  [DllImport("user32.dll")]
  public static extern bool SetProcessDPIAware();

  [DllImport("shcore.dll")]
  public static extern int SetProcessDpiAwareness(int awareness);
}
"@

try {
  [DpiAwareness]::SetProcessDpiAwareness(2) | Out-Null
} catch {
  try { [DpiAwareness]::SetProcessDPIAware() | Out-Null } catch {}
}

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

function Find-Tesseract {
  $command = Get-Command tesseract -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  $knownPath = "D:\tesseract\tesseract.exe"
  if (Test-Path $knownPath) { return $knownPath }
  throw "Cannot find tesseract.exe. Install Tesseract OCR or add it to PATH."
}

function Test-LocalServer {
  try {
    Invoke-RestMethod -Uri "$ServerUrl/api/position" -Method Get -TimeoutSec 1 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Ensure-LocalServer {
  if ($NoPost) { return }
  if (Test-LocalServer) { return }

  Write-Host "Local web service is not running. Starting it now..."
  Start-Process -FilePath "node" -ArgumentList "server.mjs" -WorkingDirectory $RootDir -WindowStyle Hidden | Out-Null
  Start-Sleep -Seconds 2
  if (-not (Test-LocalServer)) {
    throw "Cannot connect to $ServerUrl. Please double-click start-web.cmd first."
  }
}

function Read-JsonFile($Path) {
  if (-not (Test-Path $Path)) { return $null }
  return Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Save-JsonFile($Path, $Value) {
  $Value | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function New-RegionFromPoints($PointA, $PointB) {
  return New-RegionFromNumbers ([int]$PointA.X) ([int]$PointA.Y) ([int]$PointB.X) ([int]$PointB.Y)
}

function New-RegionFromNumbers([int]$X1, [int]$Y1, [int]$X2, [int]$Y2) {
  $left = [Math]::Min($X1, $X2)
  $top = [Math]::Min($Y1, $Y2)
  $right = [Math]::Max($X1, $X2)
  $bottom = [Math]::Max($Y1, $Y2)
  return [pscustomobject]@{
    x = $left
    y = $top
    width = [Math]::Max(20, $right - $left)
    height = [Math]::Max(12, $bottom - $top)
  }
}

function Select-RegionWithMouse {
  $screenBounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
  $form = New-Object System.Windows.Forms.Form
  $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
  $form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
  $form.Bounds = $screenBounds
  $form.TopMost = $true
  $form.ShowInTaskbar = $false
  $form.BackColor = [System.Drawing.Color]::Black
  $form.Opacity = 0.28
  $form.Cursor = [System.Windows.Forms.Cursors]::Cross
  $form.KeyPreview = $true

  $state = [pscustomobject]@{
    dragging = $false
    startX = 0
    startY = 0
    currentX = 0
    currentY = 0
    region = $null
    cancelled = $false
  }

  $form.Add_KeyDown({
    if ($_.KeyCode -eq [System.Windows.Forms.Keys]::Escape) {
      $state.cancelled = $true
      $form.Close()
    }
  })

  $form.Add_MouseDown({
    if ($_.Button -ne [System.Windows.Forms.MouseButtons]::Left) { return }
    $state.dragging = $true
    $state.startX = [int]$_.X
    $state.startY = [int]$_.Y
    $state.currentX = [int]$_.X
    $state.currentY = [int]$_.Y
    $form.Invalidate()
  })

  $form.Add_MouseMove({
    if (-not $state.dragging) { return }
    $state.currentX = [int]$_.X
    $state.currentY = [int]$_.Y
    $form.Invalidate()
  })

  $form.Add_MouseUp({
    if (-not $state.dragging -or $_.Button -ne [System.Windows.Forms.MouseButtons]::Left) { return }
    $state.dragging = $false
    $screenStartX = [int]($state.startX + $screenBounds.X)
    $screenStartY = [int]($state.startY + $screenBounds.Y)
    $screenEndX = [int]([int]$_.X + $screenBounds.X)
    $screenEndY = [int]([int]$_.Y + $screenBounds.Y)
    $state.region = New-RegionFromNumbers $screenStartX $screenStartY $screenEndX $screenEndY
    $form.Close()
  })

  $form.Add_Paint({
    $graphics = $_.Graphics
    $font = New-Object System.Drawing.Font -ArgumentList "Microsoft YaHei UI", 14, ([System.Drawing.FontStyle]::Bold)
    $brush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::White)
    $pen = New-Object System.Drawing.Pen -ArgumentList ([System.Drawing.Color]::Cyan), 3
    $fill = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(80, 0, 180, 255))
    try {
      $graphics.DrawString("按住鼠标左键，拖住游戏坐标数字区域；松开保存，ESC 取消", $font, $brush, 24, 24)
      if ($state.dragging) {
        $left = [Math]::Min($state.startX, $state.currentX)
        $top = [Math]::Min($state.startY, $state.currentY)
        $width = [Math]::Abs($state.currentX - $state.startX)
        $height = [Math]::Abs($state.currentY - $state.startY)
        $rect = New-Object System.Drawing.Rectangle -ArgumentList $left, $top, $width, $height
        $graphics.FillRectangle($fill, $rect)
        $graphics.DrawRectangle($pen, $rect)
      }
    } finally {
      $font.Dispose()
      $brush.Dispose()
      $pen.Dispose()
      $fill.Dispose()
    }
  })

  [System.Windows.Forms.Application]::Run($form)
  $form.Dispose()

  if ($state.cancelled -or -not $state.region) {
    throw "OCR area selection was cancelled."
  }
  return $state.region
}

function Test-RegionSize($Region) {
  return $Region -and $Region.width -ge $MinRegionWidth -and $Region.height -ge $MinRegionHeight
}

function Show-RegionPreview($ImagePath, $Region) {
  $source = [System.Drawing.Bitmap]::FromFile((Resolve-Path $ImagePath))
  $preview = $null
  try {
    $scaleByWidth = [Math]::Floor(760 / [Math]::Max(1, $source.Width))
    $scaleByHeight = [Math]::Floor(360 / [Math]::Max(1, $source.Height))
    $scale = [Math]::Max(4, [Math]::Min(12, [Math]::Min($scaleByWidth, $scaleByHeight)))
    $preview = New-Object System.Drawing.Bitmap -ArgumentList ($source.Width * $scale), ($source.Height * $scale)
    $graphics = [System.Drawing.Graphics]::FromImage($preview)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
      $graphics.DrawImage($source, 0, 0, $preview.Width, $preview.Height)
    } finally {
      $graphics.Dispose()
    }

    $form = New-Object System.Windows.Forms.Form
    $form.Text = "OCR Area Preview"
    $form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
    $form.TopMost = $true
    $form.ClientSize = New-Object System.Drawing.Size -ArgumentList ([Math]::Max(460, $preview.Width + 24)), ($preview.Height + 104)
    $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
    $form.MaximizeBox = $false
    $form.MinimizeBox = $false

    $label = New-Object System.Windows.Forms.Label
    $label.AutoSize = $true
    $label.Text = "Confirm this area contains the full coordinate text."
    $label.Location = New-Object System.Drawing.Point -ArgumentList 12, 10

    $picture = New-Object System.Windows.Forms.PictureBox
    $picture.Image = $preview
    $picture.SizeMode = [System.Windows.Forms.PictureBoxSizeMode]::Normal
    $picture.Location = New-Object System.Drawing.Point -ArgumentList 12, 36
    $picture.Size = New-Object System.Drawing.Size -ArgumentList $preview.Width, $preview.Height
    $picture.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle

    $okButton = New-Object System.Windows.Forms.Button
    $okButton.Text = "Use this area"
    $okButton.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $okButton.Size = New-Object System.Drawing.Size -ArgumentList 120, 30
    $okButton.Location = New-Object System.Drawing.Point -ArgumentList ($form.ClientSize.Width - 260), ($form.ClientSize.Height - 42)

    $retryButton = New-Object System.Windows.Forms.Button
    $retryButton.Text = "Select again"
    $retryButton.DialogResult = [System.Windows.Forms.DialogResult]::Retry
    $retryButton.Size = New-Object System.Drawing.Size -ArgumentList 120, 30
    $retryButton.Location = New-Object System.Drawing.Point -ArgumentList ($form.ClientSize.Width - 132), ($form.ClientSize.Height - 42)

    $form.Controls.AddRange(@($label, $picture, $okButton, $retryButton))
    $form.AcceptButton = $okButton
    $form.CancelButton = $retryButton

    $result = $form.ShowDialog()
    return $result -eq [System.Windows.Forms.DialogResult]::OK
  } finally {
    if ($preview) { $preview.Dispose() }
    $source.Dispose()
  }
}

function Calibrate-Region {
  Write-Host ""
  Write-Host "First setup: drag a rectangle around the coordinate numbers in the game window."
  Write-Host "Tip: select only the numbers, for example 16058,3317."
  while ($true) {
    Start-Sleep -Milliseconds 600
    $region = Select-RegionWithMouse
    if (-not (Test-RegionSize $region)) {
      [System.Windows.Forms.MessageBox]::Show(
        "The selected area is too small. Drag around the full coordinate text, including all digits and comma.",
        "OCR area too small",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Information
      ) | Out-Null
      continue
    }
    Capture-Region $region $PreviewPath
    if (-not (Show-RegionPreview $PreviewPath $region)) {
      continue
    }
    Save-JsonFile $ConfigPath $region
    Write-Host ("Saved OCR area: X={0}, Y={1}, W={2}, H={3}" -f $region.x, $region.y, $region.width, $region.height)
    return $region
  }
}

function Get-ConfiguredRegion {
  if ($X -ge 0 -and $Y -ge 0 -and $Width -gt 0 -and $Height -gt 0) {
    return [pscustomobject]@{ x = $X; y = $Y; width = $Width; height = $Height }
  }
  if ($ImagePath) { return $null }
  if (-not $ResetRegion) {
    $saved = Read-JsonFile $ConfigPath
    if ($saved -and (Test-RegionSize $saved)) { return $saved }
    if ($saved) { Write-Host "Saved OCR area is too small. Please select it again." }
  }
  return Calibrate-Region
}

function Capture-Region($Region, $Path) {
  $bitmap = New-Object System.Drawing.Bitmap -ArgumentList $Region.width, $Region.height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.CopyFromScreen($Region.x, $Region.y, 0, 0, $bitmap.Size)
    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

function Test-LightTextPixel($Pixel) {
  $brightness = ($Pixel.R * 0.299) + ($Pixel.G * 0.587) + ($Pixel.B * 0.114)
  $maxChannel = [Math]::Max($Pixel.R, [Math]::Max($Pixel.G, $Pixel.B))
  $minChannel = [Math]::Min($Pixel.R, [Math]::Min($Pixel.G, $Pixel.B))
  return $brightness -gt 105 -and ($maxChannel - $minChannel) -lt 85
}

function Test-TemplateTextPixel($Pixel) {
  $brightness = ($Pixel.R * 0.299) + ($Pixel.G * 0.587) + ($Pixel.B * 0.114)
  $maxChannel = [Math]::Max($Pixel.R, [Math]::Max($Pixel.G, $Pixel.B))
  $minChannel = [Math]::Min($Pixel.R, [Math]::Min($Pixel.G, $Pixel.B))
  return $brightness -gt 145 -and $maxChannel -gt 150 -and ($maxChannel - $minChannel) -lt 95
}

function Test-CoordinateCorePixel($Pixel) {
  $brightness = ($Pixel.R * 0.299) + ($Pixel.G * 0.587) + ($Pixel.B * 0.114)
  $maxChannel = [Math]::Max($Pixel.R, [Math]::Max($Pixel.G, $Pixel.B))
  $minChannel = [Math]::Min($Pixel.R, [Math]::Min($Pixel.G, $Pixel.B))
  return $brightness -gt 165 -and $maxChannel -gt 175 -and ($maxChannel - $minChannel) -lt 75
}

function Find-CoordinateTextBounds($Bitmap) {
  $width = $Bitmap.Width
  $height = $Bitmap.Height
  if ($width -lt 20 -or $height -lt 8) { return $null }

  $ignoreColumns = New-Object bool[] $width
  for ($px = 0; $px -lt $width; $px++) {
    $hits = 0
    for ($py = 0; $py -lt $height; $py++) {
      if (Test-CoordinateCorePixel $Bitmap.GetPixel($px, $py)) { $hits++ }
    }
    if ($hits -gt [Math]::Max(8, [Math]::Floor($height * 0.35))) {
      $ignoreColumns[$px] = $true
    }
  }

  $rowHits = New-Object int[] $height
  for ($py = 0; $py -lt $height; $py++) {
    $hits = 0
    for ($px = 0; $px -lt $width; $px++) {
      if ($ignoreColumns[$px]) { continue }
      if (Test-CoordinateCorePixel $Bitmap.GetPixel($px, $py)) { $hits++ }
    }
    $rowHits[$py] = $hits
  }

  $minRowHits = [Math]::Max(3, [Math]::Floor($width * 0.035))
  $bestStart = -1
  $bestEnd = -1
  $bestScore = 0
  $inside = $false
  $start = 0
  $lastHit = 0
  $score = 0
  $gap = 0

  for ($py = 0; $py -lt $height; $py++) {
    if ($rowHits[$py] -ge $minRowHits) {
      if (-not $inside) {
        $inside = $true
        $start = $py
        $score = 0
      }
      $lastHit = $py
      $score += $rowHits[$py]
      $gap = 0
    } elseif ($inside) {
      $gap += 1
      if ($gap -gt 2) {
        $groupHeight = $lastHit - $start + 1
        if ($groupHeight -ge 5 -and $groupHeight -le 28 -and $score -gt $bestScore) {
          $bestStart = $start
          $bestEnd = $lastHit
          $bestScore = $score
        }
        $inside = $false
        $gap = 0
      }
    }
  }
  if ($inside) {
    $groupHeight = $lastHit - $start + 1
    if ($groupHeight -ge 5 -and $groupHeight -le 28 -and $score -gt $bestScore) {
      $bestStart = $start
      $bestEnd = $lastHit
      $bestScore = $score
    }
  }

  if ($bestStart -lt 0) { return $null }

  $minX = $width
  $maxX = -1
  for ($py = $bestStart; $py -le $bestEnd; $py++) {
    for ($px = 0; $px -lt $width; $px++) {
      if ($ignoreColumns[$px]) { continue }
      if (-not (Test-CoordinateCorePixel $Bitmap.GetPixel($px, $py))) { continue }
      if ($px -lt $minX) { $minX = $px }
      if ($px -gt $maxX) { $maxX = $px }
    }
  }

  if ($maxX -lt $minX) { return $null }

  $marginX = 4
  $marginY = 3
  $left = [Math]::Max(0, $minX - $marginX)
  $top = [Math]::Max(0, $bestStart - $marginY)
  $right = [Math]::Min($width - 1, $maxX + $marginX)
  $bottom = [Math]::Min($height - 1, $bestEnd + $marginY)
  $boxWidth = $right - $left + 1
  $boxHeight = $bottom - $top + 1
  if ($boxWidth -lt 22 -or $boxHeight -lt 8) { return $null }
  return New-Object System.Drawing.Rectangle -ArgumentList $left, $top, $boxWidth, $boxHeight
}

function Trim-BitmapToText($Bitmap) {
  $coordinateBounds = Find-CoordinateTextBounds $Bitmap
  if ($coordinateBounds) {
    return $Bitmap.Clone($coordinateBounds, $Bitmap.PixelFormat)
  }

  $minX = $Bitmap.Width
  $minY = $Bitmap.Height
  $maxX = -1
  $maxY = -1

  for ($py = 0; $py -lt $Bitmap.Height; $py++) {
    $rowHits = 0
    for ($px = 0; $px -lt $Bitmap.Width; $px++) {
      $pixel = $Bitmap.GetPixel($px, $py)
      if (Test-LightTextPixel $pixel) { $rowHits++ }
    }
    if ($rowHits -gt [Math]::Max(2, [Math]::Floor($Bitmap.Width * 0.8))) {
      continue
    }
    if ($rowHits -eq 0) { continue }
    for ($px = 0; $px -lt $Bitmap.Width; $px++) {
      $pixel = $Bitmap.GetPixel($px, $py)
      if (-not (Test-LightTextPixel $pixel)) { continue }
      if ($px -lt $minX) { $minX = $px }
      if ($px -gt $maxX) { $maxX = $px }
      if ($py -lt $minY) { $minY = $py }
      if ($py -gt $maxY) { $maxY = $py }
    }
  }

  if ($maxX -lt $minX -or $maxY -lt $minY) {
    return New-Object System.Drawing.Bitmap -ArgumentList $Bitmap
  }

  $marginX = 3
  $marginY = 2
  $left = [Math]::Max(0, $minX - $marginX)
  $top = [Math]::Max(0, $minY - $marginY)
  $right = [Math]::Min($Bitmap.Width - 1, $maxX + $marginX)
  $bottom = [Math]::Min($Bitmap.Height - 1, $maxY + $marginY)
  $width = [Math]::Max(1, $right - $left + 1)
  $height = [Math]::Max(1, $bottom - $top + 1)
  if ($width -lt [Math]::Min(25, [Math]::Floor($Bitmap.Width * 0.3)) -or $height -lt 8) {
    return New-Object System.Drawing.Bitmap -ArgumentList $Bitmap
  }
  $rect = New-Object System.Drawing.Rectangle -ArgumentList $left, $top, $width, $height
  return $Bitmap.Clone($rect, $Bitmap.PixelFormat)
}

function Get-GlyphSegments($Bitmap) {
  $textBitmap = Trim-BitmapToText $Bitmap
  try {
    $runs = New-Object System.Collections.Generic.List[object]
    $inside = $false
    $startX = 0
    $gap = 0

    for ($px = 0; $px -lt $textBitmap.Width; $px++) {
      $hits = 0
      for ($py = 0; $py -lt $textBitmap.Height; $py++) {
        if (Test-TemplateTextPixel $textBitmap.GetPixel($px, $py)) { $hits++ }
      }
      $hasText = $hits -gt 0
      if ($hasText -and -not $inside) {
        $inside = $true
        $startX = $px
        $gap = 0
      } elseif ((-not $hasText) -and $inside) {
        $gap += 1
        if ($gap -ge 2) {
          $endX = $px - $gap
          if ($endX -ge $startX) { $runs.Add([pscustomobject]@{ start = $startX; end = $endX }) }
          $inside = $false
          $gap = 0
        }
      } elseif ($hasText -and $inside) {
        $gap = 0
      }
    }
    if ($inside) { $runs.Add([pscustomobject]@{ start = $startX; end = $textBitmap.Width - 1 }) }

    $segments = New-Object System.Collections.Generic.List[object]
    foreach ($run in $runs) {
      $minY = $textBitmap.Height
      $maxY = -1
      for ($px = $run.start; $px -le $run.end; $px++) {
        for ($py = 0; $py -lt $textBitmap.Height; $py++) {
          if (-not (Test-TemplateTextPixel $textBitmap.GetPixel($px, $py))) { continue }
          if ($py -lt $minY) { $minY = $py }
          if ($py -gt $maxY) { $maxY = $py }
        }
      }
      if ($maxY -lt $minY) { continue }
      $left = [Math]::Max(0, [int]$run.start - 1)
      $top = [Math]::Max(0, $minY - 1)
      $right = [Math]::Min($textBitmap.Width - 1, [int]$run.end + 1)
      $bottom = [Math]::Min($textBitmap.Height - 1, $maxY + 1)
      $segments.Add([pscustomobject]@{
        x = $left
        y = $top
        width = $right - $left + 1
        height = $bottom - $top + 1
      })
    }

    return [pscustomobject]@{
      bitmap = $textBitmap
      segments = $segments
    }
  } catch {
    $textBitmap.Dispose()
    throw
  }
}

function Get-SegmentInkCount($Bitmap, $Segment) {
  $hits = 0
  for ($px = [int]$Segment.x; $px -lt ([int]$Segment.x + [int]$Segment.width); $px++) {
    for ($py = [int]$Segment.y; $py -lt ([int]$Segment.y + [int]$Segment.height); $py++) {
      if (Test-TemplateTextPixel $Bitmap.GetPixel($px, $py)) { $hits++ }
    }
  }
  return $hits
}

function Get-MedianNumber($Values) {
  $items = @($Values | Sort-Object)
  if ($items.Count -eq 0) { return 0 }
  return [double]$items[[int][Math]::Floor(($items.Count - 1) / 2)]
}

function ConvertTo-PlainArray($Value) {
  $items = New-Object System.Collections.ArrayList
  if ($null -eq $Value) { return ,($items.ToArray()) }

  if ($Value -is [string]) {
    [void]$items.Add($Value)
    return ,($items.ToArray())
  }

  if ($Value -is [System.Collections.IEnumerable]) {
    foreach ($item in $Value) {
      [void]$items.Add($item)
    }
    return ,($items.ToArray())
  }

  [void]$items.Add($Value)
  return ,($items.ToArray())
}

function Select-DigitLikeSegments($Bitmap, $Segments) {
  $segments = ConvertTo-PlainArray $Segments
  if ($segments.Count -eq 0) { return @() }

  $medianHeight = Get-MedianNumber (@($segments | ForEach-Object { [double]$_.height }))
  $minHeight = [Math]::Max(5, [Math]::Floor($medianHeight * 0.55))
  $kept = @()
  foreach ($segment in $segments) {
    $ink = Get-SegmentInkCount $Bitmap $segment
    if ([int]$segment.height -ge $minHeight -and [int]$segment.width -ge 2 -and $ink -ge 4) {
      $kept += $segment
    }
  }
  return @($kept)
}

function Get-SegmentGap($Left, $Right) {
  if (-not $Left -or -not $Right) { return 0 }
  return [Math]::Max(0, [int]$Right.x - ([int]$Left.x + [int]$Left.width))
}

function Get-TrainingWindowScore($Bitmap, $Segments, $Chars, [int]$SplitIndex) {
  $segments = ConvertTo-PlainArray $Segments
  $chars = ConvertTo-PlainArray $Chars
  $digitHeights = @()
  for ($index = 0; $index -lt $chars.Count; $index++) {
    if ([string]$chars[$index] -ne ",") {
      $digitHeights += [double]$segments[$index].height
    }
  }
  $medianDigitHeight = [Math]::Max(1, (Get-MedianNumber $digitHeights))
  $score = 0.0

  for ($index = 0; $index -lt $chars.Count; $index++) {
    $segment = $segments[$index]
    $height = [double]$segment.height
    $width = [double]$segment.width
    $ink = Get-SegmentInkCount $Bitmap $segment

    if ([string]$chars[$index] -eq ",") {
      if ($height -le $medianDigitHeight * 0.75) { $score += 12 } else { $score -= 10 }
      if ($width -le [Math]::Max(4, $medianDigitHeight * 0.45)) { $score += 4 } else { $score -= 4 }
    } else {
      if ($height -ge $medianDigitHeight * 0.55) { $score += 10 } else { $score -= 18 }
      if ($width -ge 2) { $score += 3 } else { $score -= 8 }
      if ($ink -ge 4) { $score += 3 } else { $score -= 10 }
      $score -= [Math]::Abs($height - $medianDigitHeight) * 0.35
    }
  }

  if ($SplitIndex -gt 0 -and $SplitIndex -lt $segments.Count) {
    $score += [Math]::Min(18, (Get-SegmentGap $segments[$SplitIndex - 1] $segments[$SplitIndex]) * 2)
  }

  return $score
}

function Select-BestSegmentWindow($Bitmap, $Segments, $Chars, [int]$SplitIndex) {
  $segments = ConvertTo-PlainArray $Segments
  $chars = ConvertTo-PlainArray $Chars
  $targetCount = $chars.Count
  if ($targetCount -le 0 -or $segments.Count -lt $targetCount) { return @() }

  $best = @()
  $bestScore = [double]::NegativeInfinity
  for ($start = 0; $start -le ($segments.Count - $targetCount); $start++) {
    $window = @($segments[$start..($start + $targetCount - 1)])
    $score = Get-TrainingWindowScore $Bitmap $window $chars $SplitIndex
    if ($score -gt $bestScore) {
      $bestScore = $score
      $best = $window
    }
  }

  if ($best.Count -eq $targetCount) { return @($best) }
  return @()
}

function Resolve-TrainingAlignment($Bitmap, $Segments, [string]$LabelText) {
  $segments = ConvertTo-PlainArray $Segments
  $labelChars = @($LabelText.ToCharArray())
  $digitText = $LabelText -replace ",", ""
  $digitChars = @($digitText.ToCharArray())
  $splitIndex = ($LabelText.Split(",")[0]).Length

  if ($segments.Count -eq $labelChars.Count) {
    return [pscustomobject]@{ chars = $labelChars; segments = $segments; reason = "exact" }
  }
  if ($segments.Count -eq $digitChars.Count) {
    return [pscustomobject]@{ chars = $digitChars; segments = $segments; reason = "exact-without-comma" }
  }

  $digitSegments = @(Select-DigitLikeSegments $Bitmap $segments)
  if ($digitSegments.Count -eq $digitChars.Count) {
    return [pscustomobject]@{ chars = $digitChars; segments = $digitSegments; reason = "filtered-extra-marks" }
  }

  $window = @(Select-BestSegmentWindow $Bitmap $digitSegments $digitChars $splitIndex)
  if ($window.Count -eq $digitChars.Count) {
    return [pscustomobject]@{ chars = $digitChars; segments = $window; reason = "trimmed-extra-marks" }
  }

  $window = @(Select-BestSegmentWindow $Bitmap $segments $labelChars $splitIndex)
  if ($window.Count -eq $labelChars.Count) {
    return [pscustomobject]@{ chars = $labelChars; segments = $window; reason = "trimmed-with-comma" }
  }

  return $null
}

function Get-NormalizedGlyphData($Bitmap, $Segment, [int]$TargetWidth = 16, [int]$TargetHeight = 24) {
  $chars = New-Object System.Text.StringBuilder
  for ($ty = 0; $ty -lt $TargetHeight; $ty++) {
    for ($tx = 0; $tx -lt $TargetWidth; $tx++) {
      $sourceX = [Math]::Min($Bitmap.Width - 1, [int]($Segment.x + (($tx + 0.5) * $Segment.width / $TargetWidth)))
      $sourceY = [Math]::Min($Bitmap.Height - 1, [int]($Segment.y + (($ty + 0.5) * $Segment.height / $TargetHeight)))
      if (Test-TemplateTextPixel $Bitmap.GetPixel($sourceX, $sourceY)) {
        [void]$chars.Append("1")
      } else {
        [void]$chars.Append("0")
      }
    }
  }
  return $chars.ToString()
}

function Get-GlyphSimilarity([string]$Left, [string]$Right) {
  if (-not $Left -or -not $Right -or $Left.Length -ne $Right.Length) { return 0 }
  $same = 0
  for ($index = 0; $index -lt $Left.Length; $index++) {
    if ($Left[$index] -eq $Right[$index]) { $same++ }
  }
  return $same / $Left.Length
}

function Read-TemplateStore {
  if (-not (Test-Path $TemplatePath)) {
    return [pscustomobject]@{ templates = @() }
  }
  try {
    $store = Get-Content -LiteralPath $TemplatePath -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not $store.templates) { return [pscustomobject]@{ templates = @() } }
    return $store
  } catch {
    return [pscustomobject]@{ templates = @() }
  }
}

function Save-TemplateStore($Store) {
  $Store | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $TemplatePath -Encoding UTF8
}

function Get-TemplateSummary {
  $store = Read-TemplateStore
  $templates = @($store.templates)
  $uniqueDigits = @($templates | Where-Object { $_.char -match "^\d$" } | Select-Object -ExpandProperty char -Unique | Sort-Object)
  return [pscustomobject]@{
    count = $templates.Count
    uniqueDigits = $uniqueDigits
    uniqueCount = $uniqueDigits.Count
  }
}

function Clear-TemplateStore {
  if (Test-Path $TemplatePath) {
    Remove-Item -LiteralPath $TemplatePath -Force
  }
}

function Normalize-TrainingText([string]$Text) {
  $value = ($Text -replace "\s", "")
  if ($value -notmatch "^\d{1,5},\d{3,5}$") { return "" }
  return $value
}

function Add-TemplatesFromImage($ImagePath, [string]$Text, $Region = $null) {
  $labelText = Normalize-TrainingText $Text
  Write-Host ("You typed: {0}" -f ($Text -replace "\s", ""))
  if (-not $labelText) {
    Write-Host "Input rejected. Use English comma and digits only, like 16058,3317."
    return $false
  }
  Write-Host ("Training label accepted: {0}" -f $labelText)

  $source = [System.Drawing.Bitmap]::FromFile((Resolve-Path $ImagePath))
  $work = $null
  try {
    if ($Region) {
      $cropRect = New-Object System.Drawing.Rectangle -ArgumentList $Region.x, $Region.y, $Region.width, $Region.height
      $work = $source.Clone($cropRect, $source.PixelFormat)
    } else {
      $work = New-Object System.Drawing.Bitmap -ArgumentList $source
    }

    $result = Get-GlyphSegments $work
    try {
      $alignment = Resolve-TrainingAlignment $result.bitmap $result.segments $labelText
      if (-not $alignment) {
        $fullCount = $labelText.ToCharArray().Length
        $digitCount = ($labelText -replace ",", "").ToCharArray().Length
        Write-Host ("Template training failed: found {0} glyphs, but the coordinate should have {1} chars or {2} digit chars without comma." -f $result.segments.Count, $fullCount, $digitCount)
        Write-Host "Select only the bright coordinate numbers. Avoid the mini-map arrow, frame, coast line, and icon pixels."
        return $false
      }
      $chars = ConvertTo-PlainArray $alignment.chars
      $segments = ConvertTo-PlainArray $alignment.segments
      if ($alignment.reason -ne "exact") {
        Write-Host ("Training alignment: {0}. Using {1} glyphs from {2} detected blocks." -f $alignment.reason, $segments.Count, $result.segments.Count)
      }

      $store = Read-TemplateStore
      $templates = New-Object System.Collections.Generic.List[object]
      foreach ($existing in @($store.templates)) {
        if ($existing) { $templates.Add($existing) }
      }

      for ($index = 0; $index -lt $chars.Length; $index++) {
        $templates.Add([pscustomobject]@{
          char = [string]$chars[$index]
          data = Get-NormalizedGlyphData $result.bitmap $segments[$index]
          trainedAt = (Get-Date).ToString("s")
        })
      }

      $limited = $templates |
        Group-Object char |
        ForEach-Object { $_.Group | Select-Object -Last 12 }

      Save-TemplateStore ([pscustomobject]@{
        version = 1
        width = 16
        height = 24
        templates = @($limited)
      })
      $uniqueChars = @($limited | Where-Object { $_.char -ne "," } | Select-Object -ExpandProperty char -Unique)
      Write-Host ("Saved {0} glyph templates from {1}. Unique digits trained: {2}/10." -f $chars.Length, $labelText, $uniqueChars.Count)
      Write-Host ("Trained digits: {0}" -f (($uniqueChars | Sort-Object) -join " "))
      Write-Host ("Template file: {0}" -f $TemplatePath)
      $readyDigits = @($limited | Where-Object { $_.char -match "^\d$" } | Group-Object char | Where-Object { $_.Count -ge 2 })
      if ($uniqueChars.Count -lt 10 -or $readyDigits.Count -lt 10) {
        Write-Host "Template matcher will stay conservative until every digit 0-9 has at least two examples."
      }
      return $true
    } finally {
      $result.bitmap.Dispose()
    }
  } finally {
    if ($work) { $work.Dispose() }
    $source.Dispose()
  }
}

function Read-GameCoordinateByTemplate($InputPath, $Region) {
  if (-not $script:UseTemplates) { return $null }
  $store = Read-TemplateStore
  $templates = @($store.templates)
  $readyDigits = @($templates | Where-Object { $_.char -match "^\d$" } | Group-Object char | Where-Object { $_.Count -ge 2 })
  if ($readyDigits.Count -lt 10) { return $null }

  $source = [System.Drawing.Bitmap]::FromFile((Resolve-Path $InputPath))
  $work = $null
  try {
    if ($Region) {
      $cropRect = New-Object System.Drawing.Rectangle -ArgumentList $Region.x, $Region.y, $Region.width, $Region.height
      $work = $source.Clone($cropRect, $source.PixelFormat)
    } else {
      $work = New-Object System.Drawing.Bitmap -ArgumentList $source
    }

    $result = Get-GlyphSegments $work
    try {
      $segments = ConvertTo-PlainArray $result.segments
      if ($segments.Count -gt 11) {
        $filteredSegments = @(Select-DigitLikeSegments $result.bitmap $segments)
        if ($filteredSegments.Count -ge 5 -and $filteredSegments.Count -le 10) {
          $segments = $filteredSegments
        }
      }
      if ($segments.Count -lt 5 -or $segments.Count -gt 11) { return $null }
      $recognized = New-Object System.Text.StringBuilder
      $totalScore = 0.0

      foreach ($segment in $segments) {
        $data = Get-NormalizedGlyphData $result.bitmap $segment
        $bestChar = ""
        $bestScore = 0.0
        foreach ($template in $templates) {
          $score = Get-GlyphSimilarity $data ([string]$template.data)
          if ($score -gt $bestScore) {
            $bestScore = $score
            $bestChar = [string]$template.char
          }
        }
        if ($bestScore -lt 0.72) { return $null }
        [void]$recognized.Append($bestChar)
        $totalScore += $bestScore
      }

      $raw = $recognized.ToString()
      $avgScore = $totalScore / [Math]::Max(1, $segments.Count)
      if ($raw -match "^(\d{1,5}),(\d{3,5})$") {
        $best = New-CoordinateCandidate ([int]$Matches[1]) ([int]$Matches[2]) $raw ($avgScore * 40) "template"
      } elseif ($raw -match "^\d{5,10}$") {
        $xLength = $raw.Length - 4
        if ($xLength -ge 1 -and $xLength -le 5) {
          $best = New-CoordinateCandidate ([int]$raw.Substring(0, $xLength)) ([int]$raw.Substring($xLength, 4)) $raw ($avgScore * 40) "template"
        } else {
          $best = $null
        }
      } else {
        $candidates = Get-CoordinateCandidatesFromText $raw "template"
        $best = Select-BestCoordinate $candidates
      }
      if (-not $best) { return $null }
      return [pscustomobject]@{
        gameX = $best.gameX
        gameY = $best.gameY
        raw = $raw
        score = [Math]::Round($avgScore * 40, 1)
        method = "template"
        votes = [Math]::Max(1, [int][Math]::Round($avgScore * 10))
      }
    } finally {
      $result.bitmap.Dispose()
    }
  } finally {
    if ($work) { $work.Dispose() }
    $source.Dispose()
  }
}

function Convert-ToOcrImage($InputPath, $OutputPath, $Region, $Mode = "color", $Scale = 10, $Threshold = 125, $Interpolation = "HighQualityBicubic") {
  $source = [System.Drawing.Bitmap]::FromFile((Resolve-Path $InputPath))
  try {
    if ($Region) {
      $cropRect = New-Object System.Drawing.Rectangle -ArgumentList $Region.x, $Region.y, $Region.width, $Region.height
      $work = $source.Clone($cropRect, $source.PixelFormat)
    } else {
      $work = New-Object System.Drawing.Bitmap -ArgumentList $source
    }

    try {
      $trimmed = Trim-BitmapToText $work
      $work.Dispose()
      $work = $trimmed
      $output = New-Object System.Drawing.Bitmap -ArgumentList ($work.Width * $Scale), ($work.Height * $Scale)
      try {
        if ($Mode -eq "binary") {
          for ($py = 0; $py -lt $work.Height; $py++) {
            for ($px = 0; $px -lt $work.Width; $px++) {
              $pixel = $work.GetPixel($px, $py)
              $brightness = ($pixel.R * 0.299) + ($pixel.G * 0.587) + ($pixel.B * 0.114)
              $maxChannel = [Math]::Max($pixel.R, [Math]::Max($pixel.G, $pixel.B))
              $minChannel = [Math]::Min($pixel.R, [Math]::Min($pixel.G, $pixel.B))
              $isText = $brightness -ge $Threshold -and ($maxChannel - $minChannel) -lt 75
              $color = if ($isText) { [System.Drawing.Color]::Black } else { [System.Drawing.Color]::White }
              for ($dy = 0; $dy -lt $Scale; $dy++) {
                for ($dx = 0; $dx -lt $Scale; $dx++) {
                  $output.SetPixel(($px * $Scale) + $dx, ($py * $Scale) + $dy, $color)
                }
              }
            }
          }
        } else {
          $graphics = [System.Drawing.Graphics]::FromImage($output)
          try {
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::$Interpolation
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
            $graphics.DrawImage($work, 0, 0, $output.Width, $output.Height)
          } finally {
            $graphics.Dispose()
          }
        }
        $output.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
      } finally {
        $output.Dispose()
      }
    } finally {
      $work.Dispose()
    }
  } finally {
    $source.Dispose()
  }
}

function Test-CoordinateTextVisible($InputPath, $Region) {
  $source = [System.Drawing.Bitmap]::FromFile((Resolve-Path $InputPath))
  $work = $null
  try {
    if ($Region) {
      $cropRect = New-Object System.Drawing.Rectangle -ArgumentList $Region.x, $Region.y, $Region.width, $Region.height
      $work = $source.Clone($cropRect, $source.PixelFormat)
    } else {
      $work = New-Object System.Drawing.Bitmap -ArgumentList $source
    }
    return $null -ne (Find-CoordinateTextBounds $work)
  } finally {
    if ($work) { $work.Dispose() }
    $source.Dispose()
  }
}

function New-CoordinateCandidate([int]$GameX, [int]$GameY, [string]$Raw, [double]$Score, [string]$Method) {
  if ($GameX -lt 0 -or $GameX -gt 16384 -or $GameY -lt 0 -or $GameY -gt 8192) { return $null }
  return [pscustomobject]@{
    gameX = $GameX
    gameY = $GameY
    raw = $Raw
    score = $Score
    method = $Method
  }
}

function Get-CoordinateCandidatesFromText([string]$Text, [string]$Method) {
  $candidates = New-Object System.Collections.Generic.List[object]
  $cleanText = ($Text -join "") -replace "\s", ""
  if ($cleanText -match "(?<!\d)(\d{1,5}),(\d{3,5})(?!\d)") {
    $candidate = New-CoordinateCandidate ([int]$Matches[1]) ([int]$Matches[2]) $cleanText 80 $Method
    if ($candidate) { $candidates.Add($candidate) }
  }
  if ($cleanText -match "(\d{1,5})\D+(\d{4,5})") {
    $gameXText = $Matches[1]
    $gameYText = $Matches[2]
    $score = if ($cleanText.Contains(",")) { 34 } else { 18 }
    $candidate = New-CoordinateCandidate ([int]$gameXText) ([int]$gameYText) $cleanText $score $Method
    if ($candidate) { $candidates.Add($candidate) }
  }
  $digits = $cleanText -replace "\D", ""
  if ($digits.Length -ge 8 -and $digits.Length -le 10) {
    $xLength = $digits.Length - 5
    if ($xLength -ge 3 -and $xLength -le 5) {
      $separatorGuess = $digits.Substring($xLength, 1)
      $gameXText = $digits.Substring(0, $xLength)
      $gameYText = $digits.Substring($digits.Length - 4, 4)
      $score = 14
      if ($separatorGuess -in @("0", "3", "5", "6", "8", "9")) { $score = 20 }
      $candidate = New-CoordinateCandidate ([int]$gameXText) ([int]$gameYText) $cleanText $score $Method
      if ($candidate) { $candidates.Add($candidate) }
    }
  }
  if ($digits.Length -eq 9) {
    $candidate = New-CoordinateCandidate ([int]$digits.Substring(0, 5)) ([int]$digits.Substring(5, 4)) $cleanText 26 $Method
    if ($candidate) { $candidates.Add($candidate) }
  }
  foreach ($split in 5, 4) {
    if ($digits.Length -le $split) { continue }
    $gameXText = $digits.Substring(0, $split)
    $tail = $digits.Substring($split)
    for ($drop = 0; $drop -le [Math]::Min(2, $tail.Length - 1); $drop++) {
      $gameYText = $tail.Substring($drop)
      if ($gameYText.Length -lt 4 -or $gameYText.Length -gt 5) { continue }
      $score = 12 - ($drop * 2)
      if ($split -eq 5) { $score += 3 }
      if ($gameYText.Length -eq 4) { $score += 2 }
      $candidate = New-CoordinateCandidate ([int]$gameXText) ([int]$gameYText) $cleanText $score $Method
      if ($candidate) { $candidates.Add($candidate) }
    }
  }
  return $candidates
}

function Select-BestCoordinate($Candidates) {
  if (-not $Candidates -or $Candidates.Count -eq 0) { return $null }
  $grouped = @{}
  foreach ($candidate in $Candidates) {
    $key = "{0},{1}" -f $candidate.gameX, $candidate.gameY
    if (-not $grouped.ContainsKey($key)) {
      $grouped[$key] = [pscustomobject]@{
        gameX = $candidate.gameX
        gameY = $candidate.gameY
        raw = $candidate.raw
        score = 0.0
        count = 0
        methods = New-Object System.Collections.Generic.List[string]
      }
    }
    $grouped[$key].score += [double]$candidate.score
    if ($candidate.method -match "binary") { $grouped[$key].score += 8 }
    $grouped[$key].count += 1
    $grouped[$key].methods.Add($candidate.method)
    if ($script:LastCoordinate) {
      $distance = [Math]::Abs($candidate.gameX - $script:LastCoordinate.gameX) + [Math]::Abs($candidate.gameY - $script:LastCoordinate.gameY)
      if ($distance -le 8) {
        $grouped[$key].score += 18
      } elseif ($distance -le 35) {
        $grouped[$key].score += 10
      } elseif ($distance -gt 500) {
        $grouped[$key].score -= 10
      }
    }
  }

  $best = $grouped.Values | Sort-Object @{ Expression = "score"; Descending = $true }, @{ Expression = "count"; Descending = $true } | Select-Object -First 1
  if (-not $best) { return $null }
  return [pscustomobject]@{
    gameX = $best.gameX
    gameY = $best.gameY
    raw = $best.raw
    score = [Math]::Round($best.score, 1)
    method = ($best.methods | Select-Object -First 1)
    votes = $best.count
  }
}

function Invoke-TesseractText($TesseractPath, $ImagePath, [int]$PageSegMode, [bool]$Whitelist) {
  $args = @($ImagePath, "stdout", "--psm", [string]$PageSegMode)
  if ($Whitelist) {
    $args += @("-c", "tessedit_char_whitelist=0123456789,")
  }
  try {
    $text = & $TesseractPath @args 2>$null
    if ($LASTEXITCODE -ne 0) { return "" }
    return $text
  } catch {
    return ""
  }
}

function Read-GameCoordinate($TesseractPath, $InputPath, $Region) {
  if (-not (Test-CoordinateTextVisible $InputPath $Region)) {
    return $null
  }

  $templateCoordinate = Read-GameCoordinateByTemplate $InputPath $Region
  if ($templateCoordinate -and [int]$templateCoordinate.votes -ge 7) {
    return $templateCoordinate
  }

  $variants = @(
    @{ name = "binary145"; mode = "binary"; scale = 12; threshold = 145; interpolation = "NearestNeighbor" },
    @{ name = "bicubic"; mode = "color"; scale = 10; threshold = 0; interpolation = "HighQualityBicubic" }
  )
  $fallbackVariants = @(
    @{ name = "binary125"; mode = "binary"; scale = 12; threshold = 125; interpolation = "NearestNeighbor" },
    @{ name = "nearest"; mode = "color"; scale = 12; threshold = 0; interpolation = "NearestNeighbor" }
  )
  $pageSegModes = @(6)
  $candidates = New-Object System.Collections.Generic.List[object]

  $variantSets = @(
    [pscustomobject]@{ variants = $variants; fast = $true; whitelists = @($true) },
    [pscustomobject]@{ variants = $variants; fast = $false; whitelists = @($false) },
    [pscustomobject]@{ variants = $fallbackVariants; fast = $false; whitelists = @($true, $false) }
  )

  foreach ($variantSet in $variantSets) {
  foreach ($variant in $variantSet.variants) {
    $variantPath = Join-Path $DataDir ("ocr-{0}.png" -f $variant.name)
    Convert-ToOcrImage $InputPath $variantPath $Region $variant.mode $variant.scale $variant.threshold $variant.interpolation
    Copy-Item -LiteralPath $variantPath -Destination $OcrImagePath -Force
    foreach ($psm in $pageSegModes) {
      foreach ($whitelist in $variantSet.whitelists) {
        $text = Invoke-TesseractText $TesseractPath $variantPath $psm $whitelist
        $method = "{0}/psm{1}/{2}" -f $variant.name, $psm, $(if ($whitelist) { "digits" } else { "plain" })
        if ($env:OCR_DEBUG -and $text) {
          Write-Host ("DEBUG text {0}: {1}" -f $method, (($text -join " ") -replace "\s+", " ").Trim())
        }
        $found = Get-CoordinateCandidatesFromText $text $method
        if ($env:OCR_DEBUG -and $found -and $found.Count -gt 0) {
          foreach ($candidate in $found) {
            Write-Host ("DEBUG candidate {0},{1} score={2} method={3} raw={4}" -f $candidate.gameX, $candidate.gameY, $candidate.score, $candidate.method, $candidate.raw)
          }
        }
        foreach ($candidate in $found) { $candidates.Add($candidate) }
      }
    }
  }
    $best = Select-BestCoordinate $candidates
    if ($best -and $variantSet.fast) {
      if ($env:OCR_DEBUG) {
        Write-Host ("DEBUG best {0},{1} votes={2} score={3} raw={4}" -f $best.gameX, $best.gameY, $best.votes, $best.score, $best.raw)
      }
      return $best
    }
  }

  $best = Select-BestCoordinate $candidates
  if ($env:OCR_DEBUG -and $best) {
    Write-Host ("DEBUG best {0},{1} votes={2} score={3} raw={4}" -f $best.gameX, $best.gameY, $best.votes, $best.score, $best.raw)
  }
  return $best
}

function Send-Position($Coordinate) {
  if ($NoPost) { return }
  $body = @{
    gameX = $Coordinate.gameX
    gameY = $Coordinate.gameY
    label = "当前船位"
    source = "ocr"
  } | ConvertTo-Json -Compress

  Invoke-RestMethod -Uri "$ServerUrl/api/position" -Method Post -ContentType "application/json; charset=utf-8" -Body $body | Out-Null
}

function Get-CoordinateDistance($Left, $Right) {
  if (-not $Left -or -not $Right) { return [double]::PositiveInfinity }
  $dx = [Math]::Abs([int]$Left.gameX - [int]$Right.gameX)
  $dx = [Math]::Min($dx, 16384 - $dx)
  $dy = [Math]::Abs([int]$Left.gameY - [int]$Right.gameY)
  return $dx + $dy
}

function New-StabilityResult([bool]$Accepted, [string]$Reason) {
  return [pscustomobject]@{
    accepted = $Accepted
    reason = $Reason
  }
}

function Test-StableCoordinate($Coordinate) {
  if ($NoStable -or $ImagePath -or $Once) {
    return New-StabilityResult $true "stable-off"
  }

  if (-not $script:LastSentCoordinate) {
    $firstTolerance = if ([int]$Coordinate.votes -ge 4) { 45 } else { 25 }
    if ($script:PendingCoordinate -and (Get-CoordinateDistance $Coordinate $script:PendingCoordinate) -le $firstTolerance) {
      $script:PendingCount += 1
    } else {
      $script:PendingCoordinate = $Coordinate
      $script:PendingCount = 1
    }

    if ($script:PendingCount -ge 2) {
      $script:PendingCoordinate = $null
      $script:PendingCount = 0
      $script:RejectedJumpCount = 0
      return New-StabilityResult $true "first-repeat"
    }
    return New-StabilityResult $false "waiting-first-repeat"
  }

  $distanceFromSent = Get-CoordinateDistance $Coordinate $script:LastSentCoordinate
  if ($distanceFromSent -le 80) {
    $script:PendingCoordinate = $null
    $script:PendingCount = 0
    $script:RejectedJumpCount = 0
    return New-StabilityResult $true ("near-last:{0}" -f $distanceFromSent)
  }

  if ($distanceFromSent -le 250 -and [int]$Coordinate.votes -ge 4) {
    $script:PendingCoordinate = $null
    $script:PendingCount = 0
    $script:RejectedJumpCount = 0
    return New-StabilityResult $true ("trusted-move:{0}" -f $distanceFromSent)
  }

  $script:RejectedJumpCount += 1
  $pendingTolerance = if ([int]$Coordinate.votes -ge 4) { 70 } else { 35 }
  if ($script:PendingCoordinate -and (Get-CoordinateDistance $Coordinate $script:PendingCoordinate) -le $pendingTolerance) {
    $script:PendingCount += 1
  } else {
    $script:PendingCoordinate = $Coordinate
    $script:PendingCount = 1
  }

  if ($script:PendingCount -ge 3 -and [int]$Coordinate.votes -ge 2) {
    $script:PendingCoordinate = $null
    $script:PendingCount = 0
    $script:RejectedJumpCount = 0
    return New-StabilityResult $true ("repeat-jump:{0}" -f $distanceFromSent)
  }

  if ($script:RejectedJumpCount -ge 8) {
    $script:LastSentCoordinate = $null
    $script:PendingCoordinate = $Coordinate
    $script:PendingCount = 1
    $script:RejectedJumpCount = 0
    return New-StabilityResult $false ("reset-after-jumps:{0}" -f $distanceFromSent)
  }

  return New-StabilityResult $false ("held-jump:{0},try={1}" -f $distanceFromSent, $script:RejectedJumpCount)
}

function Reset-TrackingState {
  $script:LastCoordinate = $null
  $script:LastSentCoordinate = $null
  $script:PendingCoordinate = $null
  $script:PendingCount = 0
  $script:RejectedJumpCount = 0
  $script:MissingCoordinateCount = 0
  $script:WasCoordinateHidden = $false
}

function Clear-PendingCoordinateState {
  $script:PendingCoordinate = $null
  $script:PendingCount = 0
  $script:RejectedJumpCount = 0
}

function Reset-MissingCoordinateState {
  if ($script:WasCoordinateHidden) {
    Write-Host ("{0:HH:mm:ss}  RESUME coordinate text is visible again." -f (Get-Date))
  }
  $script:MissingCoordinateCount = 0
  $script:WasCoordinateHidden = $false
}

function Invoke-MissingCoordinateState {
  $script:MissingCoordinateCount += 1

  if ($script:MissingCoordinateCount -eq 1) {
    Write-Host ("{0:HH:mm:ss}  WAIT  coordinate text is not visible. If you are in port, this is normal." -f (Get-Date))
    return
  }

  if ($script:MissingCoordinateCount -eq 3) {
    $script:WasCoordinateHidden = $true
    Clear-PendingCoordinateState
    Write-Host ("{0:HH:mm:ss}  PAUSE coordinate hidden. Keeping the last map position; OCR will resume automatically." -f (Get-Date))
  }
}

function Get-ConsoleHotkey {
  if ($ImagePath -or $Once) { return "" }
  try {
    while ([Console]::KeyAvailable) {
      $key = [Console]::ReadKey($true)
      if ($key.Key -eq [ConsoleKey]::R) { return "rechoose" }
      if ($key.Key -eq [ConsoleKey]::C) { return "clear" }
      if ($key.Key -eq [ConsoleKey]::T) { return "train" }
      if ($key.Key -eq [ConsoleKey]::X) { return "clearTemplates" }
      if ($key.Key -eq [ConsoleKey]::V) { return "toggleTemplates" }
    }
  } catch {
    return ""
  }
  return ""
}

function Invoke-RechooseRegion {
  Write-Host ""
  Write-Host "Re-selecting OCR area..."
  $newRegion = Calibrate-Region
  Reset-TrackingState
  Write-Host "New OCR area is active."
  Write-Host ""
  return $newRegion
}

function Invoke-ClearTrackingState {
  Reset-TrackingState
  Write-Host ("{0:HH:mm:ss}  RESET stable coordinate state. Waiting for repeated OCR readings." -f (Get-Date))
}

function Invoke-TrainTemplates($Region) {
  Write-Host ""
  Write-Host "Template training: keep the coordinate visible in the selected area."
  Capture-Region $Region $PreviewPath
  Show-RegionPreview $PreviewPath $Region | Out-Null
  $text = Read-Host "Type the exact coordinate shown, for example 16058,3317"
  if (Add-TemplatesFromImage $PreviewPath $text) {
    Reset-TrackingState
    Write-Host "Template training saved. Templates stay off by default; press V if you want to test them."
  } else {
    Write-Host "Template training was not saved."
  }
  Write-Host ""
}

function Invoke-ClearTemplates {
  Clear-TemplateStore
  Reset-TrackingState
  Write-Host ("{0:HH:mm:ss}  CLEARED digit templates. OCR will use Tesseract fallback until you train again." -f (Get-Date))
}

function Invoke-ToggleTemplates {
  $script:UseTemplates = -not $script:UseTemplates
  Reset-TrackingState
  if ($script:UseTemplates) {
    Write-Host ("{0:HH:mm:ss}  TEMPLATE recognition is ON." -f (Get-Date))
  } else {
    Write-Host ("{0:HH:mm:ss}  TEMPLATE recognition is OFF. Using OCR only." -f (Get-Date))
  }
}

if ($ClearTemplatesOnly) {
  Clear-TemplateStore
  Write-Host "Removed OCR digit templates."
  return
}

if ($ResetTemplates -and (Test-Path $TemplatePath)) {
  Clear-TemplateStore
  Write-Host "Removed OCR digit templates."
}

$tesseract = Find-Tesseract
Ensure-LocalServer
$region = Get-ConfiguredRegion

if ($TrainText) {
  $trainImage = if ($ImagePath) { $ImagePath } else {
    Capture-Region $region $PreviewPath
    $PreviewPath
  }
  Add-TemplatesFromImage $trainImage $TrainText $null | Out-Null
  if ($ImagePath -or $Once) { return }
}

Write-Host ""
Write-Host "OCR is running. Open $ServerUrl to see the ship marker."
if ($NoStable) {
  Write-Host "Stable mode is off. Every recognized coordinate will be sent."
} else {
  Write-Host "Stable mode is on. WAIT means a suspicious one-frame reading was not sent."
}
Write-Host "When you enter a port and coordinates disappear, OCR will pause quietly and resume after departure."
Write-Host "Template recognition is off by default because raw OCR is more stable for small coordinates."
Write-Host "Press R to re-select the OCR area. Press C to clear the stable coordinate state."
Write-Host "Press T to train digit templates. Press X to clear digit templates. Press V to toggle templates."
Write-Host "Close this window, or press Ctrl+C, to stop."
Write-Host ""

do {
  try {
    $hotkey = Get-ConsoleHotkey
    if ($hotkey -eq "rechoose") {
      $region = Invoke-RechooseRegion
      continue
    } elseif ($hotkey -eq "clear") {
      Invoke-ClearTrackingState
    } elseif ($hotkey -eq "train") {
      Invoke-TrainTemplates $region
      continue
    } elseif ($hotkey -eq "clearTemplates") {
      Invoke-ClearTemplates
    } elseif ($hotkey -eq "toggleTemplates") {
      Invoke-ToggleTemplates
    }

    if ($ImagePath) {
      $inputPath = $ImagePath
    } else {
      Capture-Region $region $CapturePath
      $inputPath = $CapturePath
    }

    $ocrRegion = if ($ImagePath) { $region } else { $null }
    $coordinate = Read-GameCoordinate $tesseract $inputPath $ocrRegion
    if ($coordinate) {
      Reset-MissingCoordinateState
      $script:LastCoordinate = $coordinate
      $stability = Test-StableCoordinate $coordinate
      if ($stability.accepted) {
        $script:LastSentCoordinate = $coordinate
        Send-Position $coordinate
        Write-Host ("{0:HH:mm:ss}  OK    {1},{2}  votes={3}  {4}  raw={5}" -f (Get-Date), $coordinate.gameX, $coordinate.gameY, $coordinate.votes, $stability.reason, $coordinate.raw)
      } else {
        Write-Host ("{0:HH:mm:ss}  WAIT  {1},{2}  votes={3}  {4}  raw={5}" -f (Get-Date), $coordinate.gameX, $coordinate.gameY, $coordinate.votes, $stability.reason, $coordinate.raw)
      }
    } else {
      Invoke-MissingCoordinateState
    }
  } catch {
    Write-Host ("{0:HH:mm:ss}  Error: {1}" -f (Get-Date), $_.Exception.Message)
    if ($env:OCR_DEBUG) {
      Write-Host $_.ScriptStackTrace
    }
  }

  if ($Once -or $ImagePath) { break }
  Start-Sleep -Seconds $IntervalSeconds
  $hotkey = Get-ConsoleHotkey
  if ($hotkey -eq "rechoose") {
    $region = Invoke-RechooseRegion
  } elseif ($hotkey -eq "clear") {
    Invoke-ClearTrackingState
  } elseif ($hotkey -eq "train") {
    Invoke-TrainTemplates $region
  } elseif ($hotkey -eq "clearTemplates") {
    Invoke-ClearTemplates
  } elseif ($hotkey -eq "toggleTemplates") {
    Invoke-ToggleTemplates
  }
} while ($true)
