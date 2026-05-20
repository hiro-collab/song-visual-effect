param(
  [string]$SongId,
  [string]$SongUrl,
  [string[]]$Targets = @("song", "beat", "chord", "melody", "chorus"),
  [switch]$SkipMelody,
  [int]$TimeoutSec = 30,
  [int]$MaxBytes = 15000000
)

$ErrorActionPreference = "Stop"

function Fail($Message) {
  Write-Error $Message
  exit 1
}

if (-not $SongId -or -not $SongUrl) {
  Write-Host "Usage:"
  Write-Host "  npm run download:songle -- -SongId <song-id> -SongUrl <songle-target-url> [-Targets beat,chorus,chord] [-SkipMelody]"
  Write-Host ""
  Write-Host "Allowed target URL examples:"
  Write-Host "  www.youtube.com/watch?v=..."
  Write-Host "  www.nicovideo.jp/watch/sm..."
  exit 1
}

if ($SongId -notmatch "^[a-z0-9][a-z0-9._-]{0,63}$") {
  Fail "SongId must be lowercase ASCII and may contain only a-z, 0-9, dot, underscore, and hyphen."
}

$normalizedSongUrl = $SongUrl.Trim()
if ($normalizedSongUrl -match "[\x00-\x1f]") {
  Fail "SongUrl contains control characters."
}

$songUrlWithoutScheme = $normalizedSongUrl -replace "^https?://", ""
if ($songUrlWithoutScheme -notmatch "^(www\.)?youtube\.com/watch\?v=|youtu\.be/|www\.nicovideo\.jp/watch/|nico\.ms/") {
  Fail "SongUrl must point to an allowed YouTube or NicoNico watch URL."
}

$targetNames = @()
foreach ($target in $Targets) {
  $targetNames += ($target -split ",")
}
$targetNames = $targetNames |
  ForEach-Object { $_.Trim().ToLowerInvariant() } |
  Where-Object { $_ } |
  Select-Object -Unique

if ($SkipMelody) {
  $targetNames = $targetNames | Where-Object { $_ -ne "melody" }
}

if (-not $targetNames.Count) {
  Fail "No Songle targets selected."
}

$allowedTargets = @("song", "beat", "chord", "melody", "chorus")
foreach ($targetName in $targetNames) {
  if ($allowedTargets -notcontains $targetName) {
    Fail "Unsupported target '$targetName'. Allowed targets: $($allowedTargets -join ', ')"
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$songPacksRoot = Join-Path $repoRoot "song-packs"
$outDir = Join-Path (Join-Path $songPacksRoot $SongId) "analysis"
$fullSongPacksRoot = [System.IO.Path]::GetFullPath($songPacksRoot)
$fullOutDir = [System.IO.Path]::GetFullPath($outDir)
$rootPrefix = $fullSongPacksRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar

if (-not $fullOutDir.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  Fail "Output directory must stay under song-packs."
}

New-Item -ItemType Directory -Force -Path $fullOutDir | Out-Null

$encoded = [System.Uri]::EscapeDataString($normalizedSongUrl)
$endpointByTarget = @{
  song = "https://widget.songle.jp/api/v1/song.json?url=$encoded"
  beat = "https://widget.songle.jp/api/v1/song/beat.json?url=$encoded"
  chord = "https://widget.songle.jp/api/v1/song/chord.json?url=$encoded"
  melody = "https://widget.songle.jp/api/v1/song/melody.json?url=$encoded"
  chorus = "https://widget.songle.jp/api/v1/song/chorus.json?url=$encoded"
}

Write-Host "SongId: $SongId"
Write-Host "SongUrl: $normalizedSongUrl"
Write-Host "Targets: $($targetNames -join ', ')"
Write-Host "Output: $fullOutDir"

foreach ($targetName in $targetNames) {
  $fileName = "$targetName.json"
  $path = Join-Path $fullOutDir $fileName
  $tempPath = Join-Path ([System.IO.Path]::GetTempPath()) ("songle-" + [System.Guid]::NewGuid().ToString("N") + ".json")

  try {
    Write-Host "Downloading $fileName"
    Invoke-WebRequest -Uri $endpointByTarget[$targetName] -OutFile $tempPath -TimeoutSec $TimeoutSec

    $item = Get-Item -LiteralPath $tempPath
    if ($item.Length -le 0) {
      Fail "$fileName was empty."
    }
    if ($item.Length -gt $MaxBytes) {
      Fail "$fileName exceeded MaxBytes=$MaxBytes."
    }

    Get-Content -LiteralPath $tempPath -Raw -Encoding UTF8 | ConvertFrom-Json | Out-Null
    Move-Item -LiteralPath $tempPath -Destination $path -Force
  } finally {
    if (Test-Path -LiteralPath $tempPath) {
      Remove-Item -LiteralPath $tempPath -Force
    }
  }
}

Write-Host "Saved Songle JSON files to $fullOutDir"
