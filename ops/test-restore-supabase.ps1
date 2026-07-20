param(
  [Parameter(Mandatory = $true)]
  [string]$BundleDirectory,

  [string]$DatabaseUrl = $env:PRUMO_RESTORE_DB_URL,

  [switch]$AllowRemoteDisposable,

  [string]$EvidenceDirectory = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  throw "Defina PRUMO_RESTORE_DB_URL para um banco vazio e descartavel."
}

$bundle = [IO.Path]::GetFullPath($BundleDirectory)
foreach ($required in @("roles.sql", "schema.sql", "data.sql", "manifest.json")) {
  if (-not (Test-Path -LiteralPath (Join-Path $bundle $required) -PathType Leaf)) {
    throw "Pacote incompleto: $required nao foi encontrado."
  }
}

$uri = [Uri]$DatabaseUrl
if ($uri.Scheme -notin @("postgres", "postgresql")) {
  throw "PRUMO_RESTORE_DB_URL nao usa protocolo PostgreSQL."
}

$hostName = $uri.Host.ToLowerInvariant()
$isLocal = $hostName -in @("localhost", "127.0.0.1", "::1")
if (-not $isLocal) {
  if (-not $AllowRemoteDisposable) {
    throw "Destino remoto recusado. Use um banco local ou autorize um projeto descartavel."
  }
  if ($env:PRUMO_RESTORE_CONFIRMATION -ne "DISPOSABLE_ONLY") {
    throw "Defina PRUMO_RESTORE_CONFIRMATION=DISPOSABLE_ONLY para o ensaio remoto."
  }
  $productionRef = $env:PRUMO_PRODUCTION_PROJECT_REF
  if ([string]::IsNullOrWhiteSpace($productionRef)) {
    throw "Defina PRUMO_PRODUCTION_PROJECT_REF para proteger producao."
  }
  if ($hostName.Contains($productionRef.ToLowerInvariant())) {
    throw "Restauracao no projeto de producao foi recusada."
  }
}

$manifest = Get-Content -Raw -LiteralPath (Join-Path $bundle "manifest.json") | ConvertFrom-Json
if ($manifest.format -ne "prumo-supabase-logical-v2") {
  throw "Formato de backup nao suportado para ensaio."
}

$null = Get-Command psql -ErrorAction Stop
$startedAt = [DateTime]::UtcNow

& psql `
  --single-transaction `
  --variable ON_ERROR_STOP=1 `
  --file (Join-Path $bundle "roles.sql") `
  --file (Join-Path $bundle "schema.sql") `
  --command "SET session_replication_role = replica" `
  --file (Join-Path $bundle "data.sql") `
  --dbname $DatabaseUrl

if ($LASTEXITCODE -ne 0) {
  throw "O ensaio de restauracao falhou."
}

$finishedAt = [DateTime]::UtcNow
if ([string]::IsNullOrWhiteSpace($EvidenceDirectory)) {
  $EvidenceDirectory = Join-Path ([IO.Path]::GetTempPath()) "prumo-restore-evidence"
}
$evidencePath = [IO.Path]::GetFullPath($EvidenceDirectory)
New-Item -ItemType Directory -Path $evidencePath -Force | Out-Null

@{
  started_at_utc = $startedAt.ToString("o")
  finished_at_utc = $finishedAt.ToString("o")
  duration_seconds = [Math]::Round(($finishedAt - $startedAt).TotalSeconds, 2)
  format = $manifest.format
  target_scope = $(if ($isLocal) { "local" } else { "remote-disposable" })
  result = "restored"
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $evidencePath "restore-result.json") -Encoding utf8

Write-Output "Ensaio concluido. Evidencia sanitizada: $evidencePath"
