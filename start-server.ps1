# Start the Olympics tracker server using full path to Node (no need for npm in PATH)
$nodeExe = "C:\Program Files\nodejs\node.exe"
$scriptDir = $PSScriptRoot
if (-not (Test-Path $nodeExe)) {
  Write-Host "Node.js not found at $nodeExe"
  exit 1
}
Set-Location $scriptDir
Write-Host "Starting server at http://localhost:3000"
& $nodeExe server.js
