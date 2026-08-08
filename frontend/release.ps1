Write-Host "Building Android release APK..."
$ErrorActionPreference = "Stop"
$env:ANDROID_SDK_ROOT = "C:\Android"
$env:NODE_OPTIONS = "--max-old-space-size=8192"
if (-not (Test-Path -LiteralPath "android")) {
    Write-Host "Running expo prebuild..."
    npx expo prebuild
}
# Clean stale build artifacts in node_modules to avoid file lock issues
$staleDirs = @(
    "android\app\build"
)
foreach ($dir in $staleDirs) {
    if (Test-Path -LiteralPath $dir) {
        Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Cleaned: $dir"
    }
}
# Pre-create codegen directory structure to work around React Native codegen bug
$codegenDirs = @(
    "node_modules\react-native-screens\android\build\generated\source\codegen\jni\react\renderer\components\rnscreens",
    "node_modules\react-native-gesture-handler\android\build\generated\source\codegen\jni\react\renderer\components\rngesturehandler"
)
foreach ($dir in $codegenDirs) {
    New-Item -ItemType Directory -Path $dir -Force -ErrorAction SilentlyContinue | Out-Null
}
Set-Location -LiteralPath "android"
.\gradlew.bat assembleRelease
if ($LASTEXITCODE -ne 0) { throw "Build failed with exit code $LASTEXITCODE" }
Set-Location -LiteralPath ".."
Write-Host "Done! APK at: android\app\build\outputs\apk\release\app-release.apk"
