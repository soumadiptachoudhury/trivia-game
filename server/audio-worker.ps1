Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Media

$soundsDir = Join-Path $PSScriptRoot "sounds"

$players = @{}

function Load-Sound($name, $fileName) {
    $path = Join-Path $soundsDir $fileName

    if (!(Test-Path $path)) {
        Write-Host "ERROR: Sound not found: $path"
        return
    }

    $player = New-Object System.Media.SoundPlayer
    $player.SoundLocation = $path
    $player.Load()

    $players[$name] = $player

    Write-Host "Loaded: $name"
}

Load-Sound "buzzer"  "buzzer.wav"
Load-Sound "tick"    "tick.wav"
Load-Sound "correct" "correct.wav"
Load-Sound "wrong"   "wrong.wav"
Load-Sound "expired" "expired.wav"

Write-Host "AUDIO_READY"

while ($true) {

    $line = [Console]::ReadLine()

    if ($null -eq $line) {
        break
    }

    $command = $line.Trim().ToLower()

    if ($command -eq "exit") {
        break
    }

    if ($players.ContainsKey($command)) {

        try {
            # Play asynchronously so Node is not blocked.
            $players[$command].Play()
        }
        catch {
            Write-Host "AUDIO_ERROR: $($_.Exception.Message)"
        }

    }
}
