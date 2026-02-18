# Add Node.js to PATH for this session so npm works (e.g. if PATH wasn't updated after install)
$nodePath = "C:\Program Files\nodejs"
if (Test-Path $nodePath) {
  $env:Path = "$nodePath;$env:Path"
  Write-Host "PATH updated for this terminal. You can now run: npm install, npm start"
} else {
  Write-Host "Node.js not found at $nodePath. Install from https://nodejs.org"
}
