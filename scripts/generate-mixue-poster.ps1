param(
  [string]$OutPath = "D:\Documents\New project\output\imagegen\mixue_promo_poster.png"
)

Add-Type -AssemblyName System.Drawing

$W = 1600
$H = 2400
$FontName = "Microsoft YaHei UI"

function T([int[]]$Codes) {
  return -join ($Codes | ForEach-Object { [char]$_ })
}

function C([string]$Hex, [int]$Alpha = 255) {
  $base = [System.Drawing.ColorTranslator]::FromHtml($Hex)
  return [System.Drawing.Color]::FromArgb($Alpha, $base.R, $base.G, $base.B)
}

function Solid([string]$Hex, [int]$Alpha = 255) {
  return [System.Drawing.SolidBrush]::new((C $Hex $Alpha))
}

function PenOf([string]$Hex, [float]$Width, [int]$Alpha = 255) {
  $p = [System.Drawing.Pen]::new((C $Hex $Alpha), $Width)
  $p.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $p.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $p.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  return $p
}

function FontPx([float]$Size, [System.Drawing.FontStyle]$Style = [System.Drawing.FontStyle]::Regular) {
  return [System.Drawing.Font]::new($script:FontName, $Size, $Style, [System.Drawing.GraphicsUnit]::Pixel)
}

function RoundedPath([float]$X, [float]$Y, [float]$Wd, [float]$Ht, [float]$R) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $d = $R * 2
  $path.AddArc($X, $Y, $d, $d, 180, 90)
  $path.AddArc($X + $Wd - $d, $Y, $d, $d, 270, 90)
  $path.AddArc($X + $Wd - $d, $Y + $Ht - $d, $d, $d, 0, 90)
  $path.AddArc($X, $Y + $Ht - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function FillRounded([float]$X, [float]$Y, [float]$Wd, [float]$Ht, [float]$R, [System.Drawing.Brush]$Brush) {
  $path = RoundedPath $X $Y $Wd $Ht $R
  $script:g.FillPath($Brush, $path)
  $path.Dispose()
}

function DrawCenteredText(
  [string]$Text,
  [System.Drawing.Font]$Font,
  [float]$Y,
  [float]$Height,
  [string]$FillHex,
  [string]$ShadowHex = "",
  [float]$ShadowX = 0,
  [float]$ShadowY = 0
) {
  $fmt = [System.Drawing.StringFormat]::new()
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  if ($ShadowHex -ne "") {
    $shadow = Solid $ShadowHex 130
    $shadowRect = [System.Drawing.RectangleF]::new($ShadowX, $Y + $ShadowY, $script:W, $Height)
    $script:g.DrawString($Text, $Font, $shadow, $shadowRect, $fmt)
    $shadow.Dispose()
  }
  $brush = Solid $FillHex
  $rect = [System.Drawing.RectangleF]::new(0, $Y, $script:W, $Height)
  $script:g.DrawString($Text, $Font, $brush, $rect, $fmt)
  $brush.Dispose()
  $fmt.Dispose()
}

function DrawSnowflake([float]$Cx, [float]$Cy, [float]$R, [int]$Alpha = 120) {
  $pen = PenOf "#ffffff" 3 $Alpha
  for ($i = 0; $i -lt 6; $i++) {
    $a = ($i * 60) * [Math]::PI / 180
    $x1 = $Cx + [Math]::Cos($a) * ($R * 0.25)
    $y1 = $Cy + [Math]::Sin($a) * ($R * 0.25)
    $x2 = $Cx + [Math]::Cos($a) * $R
    $y2 = $Cy + [Math]::Sin($a) * $R
    $script:g.DrawLine($pen, [float]$x1, [float]$y1, [float]$x2, [float]$y2)
  }
  $pen.Dispose()
}

function DrawLemonSlice([float]$X, [float]$Y, [float]$R) {
  $yellow = Solid "#ffd73f"
  $light = Solid "#fff7a8"
  $outline = PenOf "#ffffff" 5 240
  $script:g.FillEllipse($yellow, $X - $R, $Y - $R, $R * 2, $R * 2)
  $script:g.DrawEllipse($outline, $X - $R, $Y - $R, $R * 2, $R * 2)
  for ($i = 0; $i -lt 8; $i++) {
    $a = $i * 45 * [Math]::PI / 180
    $script:g.DrawLine((PenOf "#fff7a8" 3 220), $X, $Y, [float]($X + [Math]::Cos($a) * $R * 0.78), [float]($Y + [Math]::Sin($a) * $R * 0.78))
  }
  $script:g.FillEllipse($light, $X - $R * 0.24, $Y - $R * 0.24, $R * 0.48, $R * 0.48)
  $yellow.Dispose()
  $light.Dispose()
  $outline.Dispose()
}

function DrawCup([float]$X, [float]$Y, [float]$Scale) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $pts = @(
    [System.Drawing.PointF]::new($X + 38*$Scale, $Y + 95*$Scale),
    [System.Drawing.PointF]::new($X + 260*$Scale, $Y + 95*$Scale),
    [System.Drawing.PointF]::new($X + 228*$Scale, $Y + 430*$Scale),
    [System.Drawing.PointF]::new($X + 68*$Scale, $Y + 430*$Scale)
  )
  $path.AddPolygon($pts)
  $script:g.FillPath((Solid "#fff9ef"), $path)
  $script:g.DrawPath((PenOf "#d31425" 8), $path)
  FillRounded ($X + 28*$Scale) ($Y + 60*$Scale) (245*$Scale) (70*$Scale) (30*$Scale) (Solid "#ffffff")
  $script:g.FillRectangle((Solid "#d31425"), $X + 62*$Scale, $Y + 240*$Scale, 174*$Scale, 72*$Scale)
  $script:g.DrawLine((PenOf "#ffffff" 16), $X + 185*$Scale, $Y + 60*$Scale, $X + 245*$Scale, $Y - 70*$Scale)
  $script:g.DrawLine((PenOf "#d31425" 8), $X + 185*$Scale, $Y + 60*$Scale, $X + 245*$Scale, $Y - 70*$Scale)
  DrawLemonSlice ($X + 115*$Scale) ($Y + 190*$Scale) (38*$Scale)
  DrawLemonSlice ($X + 190*$Scale) ($Y + 350*$Scale) (30*$Scale)
  $font = FontPx (36*$Scale) ([System.Drawing.FontStyle]::Bold)
  $fmt = [System.Drawing.StringFormat]::new()
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $script:g.DrawString("MIXUE", $font, (Solid "#ffffff"), [System.Drawing.RectangleF]::new($X + 62*$Scale, $Y + 240*$Scale, 174*$Scale, 72*$Scale), $fmt)
  $fmt.Dispose()
  $font.Dispose()
  $path.Dispose()
}

function DrawIceCream([float]$X, [float]$Y, [float]$Scale) {
  $cone = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $cone.AddPolygon(@(
    [System.Drawing.PointF]::new($X + 65*$Scale, $Y + 225*$Scale),
    [System.Drawing.PointF]::new($X + 245*$Scale, $Y + 225*$Scale),
    [System.Drawing.PointF]::new($X + 155*$Scale, $Y + 500*$Scale)
  ))
  $script:g.FillPath((Solid "#f4b25e"), $cone)
  $script:g.DrawPath((PenOf "#cc7b2c" 6), $cone)
  for ($i=0; $i -lt 5; $i++) {
    $script:g.DrawLine((PenOf "#d98c3b" 3 150), $X + (76 + $i*36)*$Scale, $Y + 230*$Scale, $X + (126 + $i*18)*$Scale, $Y + 445*$Scale)
    $script:g.DrawLine((PenOf "#d98c3b" 3 150), $X + (235 - $i*36)*$Scale, $Y + 230*$Scale, $X + (185 - $i*18)*$Scale, $Y + 445*$Scale)
  }
  $white = Solid "#ffffff"
  $edge = PenOf "#d31425" 7 230
  $script:g.FillEllipse($white, $X + 55*$Scale, $Y + 92*$Scale, 205*$Scale, 150*$Scale)
  $script:g.FillEllipse($white, $X + 82*$Scale, $Y + 35*$Scale, 150*$Scale, 138*$Scale)
  $script:g.FillEllipse($white, $X + 112*$Scale, $Y - 24*$Scale, 94*$Scale, 96*$Scale)
  $script:g.DrawArc($edge, $X + 55*$Scale, $Y + 92*$Scale, 205*$Scale, 150*$Scale, 178, 185)
  $script:g.DrawArc($edge, $X + 82*$Scale, $Y + 35*$Scale, 150*$Scale, 138*$Scale, 190, 175)
  $script:g.DrawArc($edge, $X + 112*$Scale, $Y - 24*$Scale, 94*$Scale, 96*$Scale, 195, 170)
  $white.Dispose()
  $edge.Dispose()
  $cone.Dispose()
}

function DrawMascot() {
  $cape = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $cape.AddBezier(575, 770, 430, 1050, 450, 1335, 590, 1510)
  $cape.AddBezier(590, 1510, 815, 1610, 1045, 1510, 1055, 1260)
  $cape.AddBezier(1055, 1260, 1030, 1000, 980, 820, 885, 770)
  $cape.CloseFigure()
  $script:g.FillPath((Solid "#b80f1b"), $cape)
  $script:g.DrawPath((PenOf "#ffffff" 10 220), $cape)

  $shadow = Solid "#d7f4ff" 150
  $white = Solid "#ffffff"
  $line = PenOf "#d31425" 9
  $script:g.FillEllipse($shadow, 580, 915, 475, 555)
  $script:g.FillEllipse($white, 550, 885, 500, 560)
  $script:g.DrawEllipse($line, 550, 885, 500, 560)
  $script:g.FillEllipse($white, 610, 600, 380, 360)
  $script:g.DrawEllipse($line, 610, 600, 380, 360)

  $crown = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $crown.AddPolygon(@(
    [System.Drawing.PointF]::new(690, 598),
    [System.Drawing.PointF]::new(728, 500),
    [System.Drawing.PointF]::new(780, 588),
    [System.Drawing.PointF]::new(830, 482),
    [System.Drawing.PointF]::new(875, 588),
    [System.Drawing.PointF]::new(928, 505),
    [System.Drawing.PointF]::new(950, 608)
  ))
  $script:g.FillPath((Solid "#ffd33d"), $crown)
  $script:g.DrawPath((PenOf "#d31425" 8), $crown)
  $script:g.FillEllipse((Solid "#d31425"), 814, 540, 34, 34)

  $script:g.FillEllipse((Solid "#20242b"), 715, 755, 30, 44)
  $script:g.FillEllipse((Solid "#20242b"), 855, 755, 30, 44)
  $script:g.DrawArc((PenOf "#20242b" 10), 748, 792, 110, 78, 15, 150)
  $script:g.FillEllipse((Solid "#ff8a9a" 170), 665, 812, 58, 34)
  $script:g.FillEllipse((Solid "#ff8a9a" 170), 880, 812, 58, 34)

  $script:g.DrawLine((PenOf "#d31425" 22), 575, 1032, 392, 1190)
  $script:g.DrawLine((PenOf "#d31425" 22), 1030, 1030, 1195, 1170)
  $script:g.FillEllipse((Solid "#d31425"), 350, 1160, 80, 68)
  $script:g.FillEllipse((Solid "#d31425"), 1160, 1138, 82, 68)

  $scarf = RoundedPath 633 896 335 74 36
  $script:g.FillPath((Solid "#d31425"), $scarf)
  $script:g.DrawPath((PenOf "#ffffff" 5 160), $scarf)
  $tail = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $tail.AddPolygon(@(
    [System.Drawing.PointF]::new(875, 944),
    [System.Drawing.PointF]::new(1025, 1018),
    [System.Drawing.PointF]::new(918, 1062)
  ))
  $script:g.FillPath((Solid "#d31425"), $tail)
  $script:g.DrawPath((PenOf "#ffffff" 5 160), $tail)

  $font = FontPx 58 ([System.Drawing.FontStyle]::Bold)
  $fmt = [System.Drawing.StringFormat]::new()
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $script:g.DrawString("MX", $font, (Solid "#d31425"), [System.Drawing.RectangleF]::new(695, 1110, 210, 95), $fmt)
  $fmt.Dispose()
  $font.Dispose()

  $cape.Dispose()
  $crown.Dispose()
  $scarf.Dispose()
  $tail.Dispose()
  $shadow.Dispose()
  $white.Dispose()
  $line.Dispose()
}

$brand = T @(0x871c,0x96ea,0x51b0,0x57ce)
$season = T @(0x751c,0x871c,0x51b0,0x996e,0x5b63)
$cool = T @(0x6e05,0x51c9,0x52a0,0x500d)
$products = T @(0x51b0,0x6dc7,0x6dcb,0x0020,0x00b7,0x0020,0x67e0,0x6aac,0x8336,0x0020,0x00b7,0x0020,0x9c9c,0x679c,0x996e)
$cupLine = T @(0x751c,0x871c,0x5c31,0x5728,0x8fd9,0x4e00,0x676f)
$fresh = T @(0x4eca,0x65e5,0x5c1d,0x9c9c)
$concept = T @(0x6982,0x5ff5,0x5ba3,0x4f20,0x7a3f)

$bitmap = [System.Drawing.Bitmap]::new($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bitmap)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$bgRect = [System.Drawing.Rectangle]::new(0, 0, $W, $H)
$bg = [System.Drawing.Drawing2D.LinearGradientBrush]::new($bgRect, (C "#b90c19"), (C "#f33b43"), 90)
$g.FillRectangle($bg, $bgRect)

$rand = [System.Random]::new(20260506)
for ($i = 0; $i -lt 74; $i++) {
  $x = $rand.Next(60, $W - 60)
  $y = $rand.Next(80, $H - 110)
  $r = $rand.Next(12, 46)
  if ($i % 4 -eq 0) {
    DrawSnowflake $x $y $r ($rand.Next(45, 115))
  } else {
    $g.FillEllipse((Solid "#ffffff" ($rand.Next(22, 70))), $x, $y, $r, $r)
  }
}

$aqua = [System.Drawing.Drawing2D.GraphicsPath]::new()
$aqua.AddBezier(-170, 480, 185, 350, 300, 790, -55, 915)
$aqua.AddBezier(-55, 915, -265, 735, -360, 600, -170, 480)
$aqua.CloseFigure()
$g.FillPath((Solid "#73e7ef" 230), $aqua)

$lemonBlob = [System.Drawing.Drawing2D.GraphicsPath]::new()
$lemonBlob.AddBezier(1290, 170, 1690, 325, 1545, 840, 1235, 700)
$lemonBlob.AddBezier(1235, 700, 1030, 570, 1045, 260, 1290, 170)
$lemonBlob.CloseFigure()
$g.FillPath((Solid "#ffd945" 235), $lemonBlob)

$wave = [System.Drawing.Drawing2D.GraphicsPath]::new()
$wave.StartFigure()
$wave.AddBezier(-50, 1640, 245, 1495, 500, 1580, 720, 1665)
$wave.AddBezier(720, 1665, 970, 1760, 1220, 1650, 1660, 1515)
$wave.AddLine(1660, 2400, -50, 2400)
$wave.CloseFigure()
$g.FillPath((Solid "#fff7ec"), $wave)

$inner = RoundedPath 52 52 1496 2296 46
$g.DrawPath((PenOf "#ffffff" 18 245), $inner)
$g.DrawPath((PenOf "#ffd33d" 4 210), $inner)

$topFont = FontPx 34 ([System.Drawing.FontStyle]::Bold)
DrawCenteredText "MIXUE  SWEET ICE SEASON" $topFont 78 58 "#fff9ef" "" 0 0

$titleFont = FontPx 210 ([System.Drawing.FontStyle]::Bold)
DrawCenteredText $brand $titleFont 138 260 "#ffffff" "#6b0610" 8 12

$banner = RoundedPath 294 410 1012 154 76
$g.FillPath((Solid "#fff9ef"), $banner)
$g.DrawPath((PenOf "#ffd33d" 7), $banner)
$seasonFont = FontPx 102 ([System.Drawing.FontStyle]::Bold)
DrawCenteredText $season $seasonFont 423 122 "#d31425" "" 0 0

DrawMascot
DrawCup 258 1060 1.18
DrawIceCream 1024 1015 1.13

$freshFont = FontPx 44 ([System.Drawing.FontStyle]::Bold)
$freshTag = RoundedPath 666 1576 268 72 36
$g.FillPath((Solid "#fff9ef"), $freshTag)
$g.DrawPath((PenOf "#ffd33d" 5), $freshTag)
DrawCenteredText $fresh $freshFont 1583 58 "#d31425" "" 0 0

$badgeShadow = RoundedPath 455 1672 690 238 82
$g.FillPath((Solid "#72100f" 55), $badgeShadow)
$badge = RoundedPath 430 1645 720 238 82
$g.FillPath((Solid "#d31425"), $badge)
$g.DrawPath((PenOf "#ffffff" 8), $badge)
$coolFont = FontPx 126 ([System.Drawing.FontStyle]::Bold)
DrawCenteredText $cool $coolFont 1682 126 "#ffffff" "#7a0810" 4 8

$productFont = FontPx 56 ([System.Drawing.FontStyle]::Regular)
DrawCenteredText $products $productFont 1940 82 "#b90c19" "" 0 0

$cupFont = FontPx 76 ([System.Drawing.FontStyle]::Bold)
DrawCenteredText $cupLine $cupFont 2058 98 "#d31425" "" 0 0

$smallFont = FontPx 31 ([System.Drawing.FontStyle]::Regular)
DrawCenteredText ($concept + "  /  VISUAL CONCEPT") $smallFont 2254 54 "#b90c19" "" 0 0

$markFont = FontPx 42 ([System.Drawing.FontStyle]::Bold)
$fmt = [System.Drawing.StringFormat]::new()
$fmt.Alignment = [System.Drawing.StringAlignment]::Center
$fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
FillRounded 92 2218 200 82 34 (Solid "#d31425")
$g.DrawString("MIXUE", $markFont, (Solid "#ffffff"), [System.Drawing.RectangleF]::new(92, 2218, 200, 82), $fmt)
$fmt.Dispose()

$outDir = Split-Path -Parent $OutPath
if (-not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

$bitmap.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bitmap.Dispose()
$bg.Dispose()
$aqua.Dispose()
$lemonBlob.Dispose()
$wave.Dispose()
$inner.Dispose()
$banner.Dispose()
$badge.Dispose()
$badgeShadow.Dispose()
$topFont.Dispose()
$titleFont.Dispose()
$seasonFont.Dispose()
$coolFont.Dispose()
$freshFont.Dispose()
$productFont.Dispose()
$cupFont.Dispose()
$smallFont.Dispose()
$markFont.Dispose()
$freshTag.Dispose()

Write-Output $OutPath
