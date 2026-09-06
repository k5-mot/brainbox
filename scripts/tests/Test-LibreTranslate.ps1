. (Join-Path $PSScriptRoot "Invoke-DownloadTest.ps1")

$OutputDir = New-DownloadTestDirectory -Name "libretranslate"
try {
    Invoke-DownloadTestScript -ScriptName "Download-LibreTranslate.ps1" -OutputDir $OutputDir
    Assert-DownloadTestArtifacts -Directory (Join-Path $OutputDir "libretranslate") -Pattern @("*.onnx", "SHA256SUMS")
}
finally {
    Remove-DownloadTestDirectory -Path $OutputDir
}
