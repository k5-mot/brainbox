. (Join-Path $PSScriptRoot "Invoke-DownloadTest.ps1")

if (Skip-DownloadTestIfCommandMissing -Command "npm") {
    exit 0
}

$OutputDir = New-DownloadTestDirectory -Name "npm"
$UserCacheDir = Join-Path $OutputDir "user-cache"
$PreviousCache = $env:NPM_CONFIG_CACHE
try {
    $env:NPM_CONFIG_CACHE = $UserCacheDir
    Invoke-DownloadTestScript -ScriptName "Download-NpmPkgs.ps1" -OutputDir $OutputDir
    Assert-DownloadTestArtifacts -Directory (Join-Path $OutputDir "npm") -Pattern "*.tgz"
    if (Test-Path -LiteralPath $UserCacheDir) {
        throw "user npm cacheが使用されました: $UserCacheDir"
    }
}
finally {
    $env:NPM_CONFIG_CACHE = $PreviousCache
    Remove-DownloadTestDirectory -Path $OutputDir
}
