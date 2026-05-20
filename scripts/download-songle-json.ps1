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

function GetValidatedSongUrl($Value) {
  $trimmed = $Value.Trim()
  if ($trimmed -match "[\x00-\x1f]") {
    Fail "SongUrl contains control characters."
  }

  $candidate = $trimmed
  if ($candidate -notmatch "^[a-z][a-z0-9+.-]*://") {
    $candidate = "https://$candidate"
  }

  [System.Uri]$uri = $null
  if (-not [System.Uri]::TryCreate($candidate, [System.UriKind]::Absolute, [ref]$uri)) {
    Fail "SongUrl must be an absolute or scheme-less HTTP(S) URL."
  }
  if ($uri.Scheme -ne "http" -and $uri.Scheme -ne "https") {
    Fail "SongUrl must use http or https."
  }

  $hostName = $uri.Host.ToLowerInvariant()
  $path = $uri.AbsolutePath
  $query = $uri.Query
  $isYouTubeWatch =
    ($hostName -eq "youtube.com" -or $hostName -eq "www.youtube.com" -or $hostName -eq "m.youtube.com") -and
    $path -eq "/watch" -and
    $query -match "(\?|&)v=[^&]+"
  $isYouTubeShort = $hostName -eq "youtu.be" -and $path.Length -gt 1
  $isNicoWatch =
    ($hostName -eq "nicovideo.jp" -or $hostName -eq "www.nicovideo.jp") -and
    $path.StartsWith("/watch/")
  $isNicoShort = $hostName -eq "nico.ms" -and $path.Length -gt 1

  if (-not ($isYouTubeWatch -or $isYouTubeShort -or $isNicoWatch -or $isNicoShort)) {
    Fail "SongUrl must point to an allowed YouTube or NicoNico watch URL."
  }

  return $trimmed
}

function ReadJsonFile($Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }
  return Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
}

function ConvertToSeconds($Value) {
  if ($null -eq $Value) {
    return $null
  }

  try {
    $number = [double]$Value
  } catch {
    return $null
  }

  if ([double]::IsNaN($number) -or [double]::IsInfinity($number)) {
    return $null
  }

  if ($number -gt 1000) {
    return $number / 1000
  }
  return $number
}

function FormatSeconds($Value) {
  $seconds = ConvertToSeconds $Value
  if ($null -eq $seconds) {
    return ""
  }
  return "{0:N2}s" -f $seconds
}

function FormatBpmSummary($BeatJson) {
  if ($null -eq $BeatJson -or $null -eq $BeatJson.beats) {
    return ""
  }

  $bpmValues = @()
  foreach ($beat in @($BeatJson.beats)) {
    if ($null -ne $beat.bpm) {
      try {
        $bpm = [double]$beat.bpm
        if (-not [double]::IsNaN($bpm) -and -not [double]::IsInfinity($bpm) -and $bpm -gt 0) {
          $bpmValues += $bpm
        }
      } catch {
        # Ignore non-numeric BPM values.
      }
    }
  }

  if (-not $bpmValues.Count) {
    return ""
  }

  $sorted = @($bpmValues | Sort-Object)
  $middle = [int][Math]::Floor($sorted.Count / 2)
  if ($sorted.Count % 2 -eq 0) {
    $median = ($sorted[$middle - 1] + $sorted[$middle]) / 2
  } else {
    $median = $sorted[$middle]
  }

  $average = ($bpmValues | Measure-Object -Average).Average
  return ("BPM median {0:N1}, average {1:N1}" -f $median, $average)
}

function WriteDownloadedSummary($DownloadedFiles) {
  Write-Host ""
  Write-Host "Summary:"

  if ($DownloadedFiles.ContainsKey("song")) {
    $songJson = ReadJsonFile $DownloadedFiles["song"]
    if ($null -ne $songJson) {
      $duration = FormatSeconds $songJson.duration
      if ($songJson.title) {
        Write-Host "  Title: $($songJson.title)"
      }
      if ($duration) {
        Write-Host "  Duration: $duration"
      }
      if ($songJson.recognizedAt) {
        Write-Host "  Songle recognizedAt: $($songJson.recognizedAt)"
      }
      if ($songJson.updatedAt) {
        Write-Host "  Songle updatedAt: $($songJson.updatedAt)"
      }
    }
  }

  if ($DownloadedFiles.ContainsKey("beat")) {
    $beatJson = ReadJsonFile $DownloadedFiles["beat"]
    if ($null -ne $beatJson -and $null -ne $beatJson.beats) {
      $beatCount = @($beatJson.beats).Count
      Write-Host "  Beats: $beatCount"
      $bpmSummary = FormatBpmSummary $beatJson
      if ($bpmSummary) {
        Write-Host "  $bpmSummary"
      }
    }
  }

  if ($DownloadedFiles.ContainsKey("chorus")) {
    $chorusJson = ReadJsonFile $DownloadedFiles["chorus"]
    if ($null -ne $chorusJson -and $null -ne $chorusJson.chorusSegments) {
      $chorusRepeats = @()
      foreach ($segment in @($chorusJson.chorusSegments)) {
        if ($segment.isChorus -eq $false) {
          continue
        }
        foreach ($repeat in @($segment.repeats)) {
          if ($null -ne $repeat.start -and $null -ne $repeat.duration) {
            $chorusRepeats += $repeat
          }
        }
      }
      Write-Host "  Chorus repeats: $($chorusRepeats.Count)"
      foreach ($repeat in @($chorusRepeats | Select-Object -First 6)) {
        $start = FormatSeconds $repeat.start
        $duration = FormatSeconds $repeat.duration
        if ($start -and $duration) {
          Write-Host "    - start $start, duration $duration"
        }
      }
      if ($chorusRepeats.Count -gt 6) {
        Write-Host "    - ..."
      }
    }
  }
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

$normalizedSongUrl = GetValidatedSongUrl $SongUrl

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

$downloadedFiles = @{}
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
    $downloadedFiles[$targetName] = $path
  } finally {
    if (Test-Path -LiteralPath $tempPath) {
      Remove-Item -LiteralPath $tempPath -Force
    }
  }
}

Write-Host "Saved Songle JSON files to $fullOutDir"
WriteDownloadedSummary $downloadedFiles
