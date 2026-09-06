. (Join-Path $PSScriptRoot "Assert-DownloadScript.ps1")

$TestParameters = @{
    ScriptPath = Join-Path $PSScriptRoot "../Download-NpmPkgs-from-Project.ps1"
    ExpectedParameters = @("OutputDir", "ProjectDir", "Help")
    ExpectedOutputDirectory = "npm"
}
Assert-DownloadScript @TestParameters

$Source = Get-Content -LiteralPath $TestParameters.ScriptPath -Raw
if ($Source -match [regex]::Escape("[System.IO.Path]::GetTempPath()")) {
    throw "Download-NpmPkgs-from-Project.ps1がuser側の一時directoryを使用しています。"
}
foreach ($Pattern in @(".npm-download-", "--cache=`$CacheDirectory")) {
    if ($Source -notmatch [regex]::Escape($Pattern)) {
        throw "npm作業領域のquota対策がありません: $Pattern"
    }
}
