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

function ConvertTo-WorksheetRows {
  param([AllowNull()] $Value)

  if ($null -eq $Value) {
    return @()
  }

  if ($Value -is [System.Array] -and $Value.Rank -eq 2) {
    $rows = @()
    for ($row = 0; $row -lt $Value.GetLength(0); $row++) {
      $items = @()
      for ($column = 0; $column -lt $Value.GetLength(1); $column++) {
        $items += $Value.GetValue($row, $column)
      }
      $rows += ,$items
    }
    return $rows
  }

  if ($Value -is [System.Array]) {
    return @($Value)
  }

  return @(@($Value))
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
      $matrix = ConvertFrom-WorksheetJson $Params.data
      $rowOffset = if ($Params.rowOffset) { [int]$Params.rowOffset } else { 0 }
      $columnOffset = if ($Params.columnOffset) { [int]$Params.columnOffset } else { 0 }
      $result = $origin.PutWorksheet([string]$Params.worksheetRange, $matrix, $rowOffset, $columnOffset)
      return @{
        ok = [bool]$result
        worksheetRange = $Params.worksheetRange
        rowCount = $Params.data.Count
        columnCount = if ($Params.data.Count -gt 0) { $Params.data[0].Count } else { 0 }
      }
    }

    "getWorksheet" {
      $origin = Get-OriginApp
      $value = $origin.GetWorksheet([string]$Params.worksheetRange)
      return @{
        worksheetRange = $Params.worksheetRange
        data = ConvertTo-WorksheetRows $value
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
