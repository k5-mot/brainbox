. (Join-Path $PSScriptRoot "Invoke-DownloadTest.ps1")

$OutputDir = New-DownloadTestDirectory -Name "docling"
$PreviousHfHome = $env:HF_HOME
$UserCacheDirectory = Join-Path $OutputDir "user-profile-cache"
$env:HF_HOME = $UserCacheDirectory
try {
    Invoke-DownloadTestScript -ScriptName "Download-Docling.ps1" -OutputDir $OutputDir
    Assert-DownloadTestArtifacts -Directory (Join-Path $OutputDir "docling") -Pattern "*.traineddata"
    if (Test-Path -LiteralPath $UserCacheDirectory) {
        throw "Download-Docling.ps1 used the caller's Hugging Face cache."
    }
    if ($env:HF_HOME -ne $UserCacheDirectory) {
        throw "Download-Docling.ps1 did not restore HF_HOME."
    }
}
finally {
    $env:HF_HOME = $PreviousHfHome
    Remove-DownloadTestDirectory -Path $OutputDir
}
