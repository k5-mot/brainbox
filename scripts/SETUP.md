# 🪟 Windows開発環境セットアップ

`winget`を中心に、InferLabの開発と保守で使用するCLI toolをWindowsへ導入します。

## 🧭 セットアップの流れ

1. 🔍 前提条件を確認する
2. 📦 `winget`で開発toolを導入する
3. 🛠️ `winget`にないCLI toolを導入する
4. 🐍 Python・Node.js packageを導入する
5. 🧩 VS Code extensionを導入する
6. ✅ 導入結果を確認する

> [!NOTE]
> 管理者権限のない通常のPowerShellで実行します。CLI toolは64-bit Windows（x86-64）用です。

## 1️⃣ 🔍 前提条件を確認する

通常のPowerShellを開き、CPU architectureと`winget`の利用可否を確認します。

```powershell
# 配布binaryと互換性があるx86-64環境であることを確認する。
if ($env:PROCESSOR_ARCHITECTURE -ne 'AMD64') {
  throw "Unsupported architecture: $env:PROCESSOR_ARCHITECTURE"
}

# winget clientが利用できることを確認する。
winget --version

# install前にwinget package catalogを更新する。
winget source update --name winget
```

### ✅ 期待結果

- CPU architectureの確認がerrorなく完了します。
- `winget --version`がversionを表示します。
- `winget` sourceの更新が成功します。

### ❌ 失敗時

- `winget`が見つからない場合は、Microsoft Storeの「アプリ インストーラー」を更新し、PowerShellを開き直してください。
- Architecture errorの場合、この手順に含まれるx86-64用binaryは導入しないでください。

## 2️⃣ 📦 wingetで開発toolを導入する

導入対象を配列へまとめ、同じoptionで1件ずつinstallします。途中のpackageで失敗した場合は即座に停止するため、失敗したpackageを特定できます。

```powershell
# InferLabの開発、文書生成、diagnosticで使用するpackage IDを定義する。
$PackageIds = @(
  'Python.Python.3.12'
  'OpenJS.NodeJS.LTS'
  'Microsoft.PowerShell'
  'Microsoft.VisualStudioCode'
  'astral-sh.uv'
  'jqlang.jq'
  'JohnMacFarlane.Pandoc'
  'sharkdp.bat'
  'Clement.bottom'
  'dandavison.delta'
  'bootandy.dust'
  'sharkdp.fd'
  'sharkdp.hyperfine'
  'BurntSushi.ripgrep.MSVC'
  'ajeetdsouza.zoxide'
  'lsd-rs.lsd'
  'Dystroy.broot'
  'ducaale.xh'
  'chmln.sd'
  'svenstaro.genact'
  'Terrastruct.D2'
)

# User scope、公式winget source、非対話実行を全packageへ適用する。
$WingetOptions = @(
  '--exact'
  '--source', 'winget'
  '--scope', 'user'
  '--accept-source-agreements'
  '--accept-package-agreements'
  '--disable-interactivity'
)

# 失敗したpackageを明示し、不完全な状態で後続処理へ進まないようにする。
foreach ($PackageId in $PackageIds) {
  winget install --id $PackageId @WingetOptions
  if ($LASTEXITCODE -ne 0) {
    throw "winget install failed: $PackageId"
  }
}
```

### ✅ 期待結果

- すべてのpackageがinstall済み、または既に最新であると表示されます。
- Loopがexceptionを発生させず完了します。

### ❌ 失敗時

- Errorに表示されたpackage IDを控え、network、winget source、User scopeへの対応状況を確認してください。
- 問題を解消した後は同じblockを再実行できます。導入済みpackageは重複installされません。

### 🔄 PowerShellを再起動する

PowerShellを閉じ、再度開いてください。これ以降は追加されたcommandを`PATH`から呼び出します。PowerShell 7を使用する場合は`pwsh`で起動します。

## 3️⃣ 🛠️ wingetにないCLI toolを導入する

`crane`、`choose`、安定版`herdr`、`hunk`を一時directoryへdownload・展開し、実行fileを`$env:USERPROFILE\.local\bin`へ配置します。処理の成否にかかわらず、download用directoryは最後に削除します。

```powershell
# User単位の実行file配置先と一時作業directoryを定義する。
$BinDir = Join-Path $env:USERPROFILE '.local\bin'
$TmpDir = Join-Path $env:USERPROFILE '.local\tmp'
$DownloadRoot = Join-Path $TmpDir ('pdev-tools-' + [guid]::NewGuid().ToString('N'))

# 既存directoryを保持しながら、今回必要なdirectoryだけを作成する。
New-Item -ItemType Directory -Force -Path $BinDir, $TmpDir, $DownloadRoot |
  Out-Null

try {
  # craneの固定version archiveを展開し、実行fileだけを配置する。
  $CraneArchive = Join-Path $DownloadRoot 'crane.tar.gz'
  $CraneExtract = Join-Path $DownloadRoot 'crane'
  New-Item -ItemType Directory -Path $CraneExtract | Out-Null
  Invoke-WebRequest `
    -Uri 'https://github.com/google/go-containerregistry/releases/download/v0.22.0/go-containerregistry_Windows_x86_64.tar.gz' `
    -OutFile $CraneArchive
  tar.exe -xf $CraneArchive -C $CraneExtract
  $CraneExecutable = Get-ChildItem `
    -LiteralPath $CraneExtract `
    -Recurse `
    -Filter 'crane.exe' |
    Select-Object -First 1
  Copy-Item `
    -LiteralPath $CraneExecutable.FullName `
    -Destination $BinDir `
    -Force

  # chooseは単一binaryのため、実行file配置先へ直接downloadする。
  Invoke-WebRequest `
    -Uri 'https://github.com/theryangeary/choose/releases/download/v1.3.7/choose-x86_64-pc-windows-gnu.exe' `
    -OutFile (Join-Path $BinDir 'choose.exe')

  # herdrの固定version archiveを展開し、実行fileだけを配置する。
  $HerdrArchive = Join-Path $DownloadRoot 'herdr.zip'
  $HerdrExtract = Join-Path $DownloadRoot 'herdr'
  Invoke-WebRequest `
    -Uri 'https://github.com/herdrdev/herdr/releases/download/v0.8.2/herdr-windows-x86_64.zip' `
    -OutFile $HerdrArchive
  Expand-Archive `
    -LiteralPath $HerdrArchive `
    -DestinationPath $HerdrExtract `
    -Force
  $HerdrExecutable = Get-ChildItem `
    -LiteralPath $HerdrExtract `
    -Recurse `
    -Filter 'herdr.exe' |
    Select-Object -First 1
  Copy-Item `
    -LiteralPath $HerdrExecutable.FullName `
    -Destination $BinDir `
    -Force

  # hunkの固定version archiveを展開し、実行fileだけを配置する。
  $HunkArchive = Join-Path $DownloadRoot 'hunk.tar.gz'
  $HunkExtract = Join-Path $DownloadRoot 'hunk'
  New-Item -ItemType Directory -Path $HunkExtract | Out-Null
  Invoke-WebRequest `
    -Uri 'https://github.com/modem-dev/hunk/releases/download/v0.21.0/hunkdiff-windows-x64.tar.gz' `
    -OutFile $HunkArchive
  tar.exe -xf $HunkArchive -C $HunkExtract
  $HunkExecutable = Get-ChildItem `
    -LiteralPath $HunkExtract `
    -Recurse `
    -Filter 'hunk.exe' |
    Select-Object -First 1
  Copy-Item `
    -LiteralPath $HunkExecutable.FullName `
    -Destination $BinDir `
    -Force
} finally {
  # 成功・失敗のどちらでも今回のdownload資材だけを削除する。
  Remove-Item `
    -LiteralPath $DownloadRoot `
    -Recurse `
    -Force `
    -ErrorAction SilentlyContinue
}

# 永続的なUser PATHへ実行file配置先を重複なく追加する。
$UserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (($UserPath -split ';') -notcontains $BinDir) {
  $UserPath = if ($UserPath) { "$UserPath;$BinDir" } else { $BinDir }
  [Environment]::SetEnvironmentVariable('Path', $UserPath, 'User')
}

# 現在のPowerShell sessionでも新しいcommandを直ちに利用可能にする。
if (($env:PATH -split ';') -notcontains $BinDir) {
  $env:PATH = "$BinDir;$env:PATH"
}
```

### ✅ 期待結果

- `$env:USERPROFILE\.local\bin`に`crane.exe`、`choose.exe`、`herdr.exe`、`hunk.exe`が存在します。
- 同directoryがUser環境変数`PATH`と現在のsessionの`PATH`へ追加されます。
- 今回作成した一時download directoryが削除されます。

### ❌ 失敗時

- HTTP errorの場合はGitHub Releasesへの接続とproxy設定を確認してください。
- Archive展開または実行file検出に失敗した場合は、対象releaseのasset名が変更されていないか確認してください。
- 失敗後に再実行しても、固定した実行file名だけが上書きされます。

## 4️⃣ 🐍 Python・Node.js packageを導入する

```powershell
# Python文書処理toolとGraphifyを現在のPython環境へ導入する。
python -m pip install `
  --upgrade `
  setuptools `
  wheel `
  python-docx `
  pypdf `
  Pillow `
  graphifyy

# OpenSpec CLIと動作確認用cowsayをglobal npm packageとして導入する。
npm install --global cowsay @fission-ai/openspec@latest
```

### ✅ 期待結果

- `pip`と`npm`が非zeroの終了codeを返さず、対象packageを利用できます。

### ❌ 失敗時

- `python`または`npm`が見つからない場合はPowerShellを開き直し、手順2のinstall結果を確認してください。
- Proxy環境では、組織で指定された`pip`と`npm`のregistry設定を確認してください。

## 5️⃣ 🧩 VS Code extensionを導入する

```powershell
# Zoo Code extensionをinstallまたは更新する。
code --install-extension ZooCodeOrganization.zoo-code --force

# EditorのMaterial Themeをinstallまたは更新する。
code --install-extension zhuangtongfa.Material-theme --force

# File icon用Material Icon Themeをinstallまたは更新する。
code --install-extension pkief.material-icon-theme --force
```

### ✅ 期待結果

- 各commandがextensionのinstall完了を表示します。

### ❌ 失敗時

- `code`が見つからない場合はPowerShellを開き直すか、VS Codeの`PATH`登録を確認してください。
- Marketplaceへ接続できない場合は、組織のproxyまたはextension配布方針を確認してください。

## 6️⃣ ✅ 導入結果を確認する

次のcommandを実行し、すべてのCLIが`PATH`から起動できることを確認します。

```powershell
python --version        # Python runtimeのversionを確認する。
python -m pip --version # Pythonが使用するpipのversionとpathを確認する。
node --version          # Node.js runtimeのversionを確認する。
npm --version           # npm clientのversionを確認する。
pwsh --version          # PowerShell 7のversionを確認する。
uv --version            # uv package managerのversionを確認する。
jq --version            # jq JSON processorのversionを確認する。
pandoc --version        # Pandoc document converterのversionを確認する。
crane version           # Crane container registry clientのversionを確認する。
bat --version           # bat file viewerのversionを確認する。
btm --version           # bottom process monitorのversionを確認する。
delta --version         # delta diff viewerのversionを確認する。
dust --version          # dust disk usage viewerのversionを確認する。
fd --version            # fd file finderのversionを確認する。
hyperfine --version     # hyperfine benchmark toolのversionを確認する。
rg --version            # ripgrep text search toolのversionを確認する。
zoxide --version        # zoxide directory navigatorのversionを確認する。
lsd --version           # lsd directory listing toolのversionを確認する。
broot --version         # broot directory navigatorのversionを確認する。
xh --version            # xh HTTP clientのversionを確認する。
sd --version            # sd text replacement toolのversionを確認する。
choose --version        # choose field selectorのversionを確認する。
genact --version        # genact activity generatorのversionを確認する。
herdr --version         # herdr CLIのversionを確認する。
hunk --version          # hunk diff toolのversionを確認する。
d2 version              # D2 diagram toolのversionを確認する。
code --version          # VS Codeのversionを確認する。
```

### 🎉 完了条件

- すべてのcommandが「command not found」や「認識されていません」を表示せず終了します。
- 手順3で導入した4つのCLIを新しいPowerShellでも起動できます。

### ❌ 失敗時

- 特定のcommandだけ見つからない場合は、対応するinstall手順を再実行してください。
- 手順3のCLIだけ見つからない場合は、新しいPowerShellを開き、User環境変数`PATH`に`%USERPROFILE%\.local\bin`が含まれることを確認してください。

## 📚 References

- [Microsoft Learn: wingetのインストール](https://learn.microsoft.com/ja-jp/windows/package-manager/winget/)
- [go-containerregistry releases](https://github.com/google/go-containerregistry/releases)
- [choose releases](https://github.com/theryangeary/choose/releases)
- [herdr releases](https://github.com/herdrdev/herdr/releases)
- [hunk releases](https://github.com/modem-dev/hunk/releases)
