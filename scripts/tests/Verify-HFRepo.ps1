. (Join-Path $PSScriptRoot "Assert-DownloadScript.ps1")

$TestParameters = @{
    ScriptPath = Join-Path $PSScriptRoot "../Download-HFRepo.ps1"
    ExpectedParameters = @("OutputDir", "Help")
    ExpectedOutputDirectory = "hfrepo"
}
Assert-DownloadScript @TestParameters

$Source = Get-Content -Raw -Path $TestParameters.ScriptPath
if ($Source -notmatch '\$env:HF_HOME\s*=\s*\$CacheDirectory') {
    throw "Download-HFRepo.ps1 must set HF_HOME under OutputDir."
}
if ($Source -notmatch 'Join-Path\s+\$OutputRoot\s+"\.hf-cache"') {
    throw "Download-HFRepo.ps1 must place the Hugging Face cache under OutputDir."
}
