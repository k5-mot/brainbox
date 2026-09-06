. (Join-Path $PSScriptRoot "Assert-DownloadScript.ps1")

$TestParameters = @{
    ScriptPath = Join-Path $PSScriptRoot "../Download-DEB.ps1"
    ExpectedParameters = @("OutputDir", "Help")
    ExpectedOutputDirectory = "deb"
}
Assert-DownloadScript @TestParameters

$Source = Get-Content -Raw -Path $TestParameters.ScriptPath
if ($Source -match "New-TemporaryFile") {
    throw "Download-DEB.ps1 must not use the user profile temporary directory."
}
if ($Source -notmatch "\.deb-packages-") {
    throw "Download-DEB.ps1 must create Packages metadata under OutputDir."
}
