. (Join-Path $PSScriptRoot "Invoke-DownloadTest.ps1")

if (Skip-DownloadTestIfCommandMissing -Command "hf") {
    exit 0
}
hf --help *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Skip download test because hf is not runnable."
    exit 0
}

$OutputDir = New-DownloadTestDirectory -Name "hfrepo"
$PreviousHfHome = $env:HF_HOME
$UserCacheDirectory = Join-Path $OutputDir "user-profile-cache"
$env:HF_HOME = $UserCacheDirectory
try {
    Invoke-DownloadTestScript -ScriptName "Download-HFRepo.ps1" -OutputDir $OutputDir
    Assert-DownloadTestArtifacts -Directory (Join-Path $OutputDir "hfrepo") -Pattern "*"
    if (Test-Path -LiteralPath $UserCacheDirectory) {
        throw "Download-HFRepo.ps1 used the caller's Hugging Face cache."
    }
    if ($env:HF_HOME -ne $UserCacheDirectory) {
        throw "Download-HFRepo.ps1 did not restore HF_HOME."
    }
}
finally {
    $env:HF_HOME = $PreviousHfHome
    Remove-DownloadTestDirectory -Path $OutputDir
}
