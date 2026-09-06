. (Join-Path $PSScriptRoot "Assert-DownloadScript.ps1")

$TestParameters = @{
    ScriptPath = Join-Path $PSScriptRoot "../Download-LibreTranslate.ps1"
    ExpectedParameters = @("OutputDir", "Help")
    ExpectedOutputDirectory = "libretranslate"
}
Assert-DownloadScript @TestParameters

$RepositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../.."))
$DownloadScriptSource = Get-Content -LiteralPath $TestParameters.ScriptPath -Raw
$ComposeSource = Get-Content -LiteralPath (Join-Path $RepositoryRoot "13-translate/docker-compose.yml") -Raw

if ($DownloadScriptSource -match "(?m)^\s*(?:&\s*)?docker(?:\s|$)") {
    throw "LibreTranslate資材download scriptがDocker commandを実行しています。"
}

foreach ($Pattern in @(
    "docker.io/libretranslate/libretranslate:v1.9.6",
    "/srv/libretranslate:/home/libretranslate/.local/share/argos-translate:ro",
    'LT_UPDATE_MODELS: "false"',
    'LT_FORCE_UPDATE_MODELS: "false"'
)) {
    if ($ComposeSource -notmatch [regex]::Escape($Pattern)) {
        throw "LibreTranslate Composeにair-gap必須設定がありません: $Pattern"
    }
}

foreach ($ModelPath in @(
    "packages/en_ja/metadata.json",
    "packages/ja_en/metadata.json",
    "minisbd/en.onnx",
    "minisbd/ja.onnx"
)) {
    if ($ComposeSource -notmatch [regex]::Escape($ModelPath)) {
        throw "LibreTranslateの起動前検証pathがありません: $ModelPath"
    }
}

if ($ComposeSource -match "\bbuild:") {
    throw "LibreTranslate ComposeがDocker buildを要求しています。"
}
