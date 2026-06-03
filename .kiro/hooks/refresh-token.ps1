# ============================================================
# Script: refresh-token.ps1
# Mo ta: Tu dong lay token moi tu AI-DLC Auth API va cap nhat vao
#        %USERPROFILE%\.kiro\settings\mcp.json
# ============================================================
$ErrorActionPreference = "Stop"

# --- Credentials ---
$Username = "tamnt167"
$Password = "12222004@Ain"

$AuthUrl = "https://ai-dlc.frt.vn/auth/token"
$McpConfig = Join-Path $env:USERPROFILE ".kiro\settings\mcp.json"
$TokenCache = Join-Path $env:USERPROFILE ".kiro\.token-cache.json"

# --- Kiem tra token cache con han khong (> 30 phut thi bo qua) ---
if (Test-Path $TokenCache) {
    try {
        $Cache = Get-Content $TokenCache -Raw | ConvertFrom-Json
        $CachedAt = $Cache.cached_at
        $ExpiresIn = $Cache.expires_in
        $Now = [int][double]::Parse((Get-Date -UFormat %s))
        $Remaining = ($CachedAt + $ExpiresIn) - $Now

        if ($Remaining -gt 1800) {
            $RemainMin = [math]::Floor($Remaining / 60)
            Write-Host "Token con han (~$RemainMin phut), bo qua refresh." -ForegroundColor Green
            exit 0
        }
    } catch {}
}

Write-Host "Dang lay token moi cho user: $Username ..." -ForegroundColor Cyan

# --- Lay token tu AI-DLC Auth API ---
$Body = @{
    username = $Username
    password = $Password
} | ConvertTo-Json

try {
    $Response = Invoke-RestMethod -Method Post -Uri $AuthUrl `
        -ContentType "application/json" `
        -Body $Body
} catch {
    Write-Host "Lay token that bai: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$NewToken = $Response.access_token
$ExpiresIn = $Response.expires_in

if (-not $NewToken) {
    Write-Host "Lay token that bai. Khong co access_token trong response." -ForegroundColor Red
    exit 1
}

Write-Host "Lay token thanh cong! (expires_in: $ExpiresIn giay)" -ForegroundColor Green

# --- Luu token cache ---
$Now = [int][double]::Parse((Get-Date -UFormat %s))
$CacheData = @{
    cached_at = $Now
    expires_in = $ExpiresIn
}
$CacheData | ConvertTo-Json | Out-File -FilePath $TokenCache -Encoding utf8

# --- Cap nhat vao mcp.json ---
if (-not (Test-Path $McpConfig)) {
    Write-Host "Khong tim thay file: $McpConfig" -ForegroundColor Red
    exit 1
}

$Config = Get-Content $McpConfig -Raw | ConvertFrom-Json
$Updated = $false

foreach ($server in $Config.mcpServers.PSObject.Properties.Value) {
    if ($server.headers -and $server.headers.PSObject.Properties["Authorization"]) {
        $server.headers.Authorization = "Bearer $NewToken"
        $Updated = $true
    }
}

if (-not $Updated) {
    Write-Host "Khong tim thay truong Authorization trong mcp.json." -ForegroundColor Yellow
    exit 1
}

$JsonOutput = $Config | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($McpConfig, $JsonOutput, [System.Text.Encoding]::UTF8)

Write-Host "Da cap nhat token vao: $McpConfig" -ForegroundColor Green
Write-Host "Hoan tat!" -ForegroundColor Green
