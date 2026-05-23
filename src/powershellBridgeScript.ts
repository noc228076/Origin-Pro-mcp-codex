export const originPowerShellBridgeScript = String.raw`
$ErrorActionPreference = "Stop"
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$script:origin = $null

function ConvertTo-BridgeJson {
  param([Parameter(Mandatory = $true)] $Value)
  return ($Value | ConvertTo-Json -Depth 100 -Compress)
}

function Write-BridgeResponse {
  param(
    [Parameter(Mandatory = $true)] [long] $Id,
    $Result,
    [string] $ErrorMessage
  )

  if ($ErrorMessage) {
    $payload = @{ id = $Id; ok = $false; error = $ErrorMessage }
  } else {
    $payload = @{ id = $Id; ok = $true; result = $Result }
  }

  [Console]::Out.WriteLine((ConvertTo-BridgeJson $payload))
  [Console]::Out.Flush()
}

function Get-OriginApp {
  if ($null -eq $script:origin) {
    $script:origin = New-Object -ComObject Origin.ApplicationSI
  }
  return $script:origin
}

function Get-ComIndexedProperty {
  param(
    [Parameter(Mandatory = $true)] $Target,
    [Parameter(Mandatory = $true)] [string] $Name,
    [Parameter(Mandatory = $true)] [object[]] $Arguments
  )

  return $Target.GetType().InvokeMember(
    $Name,
    [System.Reflection.BindingFlags]::GetProperty,
    $null,
    $Target,
    $Arguments
  )
}

function Set-ComIndexedProperty {
  param(
    [Parameter(Mandatory = $true)] $Target,
    [Parameter(Mandatory = $true)] [string] $Name,
    [Parameter(Mandatory = $true)] [object[]] $Arguments
  )

  return $Target.GetType().InvokeMember(
    $Name,
    [System.Reflection.BindingFlags]::SetProperty,
    $null,
    $Target,
    $Arguments
  )
}

function ConvertFrom-WorksheetJson {
  param([AllowNull()] $Rows)

  if ($null -eq $Rows) {
    return @()
  }

  $rowCount = $Rows.Count
  if ($rowCount -eq 0) {
    return @()
  }

  $columnCount = $Rows[0].Count
  $matrix = New-Object "object[,]" $rowCount, $columnCount

  for ($row = 0; $row -lt $rowCount; $row++) {
    for ($column = 0; $column -lt $columnCount; $column++) {
      $value = $Rows[$row][$column]
      if ($null -eq $value) {
        $matrix[$row, $column] = ""
      } elseif ($value -is [bool]) {
        $matrix[$row, $column] = if ($value) { 1 } else { 0 }
      } else {
        $matrix[$row, $column] = $value
      }
    }
  }

  return $matrix
}

function ConvertTo-LabTalkStringLiteral {
  param([AllowNull()] $Value)

  if ($null -eq $Value) {
    return '""'
  }

  $text = [string]$Value
  $text = $text.Replace('\', '\\').Replace('"', '\"')
  return '"' + $text + '"'
}

function ConvertTo-LabTalkNumberLiteral {
  param([Parameter(Mandatory = $true)] $Value)

  return [System.Convert]::ToString($Value, [System.Globalization.CultureInfo]::InvariantCulture)
}

function Get-WorksheetTargetScript {
  param([Parameter(Mandatory = $true)] [string] $WorksheetRange)

  $range = $WorksheetRange.Trim()
  if ($range -match '^\[([^\]]+)\]([^!]*)!?') {
    $book = $Matches[1]
    $sheet = $Matches[2]
    $script = "win -a " + $book + ";"
    if ($sheet -and $sheet.Length -gt 0) {
      if ($sheet -match '^\d+$') {
        $script += "page.active=" + $sheet + ";"
      } else {
        $script += "page.active$=" + (ConvertTo-LabTalkStringLiteral $sheet) + ";"
      }
    }
    return $script
  }

  return ""
}

function Set-OriginWorksheetCells {
  param(
    [Parameter(Mandatory = $true)] $Origin,
    [Parameter(Mandatory = $true)] [string] $WorksheetRange,
    [AllowNull()] $Rows,
    [Parameter(Mandatory = $true)] [int] $RowOffset,
    [Parameter(Mandatory = $true)] [int] $ColumnOffset
  )

  if ($null -eq $Rows -or $Rows.Count -eq 0) {
    return $true
  }

  $rowCount = $Rows.Count
  $columnCount = $Rows[0].Count
  $script = Get-WorksheetTargetScript $WorksheetRange
  $script += "wks.nCols=max(wks.nCols," + ($ColumnOffset + $columnCount) + ");"
  $script += "wks.nRows=max(wks.nRows," + ($RowOffset + $rowCount) + ");"

  for ($row = 0; $row -lt $rowCount; $row++) {
    for ($column = 0; $column -lt $columnCount; $column++) {
      $targetRow = $RowOffset + $row + 1
      $targetColumn = $ColumnOffset + $column + 1
      $value = $Rows[$row][$column]

      if ($null -eq $value -or $value -is [string]) {
        $script += "wcol(" + $targetColumn + ")[" + $targetRow + "]$=" + (ConvertTo-LabTalkStringLiteral $value) + ";"
      } elseif ($value -is [bool]) {
        $script += "wcol(" + $targetColumn + ")[" + $targetRow + "]=" + $(if ($value) { "1" } else { "0" }) + ";"
      } else {
        $script += "wcol(" + $targetColumn + ")[" + $targetRow + "]=" + (ConvertTo-LabTalkNumberLiteral $value) + ";"
      }
    }
  }

  return $Origin.Execute($script)
}

function Read-OriginWorksheetCells {
  param(
    [Parameter(Mandatory = $true)] $Origin,
    [Parameter(Mandatory = $true)] [string] $WorksheetRange,
    [Parameter(Mandatory = $true)] [int] $RowOffset,
    [Parameter(Mandatory = $true)] [int] $ColumnOffset,
    [AllowNull()] $RowCount,
    [AllowNull()] $ColumnCount
  )

  $targetScript = Get-WorksheetTargetScript $WorksheetRange
  if ($targetScript.Length -gt 0) {
    $null = $Origin.Execute($targetScript)
  }

  $actualRows = [int](Get-ComIndexedProperty -Target $Origin -Name "LTVar" -Arguments @("wks.nRows"))
  $actualColumns = [int](Get-ComIndexedProperty -Target $Origin -Name "LTVar" -Arguments @("wks.nCols"))

  $requestedRows = if ($null -ne $RowCount) { [int]$RowCount } else { [Math]::Max(0, $actualRows - $RowOffset) }
  $requestedColumns = if ($null -ne $ColumnCount) { [int]$ColumnCount } else { [Math]::Max(0, $actualColumns - $ColumnOffset) }
  $readRows = [Math]::Min($requestedRows, 1000)
  $readColumns = [Math]::Min($requestedColumns, 100)

  if ($readRows -le 0 -or $readColumns -le 0) {
    return @()
  }

  $rows = @()
  for ($row = 0; $row -lt $readRows; $row++) {
    $items = @()
    $targetRow = $RowOffset + $row + 1
    for ($column = 0; $column -lt $readColumns; $column++) {
      $targetColumn = $ColumnOffset + $column + 1
      $textName = "__mcp_cell_text"
      $numberName = "__mcp_cell_number"
      $null = $Origin.Execute($textName + "$=wcol(" + $targetColumn + ")[" + $targetRow + "]$;")
      $textValue = Get-ComIndexedProperty -Target $Origin -Name "LTStr" -Arguments @($textName)

      if ($textValue -and ([string]$textValue).Length -gt 0) {
        $text = [string]$textValue
        $parsedNumber = 0.0
        if ([double]::TryParse($text, [System.Globalization.NumberStyles]::Float, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$parsedNumber)) {
          $items += $parsedNumber
        } else {
          $items += $text
        }
      } else {
        $null = $Origin.Execute($numberName + "=wcol(" + $targetColumn + ")[" + $targetRow + "];")
        $numberValue = Get-ComIndexedProperty -Target $Origin -Name "LTVar" -Arguments @($numberName)
        if ($numberValue -eq -1.23456789E-300) {
          $items += $null
        } else {
          $items += $numberValue
        }
      }
    }
    $rows += ,$items
  }

  return @{
    data = $rows
    rowCount = $readRows
    columnCount = $readColumns
    actualRowCount = $actualRows
    actualColumnCount = $actualColumns
    truncated = (($requestedRows -gt $readRows) -or ($requestedColumns -gt $readColumns))
  }
}

function Invoke-OriginMethod {
  param(
    [Parameter(Mandatory = $true)] [string] $Method,
    [AllowNull()] $Params
  )

  switch ($Method) {
    "status" {
      $visibleMode = $null
      if ($null -ne $script:origin) {
        try {
          $visibleMode = $script:origin.Visible
        } catch {
          $visibleMode = $null
        }
      }

      return @{
        connected = ($null -ne $script:origin)
        visibleMode = $visibleMode
      }
    }

    "connect" {
      $origin = Get-OriginApp
      return @{
        connected = ($null -ne $origin)
        visibleMode = $origin.Visible
      }
    }

    "setVisible" {
      $origin = Get-OriginApp
      $origin.Visible = [int]$Params.visibleMode
      return @{ visibleMode = [int]$Params.visibleMode }
    }

    "newProject" {
      $origin = Get-OriginApp
      $null = $origin.NewProject()
      return @{ ok = $true }
    }

    "loadProject" {
      $origin = Get-OriginApp
      $result = $origin.Load([string]$Params.absolutePath)
      return @{ ok = [bool]$result; relativePath = $Params.relativePath }
    }

    "saveProject" {
      $origin = Get-OriginApp
      $result = $origin.Save([string]$Params.absolutePath)
      return @{ ok = [bool]$result; relativePath = $Params.relativePath }
    }

    "execute" {
      $origin = Get-OriginApp
      if ($Params.context) {
        $result = $origin.Execute([string]$Params.script, [string]$Params.context)
      } else {
        $result = $origin.Execute([string]$Params.script)
      }
      return @{ result = $result }
    }

    "run" {
      $origin = Get-OriginApp
      $result = $origin.Run()
      return @{ result = $result }
    }

    "exit" {
      if ($null -ne $script:origin) {
        $script:origin.Exit()
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($script:origin)
        $script:origin = $null
      }
      return @{ connected = $false }
    }

    "createPage" {
      $origin = Get-OriginApp
      $name = if ($Params.name) { [string]$Params.name } else { "" }
      $template = if ($Params.template) { [string]$Params.template } else { "" }
      $result = $origin.CreatePage([int]$Params.pageCode, $name, $template)
      return @{
        result = $result
        pageType = $Params.pageType
        name = $name
      }
    }

    "putWorksheet" {
      $origin = Get-OriginApp
      $rowOffset = if ($Params.rowOffset) { [int]$Params.rowOffset } else { 0 }
      $columnOffset = if ($Params.columnOffset) { [int]$Params.columnOffset } else { 0 }
      $result = Set-OriginWorksheetCells -Origin $origin -WorksheetRange ([string]$Params.worksheetRange) -Rows $Params.data -RowOffset $rowOffset -ColumnOffset $columnOffset
      return @{
        ok = [bool]$result
        worksheetRange = $Params.worksheetRange
        rowCount = $Params.data.Count
        columnCount = if ($Params.data.Count -gt 0) { $Params.data[0].Count } else { 0 }
      }
    }

    "getWorksheet" {
      $origin = Get-OriginApp
      $rowOffset = if ($Params.rowOffset) { [int]$Params.rowOffset } else { 0 }
      $columnOffset = if ($Params.columnOffset) { [int]$Params.columnOffset } else { 0 }
      $rowCount = if ($null -ne $Params.rowCount) { [int]$Params.rowCount } else { $null }
      $columnCount = if ($null -ne $Params.columnCount) { [int]$Params.columnCount } else { $null }
      $readResult = Read-OriginWorksheetCells -Origin $origin -WorksheetRange ([string]$Params.worksheetRange) -RowOffset $rowOffset -ColumnOffset $columnOffset -RowCount $rowCount -ColumnCount $columnCount
      return @{
        worksheetRange = $Params.worksheetRange
        rowOffset = $rowOffset
        columnOffset = $columnOffset
        data = $readResult.data
        rowCount = $readResult.rowCount
        columnCount = $readResult.columnCount
        actualRowCount = $readResult.actualRowCount
        actualColumnCount = $readResult.actualColumnCount
        truncated = $readResult.truncated
      }
    }

    "getLtVar" {
      $origin = Get-OriginApp
      return @{
        name = $Params.name
        value = Get-ComIndexedProperty -Target $origin -Name "LTVar" -Arguments @([string]$Params.name)
      }
    }

    "setLtVar" {
      $origin = Get-OriginApp
      $null = Set-ComIndexedProperty -Target $origin -Name "LTVar" -Arguments @([string]$Params.name, [double]$Params.value)
      return @{ name = $Params.name; value = [double]$Params.value }
    }

    "getLtStr" {
      $origin = Get-OriginApp
      return @{
        name = $Params.name
        value = Get-ComIndexedProperty -Target $origin -Name "LTStr" -Arguments @([string]$Params.name)
      }
    }

    "setLtStr" {
      $origin = Get-OriginApp
      $null = Set-ComIndexedProperty -Target $origin -Name "LTStr" -Arguments @([string]$Params.name, [string]$Params.value)
      return @{ name = $Params.name; value = [string]$Params.value }
    }

    "plotXY" {
      $origin = Get-OriginApp
      $range = [string]$Params.range
      $plotCode = [int]$Params.plotCode
      $script = "plotxy " + $range + " plot:=" + $plotCode + ";"
      $result = $origin.Execute($script)
      return @{ script = $script; result = $result; plotType = $Params.plotType }
    }

    "exportGraph" {
      $origin = Get-OriginApp
      if ($Params.graphName) {
        $null = $origin.Execute("win -a " + [string]$Params.graphName + ";")
      }
      $pathLiteral = [string]$Params.absolutePath
      $script = "expGraph type:=" + [string]$Params.format + " path:=""" + $pathLiteral + """;"
      $result = $origin.Execute($script)
      return @{
        script = $script
        result = $result
        relativePath = $Params.relativePath
        format = $Params.format
      }
    }

    default {
      throw "Unsupported bridge method: $Method"
    }
  }
}

while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) {
    break
  }

  if ($line.Trim().Length -eq 0) {
    continue
  }

  try {
    $request = $line | ConvertFrom-Json
    $result = Invoke-OriginMethod -Method ([string]$request.method) -Params $request.params
    Write-BridgeResponse -Id ([long]$request.id) -Result $result
  } catch {
    $requestId = 0
    if ($request -and $request.id) {
      $requestId = [long]$request.id
    }
    Write-BridgeResponse -Id $requestId -ErrorMessage ($_.Exception.Message)
  }
}
`;
