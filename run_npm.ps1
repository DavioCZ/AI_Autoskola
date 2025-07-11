# run_npm.ps1
# Prepends Node.js to PATH and executes the given npm command.
# Usage: powershell -ExecutionPolicy Bypass -File run_npm.ps1 <npm_subcommand_and_args>
# Example: powershell -ExecutionPolicy Bypass -File run_npm.ps1 init -y

param(
    [Parameter(Mandatory=$false, ValueFromRemainingArguments=$true)]
    [string[]]$npmArgs
)

$NodePath = 'D:\OneDrive - SATRA, spol. s r.o\PRIV\VSC\Node.js\node-v22.16.0-win-x64'
$env:PATH = "$NodePath;" + $env:PATH

# Check if npm is now found
$npmExePath = Get-Command npm -ErrorAction SilentlyContinue
if ($null -eq $npmExePath) {
    Write-Error "npm command not found even after attempting to set PATH. NodePath: $NodePath. Current PATH: $env:PATH"
    exit 1
}

Write-Host "Using npm at: $($npmExePath.Source)"

if ($npmArgs.Length -gt 0) {
    Write-Host "Executing: npm.cmd $npmArgs"
    # Execute npm.cmd with the provided arguments
    & npm.cmd $npmArgs
} else {
    Write-Host "npm path configured. Ready to receive npm commands."
    # You could also launch a new pwsh session here if desired for interactive use
    # pwsh
}
