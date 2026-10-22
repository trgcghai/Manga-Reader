@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference = 'Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; $root = [IO.Path]::GetFullPath($env:SCRIPT_DIR); $result = Join-Path $root '_result'; New-Item -ItemType Directory -Path $result -Force | Out-Null; $folders = @(Get-ChildItem -LiteralPath $root -Directory | Where-Object { $_.Name -ne '_result' }); foreach ($folder in $folders) { $archive = Join-Path $result ($folder.Name + '.zip'); if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }; [IO.Compression.ZipFile]::CreateFromDirectory($folder.FullName, $archive, [IO.Compression.CompressionLevel]::Fastest, $true); Write-Host ('Created ' + $archive) }; if ($folders.Count -eq 0) { Write-Host 'No folders found to zip.' }"

if errorlevel 1 (
    echo Failed to create one or more ZIP files.
    exit /b 1
)

echo Done.
endlocal
