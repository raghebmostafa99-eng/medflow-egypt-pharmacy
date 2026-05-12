$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8080/")
$listener.Start()
Write-Host "Server running on http://localhost:8080/"
$root = "d:\my portfolio\pharmacy-sales-system"

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $path = $ctx.Request.Url.LocalPath
    if ($path -eq "/") { $path = "/index.html" }
    $file = Join-Path $root $path.TrimStart("/")
    
    if (Test-Path $file) {
        $bytes = [System.IO.File]::ReadAllBytes($file)
        $ext = [System.IO.Path]::GetExtension($file)
        $ct = switch ($ext) {
            ".html" { "text/html;charset=utf-8" }
            ".css"  { "text/css;charset=utf-8" }
            ".js"   { "application/javascript;charset=utf-8" }
            ".json" { "application/json;charset=utf-8" }
            ".png"  { "image/png" }
            ".svg"  { "image/svg+xml" }
            default { "application/octet-stream" }
        }
        $ctx.Response.ContentType = $ct
        $ctx.Response.ContentLength64 = $bytes.Length
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $ctx.Response.StatusCode = 404
        $bytes = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    $ctx.Response.Close()
}
