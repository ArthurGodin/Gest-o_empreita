param(
  [Parameter(Mandatory = $true)]
  [string]$BundleDirectory,

  [string]$DatabaseUrl = $env:PRUMO_RESTORE_DB_URL,

  [switch]$AllowRemoteDisposable,

  [ValidateSet("Auto", "Local", "LinkedDisposable", "Skip")]
  [string]$StorageMode = "Auto",

  [string]$RestoreProjectRef = $env:PRUMO_RESTORE_PROJECT_REF,

  [string]$EvidenceDirectory = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  throw "Defina PRUMO_RESTORE_DB_URL para um banco vazio e descartavel."
}

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$bundle = [IO.Path]::GetFullPath($BundleDirectory)
foreach ($required in @("roles.sql", "schema.sql", "data.sql", "manifest.json")) {
  if (-not (Test-Path -LiteralPath (Join-Path $bundle $required) -PathType Leaf)) {
    throw "Pacote incompleto: $required nao foi encontrado."
  }
}
$storageDirectory = Join-Path $bundle "storage"
if (-not (Test-Path -LiteralPath $storageDirectory -PathType Container)) {
  throw "Pacote incompleto: a pasta storage nao foi encontrada."
}

$manifest = Get-Content -Raw -LiteralPath (Join-Path $bundle "manifest.json") | ConvertFrom-Json
if ($manifest.format -notin @(
  "prumo-supabase-logical-v2",
  "prumo-supabase-logical-v3"
)) {
  throw "Formato de backup nao suportado para ensaio."
}

$metadataScope = "complete"
$bucketInventoryPath = Join-Path $bundle "storage-buckets.json"
if ($manifest.format -eq "prumo-supabase-logical-v3") {
  if (-not (Test-Path -LiteralPath $bucketInventoryPath -PathType Leaf)) {
    throw "Pacote v3 incompleto: storage-buckets.json nao foi encontrado."
  }
} else {
  $bucketInventoryPath = Join-Path $repoRoot "ops/storage-buckets.json"
  $metadataScope = "legacy_canonical"
}

$bucketInventory = Get-Content -Raw -LiteralPath $bucketInventoryPath | ConvertFrom-Json
if ($bucketInventory.version -ne 1 -or @($bucketInventory.buckets).Count -eq 0) {
  throw "Inventario de buckets invalido."
}
$buckets = @($bucketInventory.buckets)
$bucketIds = @($buckets | ForEach-Object { [string]$_.id })
if (@($bucketIds | Select-Object -Unique).Count -ne $bucketIds.Count) {
  throw "Inventario de buckets contem identificadores duplicados."
}

foreach ($bucket in $buckets) {
  $id = [string]$bucket.id
  $name = [string]$bucket.name
  if ($id -notmatch "^[a-z0-9][a-z0-9-]{0,99}$" -or $name -ne $id) {
    throw "Inventario de buckets contem identificador invalido."
  }
  if ($null -ne $bucket.file_size_limit -and [long]$bucket.file_size_limit -le 0) {
    throw "Inventario de buckets contem limite invalido."
  }
  if ($null -ne $bucket.allowed_mime_types) {
    foreach ($mime in @($bucket.allowed_mime_types)) {
      if ([string]$mime -notmatch "^[a-zA-Z0-9][a-zA-Z0-9.+-]*/[a-zA-Z0-9][a-zA-Z0-9.+*-]*$") {
        throw "Inventario de buckets contem MIME type invalido."
      }
    }
  }
}

$uri = [Uri]$DatabaseUrl
if ($uri.Scheme -notin @("postgres", "postgresql")) {
  throw "PRUMO_RESTORE_DB_URL nao usa protocolo PostgreSQL."
}

$hostName = $uri.Host.ToLowerInvariant()
$isLocal = $hostName -in @("localhost", "127.0.0.1", "::1")
$productionRef = $env:PRUMO_PRODUCTION_PROJECT_REF
if (-not $isLocal) {
  if (-not $AllowRemoteDisposable) {
    throw "Destino remoto recusado. Use um banco local ou autorize um projeto descartavel."
  }
  if ($env:PRUMO_RESTORE_CONFIRMATION -ne "DISPOSABLE_ONLY") {
    throw "Defina PRUMO_RESTORE_CONFIRMATION=DISPOSABLE_ONLY para o ensaio remoto."
  }
  if ([string]::IsNullOrWhiteSpace($productionRef)) {
    throw "Defina PRUMO_PRODUCTION_PROJECT_REF para proteger producao."
  }
  if ($hostName.Contains($productionRef.ToLowerInvariant())) {
    throw "Restauracao no projeto de producao foi recusada."
  }
}

$resolvedStorageMode = $StorageMode
if ($resolvedStorageMode -eq "Auto") {
  $resolvedStorageMode = $(if ($isLocal) { "Local" } else { "LinkedDisposable" })
}
if ($resolvedStorageMode -eq "Local" -and -not $isLocal) {
  throw "Storage local nao pode acompanhar um banco remoto."
}
if ($resolvedStorageMode -eq "LinkedDisposable" -and $isLocal) {
  throw "Storage remoto nao pode acompanhar um banco local neste ensaio."
}

$supabaseCli = Join-Path $repoRoot "web/node_modules/supabase/dist/supabase.js"
if ($resolvedStorageMode -ne "Skip") {
  $null = Get-Command node -ErrorAction Stop
  if (-not (Test-Path -LiteralPath $supabaseCli -PathType Leaf)) {
    throw "Supabase CLI local nao encontrado. Execute npm ci dentro de web."
  }
}

if ($resolvedStorageMode -eq "LinkedDisposable") {
  if ([string]::IsNullOrWhiteSpace($RestoreProjectRef)) {
    throw "Defina PRUMO_RESTORE_PROJECT_REF para o projeto remoto descartavel."
  }
  if ($RestoreProjectRef -notmatch "^[a-z0-9]{20}$") {
    throw "PRUMO_RESTORE_PROJECT_REF invalido."
  }
  if ($RestoreProjectRef -eq $productionRef) {
    throw "O project ref de restore nao pode ser o de producao."
  }

  $databaseContext = "$($uri.Host) $($uri.UserInfo)".ToLowerInvariant()
  if (-not $databaseContext.Contains($RestoreProjectRef.ToLowerInvariant())) {
    throw "O banco remoto nao corresponde ao project ref descartavel informado."
  }

  $linkedRefPath = Join-Path $repoRoot "supabase/.temp/project-ref"
  if (-not (Test-Path -LiteralPath $linkedRefPath -PathType Leaf)) {
    throw "O Supabase CLI nao esta vinculado ao projeto descartavel."
  }
  $linkedRef = (Get-Content -Raw -LiteralPath $linkedRefPath).Trim()
  if ($linkedRef -ne $RestoreProjectRef) {
    throw "O Supabase CLI esta vinculado a outro projeto."
  }
}

$null = Get-Command psql -ErrorAction Stop
$startedAt = [DateTime]::UtcNow
$temporaryDirectory = Join-Path ([IO.Path]::GetTempPath()) "prumo-restore-$([guid]::NewGuid().ToString('N'))"
$bucketSqlPath = Join-Path $temporaryDirectory "storage-buckets.sql"
$storageObjects = 0

function Invoke-Supabase {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

  & node $supabaseCli @Arguments --workdir $repoRoot
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase CLI falhou durante o restore de Storage."
  }
}

try {
  New-Item -ItemType Directory -Path $temporaryDirectory -Force | Out-Null

  & psql `
    --single-transaction `
    --variable ON_ERROR_STOP=1 `
    --file (Join-Path $bundle "roles.sql") `
    --file (Join-Path $bundle "schema.sql") `
    --command "SET session_replication_role = replica" `
    --file (Join-Path $bundle "data.sql") `
    --dbname $DatabaseUrl

  if ($LASTEXITCODE -ne 0) {
    throw "O ensaio de restauracao do banco falhou."
  }

  if ($resolvedStorageMode -ne "Skip") {
    $bucketSql = @()
    foreach ($bucket in $buckets) {
      $id = [string]$bucket.id
      $publicSql = $(if ([bool]$bucket.public) { "true" } else { "false" })
      $sizeSql = $(
        if ($null -eq $bucket.file_size_limit) {
          "null"
        } else {
          ([long]$bucket.file_size_limit).ToString(
            [Globalization.CultureInfo]::InvariantCulture
          )
        }
      )
      $mimeSql = "null::text[]"
      if ($null -ne $bucket.allowed_mime_types) {
        $quotedMimes = @(
          $bucket.allowed_mime_types |
            ForEach-Object { "'$([string]$_)'" }
        )
        $mimeSql = "array[$($quotedMimes -join ',')]::text[]"
      }

      $bucketSql += @"
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  '$id', '$id', $publicSql, $sizeSql, $mimeSql
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
"@
    }
    $bucketSql | Set-Content -LiteralPath $bucketSqlPath -Encoding utf8

    & psql `
      --single-transaction `
      --variable ON_ERROR_STOP=1 `
      --file $bucketSqlPath `
      --dbname $DatabaseUrl
    if ($LASTEXITCODE -ne 0) {
      throw "O ensaio nao conseguiu restaurar a configuracao do Storage."
    }

    $storageFlag = $(if ($resolvedStorageMode -eq "Local") { "--local" } else { "--linked" })
    foreach ($bucket in $buckets) {
      $bucketId = [string]$bucket.id
      $source = Join-Path $storageDirectory $bucketId
      if (-not (Test-Path -LiteralPath $source -PathType Container)) {
        continue
      }

      $files = @(Get-ChildItem -LiteralPath $source -File -Recurse)
      if ($files.Count -eq 0) {
        continue
      }
      $storageObjects += $files.Count

      Push-Location $source
      try {
        Invoke-Supabase storage cp $storageFlag --experimental --recursive . "ss:///$bucketId/"
      } finally {
        Pop-Location
      }
    }
  }
} finally {
  if (Test-Path -LiteralPath $temporaryDirectory) {
    Remove-Item -LiteralPath $temporaryDirectory -Recurse -Force
  }
}

$finishedAt = [DateTime]::UtcNow
if ([string]::IsNullOrWhiteSpace($EvidenceDirectory)) {
  $EvidenceDirectory = Join-Path ([IO.Path]::GetTempPath()) "prumo-restore-evidence"
}
$evidencePath = [IO.Path]::GetFullPath($EvidenceDirectory)
New-Item -ItemType Directory -Path $evidencePath -Force | Out-Null

$result = $(if ($resolvedStorageMode -eq "Skip") { "partial_database_only" } else { "restored" })
@{
  started_at_utc = $startedAt.ToString("o")
  finished_at_utc = $finishedAt.ToString("o")
  duration_seconds = [Math]::Round(($finishedAt - $startedAt).TotalSeconds, 2)
  format = $manifest.format
  target_scope = $(if ($isLocal) { "local" } else { "remote-disposable" })
  result = $result
  database = "restored"
  storage = $(if ($resolvedStorageMode -eq "Skip") { "skipped" } else { "restored" })
  storage_metadata_scope = $metadataScope
  storage_buckets = $buckets.Count
  storage_objects = $storageObjects
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $evidencePath "restore-result.json") -Encoding utf8

if ($resolvedStorageMode -eq "Skip") {
  Write-Output "Ensaio parcial: banco restaurado, Storage ignorado explicitamente."
} else {
  Write-Output "Ensaio completo concluido. Evidencia sanitizada: $evidencePath"
}
