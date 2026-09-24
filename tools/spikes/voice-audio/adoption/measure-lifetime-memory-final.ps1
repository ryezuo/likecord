param(
  [ValidatePattern('^(diagnostic|final)-v1-(native|rnnoise)(?:-[a-z0-9]+)?$')][string]$Run,
  [switch]$ConfirmIdle,
  [string]$ChromePath = (Join-Path $env:ProgramFiles 'Google/Chrome/Application/chrome.exe'),
  [switch]$CheckOnly
)
$ErrorActionPreference='Stop'
Set-Location (Join-Path $PSScriptRoot '..')
if (-not $IsWindows) { throw 'Windows and PowerShell 7 are required' }
if (-not (Test-Path -LiteralPath $ChromePath)) { throw 'Supply an installed Chrome executable with -ChromePath' }
Add-Type -Path (Join-Path $PSScriptRoot 'controlled-memory-owned-counters.cs')
$va3bPreflight=[Va3bOwnedCounters]::Read($PID)
if ($va3bPreflight.PrivateWorkingSetBytes -le 0 -or $va3bPreflight.PrivateWorkingSetBytes -gt $va3bPreflight.RssBytes) { throw 'Private resident counter unavailable' }
if ($CheckOnly) { Write-Output 'MEMORY_COLLECTOR_PREFLIGHT=PASS; no measurement started'; exit 0 }
if (-not $Run -or -not $ConfirmIdle) { throw 'Supply -Run and explicitly confirm an idle host with -ConfirmIdle' }
if (-not (Test-Path -LiteralPath 'dist/va3b-lifetime-memory-final/manifest.json')) { throw 'Run npm run build:lifetime first' }
New-Item -ItemType Directory -Path '.cache','results' -Force | Out-Null
$va3bResultFile="results/local-lifetime-$Run-process.json"
if (Test-Path -LiteralPath "results/local-lifetime-$Run-browser.json") { throw 'Run label already has browser evidence; choose a new label' }
if (Test-Path -LiteralPath $va3bResultFile) { throw 'Refusing to overwrite a preserved run' }
$va3bParent=[IO.Path]::GetFullPath((Join-Path (Get-Location) '.cache'))
$va3bProfile=[IO.Path]::GetFullPath((Join-Path $va3bParent ('va3b-lifetime-' + [guid]::NewGuid().ToString('N'))))
if (-not $va3bProfile.StartsWith($va3bParent + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Profile outside task cache' }
$va3bServer=$null; $va3bBrowser=$null; $va3bFailure=$null; $va3bComplete=$false
$va3bSamples=[Collections.Generic.List[object]]::new()
$va3bEvents=[Collections.Generic.List[object]]::new()
$va3bMappings=@{}; $va3bRoleCounts=@{}
$va3bClock=[Diagnostics.Stopwatch]::StartNew()
$va3bLastSignature=''; $va3bStableSince=0; $va3bBaselineStart=$null; $va3bBaselineEnd=$null; $va3bBaselineSignature=$null
$va3bInvalidTopology=$false; $va3bTargetId=$null; $va3bAudioAlias=$null; $va3bTargetAlias=$null
$va3bCollectorHashes=@{}
foreach ($file in @('measure-lifetime-memory-final.ps1','controlled-memory-owned-counters.cs','lifetime-memory-final-server.mjs')) { $va3bCollectorHashes[$file]=(Get-FileHash -LiteralPath (Join-Path $PSScriptRoot $file) -Algorithm SHA256).Hash.ToLowerInvariant() }
function Start-Owned([string]$Executable,[string[]]$Arguments) {
  $info=[Diagnostics.ProcessStartInfo]::new(); $info.FileName=$Executable; $info.UseShellExecute=$false; $info.CreateNoWindow=$true; $info.WorkingDirectory=(Get-Location).Path
  foreach ($argument in $Arguments) { $info.ArgumentList.Add($argument) }; return [Diagnostics.Process]::Start($info)
}
try {
  if (@(Get-NetTCPConnection -LocalPort 4320,4321 -State Listen -ErrorAction SilentlyContinue).Count) { throw 'Owned measurement ports occupied' }
  $va3bServer=Start-Owned (Get-Command node).Source @('adoption/lifetime-memory-final-server.mjs',"$Run")
  $response=$null
  for ($retry=0; $retry -lt 30; $retry++) { try { $response=Invoke-WebRequest 'http://127.0.0.1:4320/status' -UseBasicParsing; break } catch { Start-Sleep -Milliseconds 100 } }
  if ($response.Headers['X-VA3B-Proof'] -ne 'lifetime-memory') { throw 'Collector identity mismatch' }
  $va3bBrowser=Start-Owned $ChromePath @('--headless',"--user-data-dir=$va3bProfile",'--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions','--autoplay-policy=no-user-gesture-required','--remote-debugging-address=127.0.0.1','--remote-debugging-port=4321','http://127.0.0.1:4320/')
  $lastPhase=''; $lastProgress=0; $va3bDeadline=if ($Run.StartsWith('final-')) { 2400 } else { 900 }
  while ($va3bClock.Elapsed.TotalSeconds -lt $va3bDeadline) {
    $tick=$va3bClock.Elapsed.TotalMilliseconds
    $status=Invoke-RestMethod 'http://127.0.0.1:4320/status'
    if ($status.done) { $va3bComplete=$true; break }
    if ($va3bBrowser.HasExited) { throw 'Dedicated browser exited early' }
    if ($status.pageRequests -gt 1) { $va3bInvalidTopology=$true; throw 'Target page navigated/reloaded' }
    if ($status.targetPid) {
      if ($va3bTargetId -and $va3bTargetId -ne [int]$status.targetPid) { $va3bInvalidTopology=$true; throw 'Target renderer replaced' }
      $va3bTargetId=[int]$status.targetPid
    }
    $remembered=[Collections.Generic.Dictionary[int,ulong]]::new()
    foreach ($key in $va3bMappings.Keys) { if (-not $va3bMappings[$key].retired -and $va3bMappings[$key].nativeCreation) { $remembered[$key]=$va3bMappings[$key].nativeCreation } }
    $live=@([Va3bOwnedCounters]::OwnedSnapshot($va3bBrowser.Id,$remembered))
    foreach ($key in @($va3bMappings.Keys)) { if ($live.Id -notcontains $key) { $va3bMappings[$key].retired=$true } }
    foreach ($row in $live) {
      if (-not $va3bMappings.ContainsKey($row.Id) -or $va3bMappings[$row.Id].retired) {
        $metadata=Get-CimInstance Win32_Process -Filter "ProcessId=$($row.Id)" -Property CommandLine,CreationDate,Name
        if (-not $metadata) { continue }
        $line=$metadata.CommandLine
        $role=if ($row.Id -eq $va3bBrowser.Id) { 'BROWSER' }
          elseif ($line -match '--type=renderer(?:\s|$)') { 'RENDERER' }
          elseif ($line -match '--type=gpu-process(?:\s|$)') { 'GPU' }
          elseif ($line -match '--type=crashpad-handler(?:\s|$)' -or $metadata.Name -match 'crash') { 'CRASH_HANDLER' }
          elseif ($line -match '--utility-sub-type=audio\.mojom\.AudioService(?:\s|$)') { 'AUDIO_SERVICE' }
          elseif ($line -match '--utility-sub-type=network\.mojom\.NetworkService(?:\s|$)') { 'NETWORK_SERVICE' }
          elseif ($line -match '--utility-sub-type=storage\.mojom\.StorageService(?:\s|$)') { 'STORAGE_SERVICE' }
          elseif ($line -match '--type=utility(?:\s|$)') { 'UTILITY' }
          else { 'OTHER_CHILD' }
        $va3bRoleCounts[$role]=1+[int]$va3bRoleCounts[$role]
        $alias=if ($role -eq 'BROWSER') { 'BROWSER' } else { $role + '_' + $va3bRoleCounts[$role] }
        $service=if ($line -match '--utility-sub-type=([A-Za-z0-9_.]+)(?:\s|$)') { $Matches[1] } else { $null }
        $va3bMappings[$row.Id]=[pscustomobject]@{ alias=$alias; role=$role; creation=$metadata.CreationDate; nativeCreation=$row.CreationFileTime; retired=$false; firstObservedMs=$va3bClock.Elapsed.TotalMilliseconds }
        $va3bEvents.Add([pscustomobject]@{ atMs=$va3bClock.Elapsed.TotalMilliseconds; event='process_identified'; alias=$alias; role=$role; serviceType=$service; phase=if ($status.phase) { $status.phase.name } else { 'IDENTIFICATION' } })
      }
      if ($row.Id -eq $va3bTargetId) { $va3bMappings[$row.Id].role='TARGET_RENDERER'; $va3bTargetAlias=$va3bMappings[$row.Id].alias }
    }
    $rows=[Collections.Generic.List[object]]::new(); $covered=$true
    foreach ($row in $live) {
      if (-not $va3bMappings.ContainsKey($row.Id)) { $covered=$false; continue }
      $mapping=$va3bMappings[$row.Id]
      try {
        $memory=[Va3bOwnedCounters]::Read($row.Id)
        if ($mapping.nativeCreation -and $mapping.nativeCreation -ne $memory.CreationFileTime) { throw 'Process identity reused' }
        $mapping.nativeCreation=$memory.CreationFileTime
        if ($memory.PrivateWorkingSetBytes -gt $memory.RssBytes) { throw 'Counter inconsistency' }
        $rows.Add([pscustomobject]@{ alias=$mapping.alias; role=$mapping.role; attributed=($mapping.role -in @('TARGET_RENDERER','AUDIO_SERVICE','BROWSER','NETWORK_SERVICE','STORAGE_SERVICE')); privateWorkingSetBytes=$memory.PrivateWorkingSetBytes; rssBytes=$memory.RssBytes; privateCommitBytes=$memory.PrivateCommitBytes })
      } catch { $covered=$false }
    }
    $audio=@($rows | Where-Object role -eq 'AUDIO_SERVICE')
    if ($audio.Count -eq 1) { $va3bAudioAlias=$audio[0].alias }
    $signature=($rows | Sort-Object alias | ForEach-Object { $_.alias + ':' + $_.role }) -join ','
    if ($signature -ne $va3bLastSignature -or -not $covered) {
      $va3bStableSince=$va3bClock.Elapsed.TotalMilliseconds
      if ($va3bBaselineEnd) { $va3bInvalidTopology=$true; $va3bEvents.Add([pscustomobject]@{atMs=$va3bStableSince;event='INVALIDATE_RUN_PROCESS_TOPOLOGY_UNSTABLE';from=$va3bLastSignature;to=$signature;counterCoverage=$covered}) }
      $va3bLastSignature=$signature
      if ($status.phase.name -eq 'COMMON_STABLE_BASELINE') { $va3bBaselineStart=$va3bStableSince }
    }
    $attributed=@($rows | Where-Object attributed)
    $sample=[pscustomobject]@{ phaseElapsedMs=if ($status.phase) { [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()-$status.phase.started } else { $null }; atMs=$va3bClock.Elapsed.TotalMilliseconds; collectionMs=$va3bClock.Elapsed.TotalMilliseconds-$tick; phase=if ($status.phase) { $status.phase.name } else { 'TRANSITION' }; fullCoverage=$covered; processCount=$rows.Count; targetPresent=($rows.role -contains 'TARGET_RENDERER'); audioServiceCount=$audio.Count; attributedPrivateWorkingSetBytes=($attributed | Measure-Object privateWorkingSetBytes -Sum).Sum; attributedPrivateCommitBytes=($attributed | Measure-Object privateCommitBytes -Sum).Sum; wholeTreeRssBytes=($rows | Measure-Object rssBytes -Sum).Sum; wholeTreePrivateWorkingSetBytes=($rows | Measure-Object privateWorkingSetBytes -Sum).Sum; host=[Va3bOwnedCounters]::ReadHost(); processes=$rows }
    $va3bSamples.Add($sample)
    if ($sample.phase -ne $lastPhase) { Write-Output "Lifetime $Run phase: $($sample.phase)"; $lastPhase=$sample.phase }
    if ($va3bClock.Elapsed.TotalSeconds-$lastProgress -ge 55) { Write-Output ('Lifetime {0}: {1}, phase {2:N1}s, attributed WS {3:N3} MiB, host CPU {4:N1}%' -f $Run,$sample.phase,($sample.phaseElapsedMs/1000),($sample.attributedPrivateWorkingSetBytes/1MB),$sample.host.HOST_CPU_UTILIZATION_PERCENT); $lastProgress=$va3bClock.Elapsed.TotalSeconds }
    if ($status.phase.name -eq 'COMMON_STABLE_BASELINE' -and -not $va3bBaselineStart) { $va3bBaselineStart=$sample.atMs }
    if ($va3bBaselineEnd -and (-not $sample.targetPresent -or $audio.Count -ne 1)) { $va3bInvalidTopology=$true }
    if ($va3bInvalidTopology) { throw 'Paired run invalidated by process topology; no memory verdict' }
    $phaseElapsed=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()-$status.phase.started
    $canAdvance=$status.phase -and $phaseElapsed -ge $status.phase.seconds*1000
    # The preserved V2 observed delayed Chrome startup at ~122/182s. Both
    # crossover orders use the same 205s minimum common Native settling period.
    # Host series is reviewed after collection; no invented CPU cutoff or GC.
    if ($status.phase.name -eq 'COMMON_SETTLING') { $canAdvance=$canAdvance -and $phaseElapsed -ge 205000 -and $sample.atMs-$va3bStableSince -ge 12000 -and $covered -and $sample.targetPresent -and $audio.Count -eq 1 }
    if ($status.phase.name -eq 'COMMON_STABLE_BASELINE') { $canAdvance=$canAdvance -and $sample.atMs-$va3bBaselineStart -ge 10000 -and $covered -and $sample.targetPresent -and $audio.Count -eq 1 }
    if ($canAdvance) {
      Invoke-WebRequest 'http://127.0.0.1:4320/advance' -Method Post -UseBasicParsing | Out-Null
      if ($status.phase.name -eq 'COMMON_STABLE_BASELINE') { $va3bBaselineEnd=$sample.atMs; $va3bBaselineSignature=$signature }
    }
    $remaining=300-($va3bClock.Elapsed.TotalMilliseconds-$tick)
    if ($remaining -gt 0) { Start-Sleep -Milliseconds ([int]$remaining) }
  }
  if (-not $va3bComplete) { throw 'Bounded measurement deadline exceeded' }
} catch { $va3bFailure=$_.Exception.Message }
finally {
  # Never use an OS tree kill reconstructed solely from numeric parent PIDs.
  # Kill only live identities proven to belong to the disposable root by birth.
  if ($va3bBrowser -and -not $va3bBrowser.HasExited) {
    $remembered=[Collections.Generic.Dictionary[int,ulong]]::new()
    foreach ($key in $va3bMappings.Keys) { if (-not $va3bMappings[$key].retired -and $va3bMappings[$key].nativeCreation) { $remembered[$key]=$va3bMappings[$key].nativeCreation } }
    $ownedCleanup=@([Va3bOwnedCounters]::OwnedSnapshot($va3bBrowser.Id,$remembered))
    foreach ($entry in ($ownedCleanup | Sort-Object CreationFileTime -Descending)) {
      try {
        [void][Va3bOwnedCounters]::StopOwned($entry.Id,$entry.CreationFileTime)
      } catch [ArgumentException] { } catch [ComponentModel.Win32Exception] { }
    }
    [void]$va3bBrowser.WaitForExit(10000)
  }
  if ($va3bServer -and -not $va3bServer.HasExited) { $va3bServer.Kill(); [void]$va3bServer.WaitForExit(10000) }
  $removed=$false
  if (Test-Path -LiteralPath $va3bProfile) {
    $resolved=[IO.Path]::GetFullPath((Resolve-Path -LiteralPath $va3bProfile).Path)
    if ($resolved -ne $va3bProfile -or -not $resolved.StartsWith($va3bParent+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Refusing cleanup outside verified task profile' }
    for ($retry=0;$retry -lt 10;$retry++) { try { Remove-Item -LiteralPath $resolved -Recurse -Force; $removed=$true; break } catch { Start-Sleep -Milliseconds 500 } }
  } else { $removed=$true }
  $record=[ordered]@{id='va3b-lifetime';run=$Run;order='NATIVE_FIRST';ownerHeavyInteractiveWorkloadActive=$false;explicitIdleConfirmation=[bool]$ConfirmIdle;hostCpuLogicalProcessors=[Environment]::ProcessorCount;completed=$va3bComplete;failure=$va3bFailure;invalidTopology=$va3bInvalidTopology;collectorHashes=$va3bCollectorHashes;counter='PROCESS_MEMORY_COUNTERS_EX2.PrivateWorkingSetSize';targetSampleMs=300;targetRendererAlias=$va3bTargetAlias;audioServiceAlias=$va3bAudioAlias;baselineStartMs=$va3bBaselineStart;baselineEndMs=$va3bBaselineEnd;baselineTopology=$va3bBaselineSignature;attributedRoles=@('TARGET_RENDERER','AUDIO_SERVICE','BROWSER','NETWORK_SERVICE','STORAGE_SERVICE');attributionPolicy='Target/audio plus conservatively included stable browser/network/storage coordination; other renderer/GPU/crash/unrelated utilities diagnostic only; any topology change after baseline invalidates run';topologyEvents=$va3bEvents;profileRemoved=$removed;browserStopped=(!$va3bBrowser -or $va3bBrowser.HasExited);collectorStopped=(!$va3bServer -or $va3bServer.HasExited);processIdsPersisted=$false;rawTracePersisted=$false;forcedGC=$false;samples=$va3bSamples}
  $record | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $va3bResultFile -Encoding utf8NoBOM
  Write-Output "Lifetime $Run complete=$va3bComplete invalidTopology=$va3bInvalidTopology profileRemoved=$removed"
  if ($va3bFailure) { Write-Output $va3bFailure }
}

if ($va3bFailure -or -not $va3bComplete -or $va3bInvalidTopology -or -not $removed) { exit 1 }
