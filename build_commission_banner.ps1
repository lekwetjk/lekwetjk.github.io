param(
  [string]$SourceRoot = "C:\Users\Jakub Kubacki\Documents\KOMISJE_KRD",
  [string]$PublicTarget = "public/media/komisje",
  [string]$ManifestTarget = "app/data/commission-banner.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $SourceRoot -PathType Container)) {
  throw "Source directory not found: $SourceRoot"
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $repoRoot

try {
  $allowedExtensions = @(
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".svg",
    ".gif",
    ".avif"
  )

  New-Item -ItemType Directory -Path $PublicTarget -Force | Out-Null

  # Clean previous generated assets to avoid stale links.
  Get-ChildItem -Path $PublicTarget -File -ErrorAction SilentlyContinue | Remove-Item -Force

  $items = @()
  $sourceDirectories = @(Get-ChildItem -Path $SourceRoot -Directory | Sort-Object Name)
  $rootFiles = @(Get-ChildItem -Path $SourceRoot -File -ErrorAction SilentlyContinue)

  $directories = $sourceDirectories
  if ($sourceDirectories.Count -eq 1) {
    $nested = @(Get-ChildItem -Path $sourceDirectories[0].FullName -Directory | Sort-Object Name)
    if ($nested.Count -gt 0 -and ($rootFiles.Count -eq 0 -or $nested.Count -ge 3)) {
      $directories = $nested
    }
  }

  foreach ($dir in $directories) {
    $selected = Get-ChildItem -Path $dir.FullName -File -Recurse |
      Where-Object { $allowedExtensions -contains $_.Extension.ToLowerInvariant() } |
      Sort-Object LastWriteTimeUtc -Descending |
      Select-Object -First 1

    if (-not $selected) {
      continue
    }

    $safeFolder = ($dir.Name -replace "[^A-Za-z0-9_-]", "-").Trim("-")
    if (-not $safeFolder) {
      $safeFolder = "komisja"
    }

    $targetFileName = "$safeFolder$($selected.Extension.ToLowerInvariant())"
    $targetPath = Join-Path $PublicTarget $targetFileName

    Copy-Item -LiteralPath $selected.FullName -Destination $targetPath -Force

    $items += [PSCustomObject]@{
      folder = $dir.Name
      fileName = $selected.Name
      href = "/media/komisje/$targetFileName"
    }
  }

  $json = if ($items.Count -gt 0) {
    @($items) | ConvertTo-Json -Depth 4
  }
  else {
    "[]"
  }
  Set-Content -Path $ManifestTarget -Value $json -Encoding UTF8

  Write-Host "Generated $($items.Count) banner items."
  Write-Host "Manifest: $ManifestTarget"
  Write-Host "Assets:   $PublicTarget"
}
finally {
  Pop-Location
}
