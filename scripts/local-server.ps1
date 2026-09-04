$ErrorActionPreference = 'Stop'
$siteRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$serverAddress = [Net.IPAddress]::Parse('127.0.0.1')
$server = [Net.Sockets.TcpListener]::new($serverAddress, 4173)

try {
  $server.Start()
} catch {
  Write-Host 'Le site semble déjà ouvert sur http://localhost:4173/'
  Read-Host 'Appuyez sur Entrée pour fermer cette fenêtre'
  exit 1
}

Write-Host ''
Write-Host '  LES IMMORTELLES' -ForegroundColor Yellow
Write-Host '  Site local actif : http://localhost:4173/'
Write-Host '  Gardez cette fenêtre ouverte pendant la visite.'
Write-Host ''

$mimeTypes = @{
  '.html' = 'text/html; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'
  '.js' = 'text/javascript; charset=utf-8'
  '.webp' = 'image/webp'
  '.png' = 'image/png'
  '.svg' = 'image/svg+xml'
}

try {
  while ($true) {
    $client = $server.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      while (-not [string]::IsNullOrEmpty($reader.ReadLine())) {}

      $requestTarget = if ($requestLine) { ($requestLine -split ' ')[1] } else { '/' }
      $relativePath = [Uri]::UnescapeDataString(($requestTarget -split '\?')[0].TrimStart('/'))
      if ([string]::IsNullOrWhiteSpace($relativePath)) { $relativePath = 'index.html' }
      if ($relativePath.StartsWith('images/')) { $relativePath = 'public/' + $relativePath }
      if ($relativePath -in @('favicon.svg', 'og.png')) { $relativePath = 'public/' + $relativePath }

      $absolutePath = [IO.Path]::GetFullPath((Join-Path $siteRoot $relativePath))
      $found = $absolutePath.StartsWith($siteRoot, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $absolutePath -PathType Leaf)
      if ($found) {
        $content = [IO.File]::ReadAllBytes($absolutePath)
        $extension = [IO.Path]::GetExtension($absolutePath).ToLowerInvariant()
        $contentType = if ($mimeTypes.ContainsKey($extension)) { $mimeTypes[$extension] } else { 'application/octet-stream' }
        $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($content.Length)`r`nConnection: close`r`n`r`n"
      } else {
        $content = [Text.Encoding]::UTF8.GetBytes('Introuvable')
        $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($content.Length)`r`nConnection: close`r`n`r`n"
      }

      $headerBytes = [Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      $stream.Write($content, 0, $content.Length)
      $stream.Flush()
    } finally {
      $client.Close()
    }
  }
} finally {
  $server.Stop()
}
