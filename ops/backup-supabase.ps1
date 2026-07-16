param(
  [Parameter(Mandatory = $true)]
  [string]$DestinationDirectory
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$destination = [IO.Path]::GetFullPath($DestinationDirectory)
$repoPrefix = $repoRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
$destinationPrefix = $destination.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar

if ($destination -eq $repoRoot -or $destinationPrefix.StartsWith($repoPrefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw "O destino do backup precisa ficar fora do workspace do Prumo."
}

$recipient = $env:PRUMO_BACKUP_AGE_RECIPIENT
if ([string]::IsNullOrWhiteSpace($recipient)) {
  throw "Defina PRUMO_BACKUP_AGE_RECIPIENT com a chave publica do age."
}

$null = Get-Command node -ErrorAction Stop
$age = Get-Command age -ErrorAction Stop
$supabaseCli = Join-Path $repoRoot "web/node_modules/supabase/dist/supabase.js"
if (-not (Test-Path -LiteralPath $supabaseCli)) {
  throw "Supabase CLI local nao encontrado. Execute npm ci dentro de web."
}

New-Item -ItemType Directory -Path $destination -Force | Out-Null
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) "prumo-backup-$timestamp-$([guid]::NewGuid().ToString('N'))"
$bundleDirectory = Join-Path $temporaryRoot "bundle"
$storageDirectory = Join-Path $bundleDirectory "storage"
$plainArchive = Join-Path $temporaryRoot "prumo-supabase-$timestamp.zip"
$encryptedArchive = Join-Path $destination "prumo-supabase-$timestamp.zip.age"
$checksumFile = "$encryptedArchive.sha256"

function Invoke-Supabase {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

  & node $supabaseCli @Arguments --workdir $repoRoot
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase CLI falhou: $($Arguments -join ' ')"
  }
}

try {
  New-Item -ItemType Directory -Path $storageDirectory -Force | Out-Null

  Invoke-Supabase db dump --linked --role-only --file (Join-Path $bundleDirectory "roles.sql")
  Invoke-Supabase db dump --linked --file (Join-Path $bundleDirectory "schema.sql")
  Invoke-Supabase db dump --linked --data-only --use-copy `
    --exclude "storage.buckets_vectors" `
    --exclude "storage.vector_indexes" `
    --file (Join-Path $bundleDirectory "data.sql")

  $bucketListJson = & node $supabaseCli storage ls --linked --experimental --workdir $repoRoot
  if ($LASTEXITCODE -ne 0) {
    throw "Nao foi possivel listar os buckets do Supabase Storage."
  }
  $bucketList = $bucketListJson | ConvertFrom-Json

  foreach ($bucketPath in $bucketList.paths) {
    $bucket = $bucketPath.TrimEnd("/")
    if ([string]::IsNullOrWhiteSpace($bucket)) { continue }

    $objectsJson = & node $supabaseCli storage ls --linked --experimental --recursive "ss:///$bucket" --workdir $repoRoot
    if ($LASTEXITCODE -ne 0) {
      throw "Nao foi possivel listar os objetos do bucket $bucket."
    }
    $objects = $objectsJson | ConvertFrom-Json
    $hasObjects = @($objects.paths | Where-Object { $_.TrimEnd("/") -ne $bucket }).Count -gt 0
    if (-not $hasObjects) { continue }

    Push-Location $storageDirectory
    try {
      Invoke-Supabase storage cp --linked --experimental --recursive "ss:///$bucket/" .
    } finally {
      Pop-Location
    }
  }

  @{
    created_at_utc = (Get-Date).ToUniversalTime().ToString("o")
    format = "prumo-supabase-logical-v1"
    includes = @("roles", "schema", "database-data", "storage-objects")
    encrypted_with = "age"
  } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $bundleDirectory "manifest.json") -Encoding utf8

  Compress-Archive -Path (Join-Path $bundleDirectory "*") -DestinationPath $plainArchive -CompressionLevel Optimal
  & $age.Source --recipient $recipient --output $encryptedArchive $plainArchive
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao criptografar o backup com age."
  }

  $checksum = (Get-FileHash -LiteralPath $encryptedArchive -Algorithm SHA256).Hash.ToLowerInvariant()
  "$checksum  $([IO.Path]::GetFileName($encryptedArchive))" |
    Set-Content -LiteralPath $checksumFile -Encoding ascii

  Write-Output "Backup criptografado: $encryptedArchive"
  Write-Output "Checksum SHA-256: $checksumFile"
} finally {
  if (Test-Path -LiteralPath $temporaryRoot) {
    Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
  }
}
