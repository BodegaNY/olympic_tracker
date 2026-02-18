# Create GitHub repo "olympic_tracker" and push this project.
# Uses the same access as the poker project (BodegaNY/phgpoker):
#   1. GITHUB_TOKEN (or GH_TOKEN) env if set
#   2. Else: git credential for github.com (Windows Credential Manager)
# So no manual token needed if you've already pushed to GitHub from this machine.
#
# Run from repo root:  .\scripts\create-github-repo.ps1

$ErrorActionPreference = "Stop"
$repoName = "olympic_tracker"

$token = $env:GITHUB_TOKEN
if (-not $token) { $token = $env:GH_TOKEN }
if (-not $token) {
    $cred = "protocol=https`nhost=github.com" | git credential fill 2>$null
    $token = ($cred | Where-Object { $_ -match '^password=' }) -replace '^password=',''
}
if (-not $token) {
    Write-Error "No GitHub token. Set GITHUB_TOKEN or ensure git credential for github.com is configured (same as for BodegaNY/phgpoker)."
    exit 1
}

$root = (Resolve-Path (Join-Path (Split-Path -Parent $PSScriptRoot) ".")).Path
Push-Location $root

try {
    # GitHub API + git (works with token from env or git credential; avoids gh scope requirements)
    $headers = @{
        "Authorization" = "Bearer $token"
        "Accept"        = "application/vnd.github+json"
        "X-GitHub-Api-Version" = "2022-11-28"
    }
    $body = @{ name = $repoName; description = "Olympics medal tracker"; private = $false } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    $login = $resp.owner.login
    $url = "https://${token}@github.com/${login}/${repoName}.git"
    git remote add origin $url 2>$null
    if ($LASTEXITCODE -ne 0) { git remote set-url origin $url }
    git push -u origin main
    git remote set-url origin "https://github.com/${login}/${repoName}.git"
    Write-Host "Done. Repo: https://github.com/$login/$repoName"
} finally {
    Pop-Location
}
