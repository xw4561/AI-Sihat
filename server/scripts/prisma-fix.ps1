<#
PowerShell helper to fix Prisma `EPERM: rename ... query_engine-windows.dll.node.tmp` errors on Windows.
Usage (from repo root):
  cd server
  # run in an elevated PowerShell if possible
  .\scripts\prisma-fix.ps1

The script will:
 - show processes listening on port 3000
 - optionally stop all `node` processes
 - remove `node_modules/.prisma/client` under the server folder
 - run `npx prisma generate`

Use carefully — stopping node processes will terminate any running Node servers.
#>

param(
  [int] $Port = 3000
)

Write-Host "Prisma Windows EPERM helper — port=$Port"

# Show netstat results for the port
Write-Host "\nChecking processes listening on port $Port..."
$net = netstat -ano | Select-String ":$Port"
if ($net) { $net | ForEach-Object { Write-Host $_ } } else { Write-Host "No processes found listening on port $Port." }

# Offer to stop Node processes
$nodeProcs = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcs) {
  Write-Host "\nFound node processes:" -ForegroundColor Yellow
  $nodeProcs | Format-Table Id,ProcessName,StartTime -AutoSize
  $stop = Read-Host "Stop all node processes? (y/N)"
  if ($stop -eq 'y') {
    Write-Host "Stopping node processes..."
    $nodeProcs | Stop-Process -Force
  } else {
    Write-Host "Skipping stopping node processes. Ensure no process is locking Prisma files." -ForegroundColor Yellow
  }
} else {
  Write-Host "No node processes found." -ForegroundColor Green
}

# Remove Prisma client folder if it exists
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$serverRoot = Resolve-Path (Join-Path $scriptDir "..")
$prismaClientPath = Join-Path $serverRoot "node_modules\.prisma\client"

if (Test-Path $prismaClientPath) {
  Write-Host "\nRemoving Prisma client folder: $prismaClientPath" -ForegroundColor Cyan
  try {
    Remove-Item -LiteralPath $prismaClientPath -Recurse -Force -ErrorAction Stop
    Write-Host "Removed Prisma client folder." -ForegroundColor Green
  } catch {
    Write-Host "Failed to remove Prisma client folder: $_" -ForegroundColor Red
    Write-Host "You may need to run this script as Administrator or stop processes locking the files." -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "Prisma client folder not found at: $prismaClientPath" -ForegroundColor Yellow
}

# Run prisma generate
Push-Location $serverRoot
Write-Host "\nRunning: npx prisma generate" -ForegroundColor Cyan
try {
  npx prisma generate
} catch {
  Write-Host "npx prisma generate failed: $_" -ForegroundColor Red
  Write-Host "If you still see an EPERM error, try running PowerShell as Administrator and disable antivirus/exclusions for the folder." -ForegroundColor Yellow
  Pop-Location
  exit 1
}
Pop-Location

Write-Host "\nDone. If generation succeeded, start your server again." -ForegroundColor Green
