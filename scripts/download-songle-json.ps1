$ErrorActionPreference = "Stop"

$songUrl = "www.youtube.com/watch?v=Qd01-6xVSHk"
$encoded = [System.Uri]::EscapeDataString($songUrl)
$outDir = Join-Path $PSScriptRoot "..\song-packs\shining-star\analysis"

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
