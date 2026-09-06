. (Join-Path $PSScriptRoot "Assert-DownloadScript.ps1")

$TestParameters = @{
    ScriptPath = Join-Path $PSScriptRoot "../Download-PipPkgs.ps1"
    ExpectedParameters = @("OutputDir", "Help")
}
Assert-DownloadScript @TestParameters

$Source = Get-Content -LiteralPath $TestParameters.ScriptPath -Raw
if ($Source -match [regex]::Escape("[System.IO.Path]::GetTempPath()")) {
    throw "Download-PipPkgs.ps1がuser側の一時directoryを使用しています。"
}
foreach ($Pattern in @(".pip-download-", '"--no-cache-dir"')) {
    if ($Source -notmatch [regex]::Escape($Pattern)) {
        throw "pip作業領域のquota対策がありません: $Pattern"
    }
}
