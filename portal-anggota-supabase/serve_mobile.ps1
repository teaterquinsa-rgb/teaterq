# ==============================================================================
# SCRIPT PENGUJIAN MOBILE LOKAL & ONLINE - PORTAL TEATER Q
# ==============================================================================

param(
    [string]$Mode = "wifi" # "wifi", "tunnel", "server"
)

$ErrorActionPreference = "SilentlyContinue"

# 1. Dapatkan IP Address Lokal Komputer
$localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.InterfaceAlias -notmatch 'Loopback|vEthernet' -and $_.IPAddress -notmatch '^169\.' 
} | Select-Object -First 1).IPAddress

if (-not $localIp) {
    $localIp = "192.168.1.18"
}

# 2. Cek apakah Port 5500 (Live Server) sedang aktif
$port = 5500
$conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

$serverRunning = $false
if ($conn) {
    $serverRunning = $true
}

Clear-Host
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "      PENGUJIAN TAMPILAN PORTAL TEATER Q DI HP ANDA             " -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

if ($serverRunning) {
    Write-Host "[OK] Server lokal aktif di Port $port" -ForegroundColor Green
} else {
    Write-Host "[INFO] Menyiapkan server lokal otomatis pada Port $port..." -ForegroundColor Yellow
}

Write-Host "-----------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " IP Komputer Anda di Wi-Fi : " -NoNewline; Write-Host "$localIp" -ForegroundColor Green -BackgroundColor Black
Write-Host "-----------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

if ($Mode -eq "tunnel") {
    Write-Host "[MODE TUNNEL ONLINE AKTIF]" -ForegroundColor Magenta
    Write-Host "Menghubungkan ke tunnel online (bisa diakses HP via Kuota Internet)..." -ForegroundColor Yellow
    Write-Host "Tunggu sebentar sampai URL HTTPS muncul di bawah..." -ForegroundColor Gray
    Write-Host ""
    
    if (-not $serverRunning) {
        Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\serve_mobile.ps1`" -Mode server" -WindowStyle Hidden
        Start-Sleep -Seconds 2
    }
    
    ssh -p 443 -o StrictHostKeyChecking=no -R0:localhost:$port a.pinggy.io
    exit
}

if ($Mode -eq "server" -or (-not $serverRunning)) {
    Write-Host "Menjalankan Web Server Lokal di http://+:$port/ ..." -ForegroundColor Cyan
    Write-Host "Tekan CTRL+C untuk menghentikan server." -ForegroundColor DarkGray
    Write-Host ""
    
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://*:$port/")
    
    try {
        $listener.Start()
    } catch {
        $listener = New-Object System.Net.HttpListener
        $listener.Prefixes.Add("http://localhost:$port/")
        $listener.Prefixes.Add("http://$localIp`:$port/")
        try { $listener.Start() } catch {
            Write-Host "[PERINGATAN] Gagal bind: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    Start-Process "http://localhost:$port/mobile_hub.html"

    $mimeTypes = @{
        ".html" = "text/html; charset=utf-8"
        ".css"  = "text/css; charset=utf-8"
        ".js"   = "application/javascript; charset=utf-8"
        ".json" = "application/json; charset=utf-8"
        ".png"  = "image/png"
        ".jpg"  = "image/jpeg"
        ".jpeg" = "image/jpeg"
        ".svg"  = "image/svg+xml"
        ".ico"  = "image/x-icon"
    }

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($rawPath)) { $rawPath = "mobile_hub.html" }

        # Jembatan Fixie Proxy untuk VIP Reseller (Testing di HP & Laptop Bebas Error IP)
        if ($rawPath -match "^api-vip-proxy") {
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            $response.Headers.Add("Access-Control-Allow-Headers", "*")
            
            if ($request.HttpMethod -eq "OPTIONS") {
                $response.StatusCode = 200
                $response.Close()
                continue
            }

            try {
                $bodyReader = [System.IO.StreamReader]::new($request.InputStream, $request.ContentEncoding)
                $bodyText = $bodyReader.ReadToEnd()
                
                $targetUrl = "https://vip-reseller.co.id/api/prepaid"
                if ($rawPath -match "profile" -or $bodyText -match "type=profile") {
                    $targetUrl = "https://vip-reseller.co.id/api/profile"
                }

                $proxyUrl = "http://criterium.usefixie.com:80"
                $proxyUser = "fixie"
                $proxyPass = "UCtY46v5xSWlqFA"
                $wp = [System.Net.WebProxy]::new($proxyUrl)
                $wp.Credentials = [System.Net.NetworkCredential]::new($proxyUser, $proxyPass)

                $postBytes = [System.Text.Encoding]::UTF8.GetBytes($bodyText)
                $webReq = [System.Net.HttpWebRequest]::Create($targetUrl)
                $webReq.Proxy = $wp
                $webReq.Method = "POST"
                $webReq.ContentType = "application/x-www-form-urlencoded"
                $webReq.ContentLength = $postBytes.Length
                $webReq.Timeout = 20000

                $postStream = $webReq.GetRequestStream()
                $postStream.Write($postBytes, 0, $postBytes.Length)
                $postStream.Close()

                $vipResp = $webReq.GetResponse()
                $respReader = [System.IO.StreamReader]::new($vipResp.GetResponseStream())
                $respStr = $respReader.ReadToEnd()
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respStr)

                $response.ContentType = "application/json; charset=utf-8"
                $response.StatusCode = 200
                $response.ContentLength64 = $respBytes.Length
                $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
            } catch [System.Net.WebException] {
                $errResp = $_.Exception.Response
                if ($errResp) {
                    $errReader = [System.IO.StreamReader]::new($errResp.GetResponseStream())
                    $errStr = $errReader.ReadToEnd()
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes($errStr)
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.StatusCode = 200
                    $response.ContentLength64 = $errBytes.Length
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                } else {
                    $errJson = "{`"result`":false,`"message`":`"$($_.Exception.Message)`"}"
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes($errJson)
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.StatusCode = 500
                    $response.ContentLength64 = $errBytes.Length
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                }
            } catch {
                $errJson = "{`"result`":false,`"message`":`"$($_.Exception.Message)`"}"
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes($errJson)
                $response.ContentType = "application/json; charset=utf-8"
                $response.StatusCode = 500
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
            $response.Close()
            continue
        }

        $filePath = Join-Path $PSScriptRoot $rawPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $response.ContentType = $mime
            $response.Headers.Add("Access-Control-Allow-Origin", "*")

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 - File Not Found")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    }
    exit
}

# Jika server sudah aktif:
$mobileUrl = "http://${localIp}:${port}/mobile_hub.html"

Write-Host "LANGKAH UNTUK MENGETES DI HP:" -ForegroundColor Yellow
Write-Host "1. Pastikan HP terhubung ke Wi-Fi yang SAMA dengan laptop ini." -ForegroundColor White
Write-Host "2. Buka Browser (Chrome/Safari) di HP Anda, lalu ketik alamat ini:" -ForegroundColor White
Write-Host ""
Write-Host "   >> $mobileUrl <<" -ForegroundColor Green -BackgroundColor Black
Write-Host ""
Write-Host "3. ATAU Anda bisa langsung scan QR Code yang muncul di layar laptop!" -ForegroundColor White
Write-Host ""
Write-Host "DAFTAR TAUTAN LANGSUNG HALAMAN:" -ForegroundColor Cyan
Write-Host " - Beranda Portal    : http://${localIp}:${port}/index.html" -ForegroundColor Gray
Write-Host " - Mading Karya      : http://${localIp}:${port}/index.html#mading" -ForegroundColor Gray
Write-Host " - MUTER (Paperless) : http://${localIp}:${port}/index.html#muter" -ForegroundColor Gray
Write-Host " - Arsip Karya       : http://${localIp}:${port}/index.html#arsip" -ForegroundColor Gray
Write-Host " - Direktori Anggota : http://${localIp}:${port}/index.html#anggota" -ForegroundColor Gray
Write-Host " - Dana Abadi        : http://${localIp}:${port}/index.html#laporan-dana" -ForegroundColor Gray
Write-Host ""

# Otomatis buka browser di laptop untuk menampilkan QR Code
Write-Host "Membuka halaman Hub & QR Code di browser laptop..." -ForegroundColor DarkCyan
Start-Process "http://localhost:${port}/mobile_hub.html"

Write-Host ""
Write-Host "Selesai! Tekan sembarang tombol untuk keluar..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
