# Create GitHub repo "olympic_tracker" and push this project.
# Uses the same token as your poker repo: set GITHUB_TOKEN before running, or
# add GITHUB_TOKEN to Cursor Environment/Secrets so it's available in the shell.
#
# Run from repo root:  .\scripts\create-github-repo.ps1
# Or with token inline:  $env:GITHUB_TOKEN = "ghp_xxxx"; .\scripts\create-github-repo.ps1

$ErrorActionPreference = "Stop"
$repoName = "olympic_tracker"

$token = $env:GITHUB_TOKEN
if (-not $token) { $token = $env:GH_TOKEN }
if (-not $token) {
    Write-Host "Set GITHUB_TOKEN (or GH_TOKEN) to your GitHub token, then run this script again."
    Write-Host "Example: `$env:GITHUB_TOKEN = 'ghp_xxxx'; .\scripts\create-github-repo.ps1"
    exit 1
}

$root = (Resolve-Path (Join-Path (Split-Path -Parent $PSScriptRoot) ".")).Path
Push-Location $root

try {
    # Prefer GitHub CLI if available
    $gh = Get-Command gh -ErrorAction SilentlyContinue
    if ($gh) {
        $token | gh auth login --with-token 2>$null
        gh repo create $repoName --public --source=. --remote=origin --push 2>&1
        if ($LASTEXITCODE -eq 0) {
            $login = gh api user -q .login 2>$null
            if ($login) { Write-Host "Done. Repo: https://github.com/$login/$repoName" }
            exit 0
        }
    }

    # Fallback: GitHub API + git (no gh required)
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
