param([int]$Port = 8080)
$ErrorActionPreference = 'Stop'
$siteRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "eCoach is ready at http://localhost:$Port/"
Write-Host 'Press Ctrl+C to stop.'
try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $relative = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath).TrimStart('/')
    if (-not $relative) { $relative = 'index.html' }
    $file = [System.IO.Path]::GetFullPath((Join-Path $siteRoot $relative))
    if (-not $file.StartsWith($siteRoot + [System.IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or -not [System.IO.File]::Exists($file)) {
      $context.Response.StatusCode = 404
      $context.Response.Close()
      continue
    }
    $types = @{ '.html' = 'text/html; charset=utf-8'; '.css' = 'text/css; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.svg' = 'image/svg+xml' }
    $mime = $types[[System.IO.Path]::GetExtension($file)]
    if (-not $mime) { $mime = 'application/octet-stream' }
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $context.Response.ContentType = $mime
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
  }
}
finally { $listener.Stop(); $listener.Close() }
