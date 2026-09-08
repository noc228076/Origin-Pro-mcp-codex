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
    try {
      $null = $script:origin.Execute("@N=1; @V=1; doc -s;")
    } catch {}
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

  $Rows = @($Rows)
  $rowCount = $Rows.Count
  if ($rowCount -eq 0) {
    return @()
  }

  $firstRow = @($Rows[0])
  $columnCount = $firstRow.Count
  $matrix = New-Object "object[,]" $rowCount, $columnCount

  for ($row = 0; $row -lt $rowCount; $row++) {
    $currentRow = @($Rows[$row])
    for ($column = 0; $column -lt $columnCount; $column++) {
      $value = $currentRow[$column]
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

  try {
    $matrix = ConvertFrom-WorksheetJson $Rows
    $success = $Origin.PutWorksheet($WorksheetRange, $matrix, $RowOffset, $ColumnOffset)
    if ($success) {
      return $true
    }
  } catch {}

  $rowCount = $Rows.Count
  $columnCount = $Rows[0].Count
  $script = "@N=1; @V=1; " + (Get-WorksheetTargetScript $WorksheetRange)
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
    return @{
      data = @()
      rowCount = 0
      columnCount = 0
      actualRowCount = $actualRows
      actualColumnCount = $actualColumns
      truncated = $false
    }
  }

  # Fast path: Native COM GetWorksheet (sub-millisecond array read)
  try {
    $raw = $Origin.GetWorksheet($WorksheetRange)
    if ($null -ne $raw -and $raw.Rank -eq 2) {
      $l0 = $raw.GetLowerBound(0)
      $u0 = $raw.GetUpperBound(0)
      $l1 = $raw.GetLowerBound(1)
      $u1 = $raw.GetUpperBound(1)
      $totalRows = $u0 - $l0 + 1
      $totalCols = $u1 - $l1 + 1

      $startRow = $l0 + $RowOffset
      $endRow = [Math]::Min($u0, $startRow + $readRows - 1)
      $startCol = $l1 + $ColumnOffset
      $endCol = [Math]::Min($u1, $startCol + $readColumns - 1)

      if ($startRow -le $u0 -and $startCol -le $u1) {
        $rows = @()
        for ($r = $startRow; $r -le $endRow; $r++) {
          $items = @()
          for ($c = $startCol; $c -le $endCol; $c++) {
            $val = $raw.GetValue($r, $c)
            if ($null -eq $val -or $val -eq -1.23456789E-300) {
              $items += $null
            } elseif ($val -is [double] -and [double]::IsNaN($val)) {
              $items += $null
            } else {
              $items += $val
            }
          }
          $rows += ,$items
        }

        return @{
          data = $rows
          rowCount = $rows.Count
          columnCount = if ($rows.Count -gt 0) { $rows[0].Count } else { 0 }
          actualRowCount = [Math]::Max($actualRows, $totalRows)
          actualColumnCount = [Math]::Max($actualColumns, $totalCols)
          truncated = (($requestedRows -gt $readRows) -or ($requestedColumns -gt $readColumns))
        }
      }
    }
  } catch {}

  # Fallback: cell-by-cell loop (only if GetWorksheet fails)
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
      $null = $origin.Execute("@N=1; @V=1; doc -s;")
      $null = $origin.NewProject()
      $null = $origin.Execute("@N=1; @V=1; doc -s;")
      return @{ ok = $true }
    }

    "loadProject" {
      $origin = Get-OriginApp
      $null = $origin.Execute("@N=1; @V=1; doc -s;")
      $result = $origin.Load([string]$Params.absolutePath)
      $null = $origin.Execute("@N=1; @V=1; doc -s;")
      return @{ ok = [bool]$result; relativePath = $Params.relativePath }
    }

    "saveProject" {
      $origin = Get-OriginApp
      $null = $origin.Execute("@N=1; @V=1; doc -s;")
      $result = $origin.Save([string]$Params.absolutePath)
      return @{ ok = [bool]$result; relativePath = $Params.relativePath }
    }

    "execute" {
      $origin = Get-OriginApp
      $cmd = "@N=1; @V=1; " + [string]$Params.script
      if ($Params.context) {
        $result = $origin.Execute($cmd, [string]$Params.context)
      } else {
        $result = $origin.Execute($cmd)
      }
      return @{ result = $result }
    }

    "executeBatch" {
      $origin = Get-OriginApp
      $statements = @($Params.statements)
      $combined = ($statements -join [System.Environment]::NewLine) + ";"
      $cmd = "@N=1; @V=1; " + $combined
      $result = $origin.Execute($cmd)
      $results = @()
      foreach ($stmt in $statements) {
        $results += @{ statement = $stmt; result = $result }
      }
      return @{ ok = [bool]$result; results = $results; result = $result }
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
      $script = "@N=1; @V=1; plotxy " + $range + " plot:=" + $plotCode + ";"
      $result = $origin.Execute($script)
      return @{ script = $script; result = $result; plotType = $Params.plotType }
    }

    "exportGraph" {
      $origin = Get-OriginApp
      $null = $origin.Execute("@N=1; @V=1; doc -s;")
      $graphSelector = ""
      if ($Params.graphName) {
        $gName = [string]$Params.graphName
        $null = $origin.Execute("win -a """ + $gName.Replace('"', '\"') + """;")
        $graphSelector = " export:=specified pages:=""" + $gName.Replace('"', '\"') + """"
      }
      $fullPath = [string]$Params.absolutePath
      $dirPath = [System.IO.Path]::GetDirectoryName($fullPath)
      $fileName = [System.IO.Path]::GetFileNameWithoutExtension($fullPath)
      $dirLiteral = $dirPath.Replace('\', '\\').Replace('"', '\"')
      $fileLiteral = $fileName.Replace('\', '\\').Replace('"', '\"')
      $script = "@N=1; @V=1; expGraph type:=" + [string]$Params.format + " path:=""" + $dirLiteral + """ filename:=""" + $fileLiteral + """" + $graphSelector + " overwrite:=replace;"
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
