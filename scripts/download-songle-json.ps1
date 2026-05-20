$ErrorActionPreference = "Stop"

param(
  [string]$SongId,
  [string]$SongUrl
)

if (-not $SongId -or -not $SongUrl) {
  Write-Host "Usage:"
  Write-Host "  npm run download:songle -- -SongId <song-id> -SongUrl <songle-target-url>"
  Write-Host ""
  Write-Host "Example target URL format:"
  Write-Host "  www.youtube.com/watch?v=..."
  exit 1
}

$encoded = [System.Uri]::EscapeDataString($SongUrl)
$outDir = Join-Path $PSScriptRoot "..\song-packs\$SongId\analysis"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$targets = @(
  @{ Name = "song.json"; Url = "https://widget.songle.jp/api/v1/song.json?url=$encoded" },
  @{ Name = "beat.json"; Url = "https://widget.songle.jp/api/v1/song/beat.json?url=$encoded" },
  @{ Name = "chord.json"; Url = "https://widget.songle.jp/api/v1/song/chord.json?url=$encoded" },
  @{ Name = "melody.json"; Url = "https://widget.songle.jp/api/v1/song/melody.json?url=$encoded" },
  @{ Name = "chorus.json"; Url = "https://widget.songle.jp/api/v1/song/chorus.json?url=$encoded" }
)

foreach ($target in $targets) {
  $path = Join-Path $outDir $target.Name
  Write-Host "Downloading $($target.Name)"
  Invoke-WebRequest -Uri $target.Url -OutFile $path
}

Write-Host "Saved Songle JSON files to $outDir"
