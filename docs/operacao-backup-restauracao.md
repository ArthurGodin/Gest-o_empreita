# Backup e restauracao do Prumo

Este runbook cobre as tabelas do produto e os arquivos do Supabase Storage. O
`supabase db dump` exclui schemas gerenciados, incluindo `auth` e `storage`.
Contas e credenciais de Auth dependem do backup gerenciado do Supabase ou do
fluxo oficial de migracao da plataforma; o pacote logico nao deve prometer essa
cobertura. O runbook nunca usa producao como destino de teste.

## Objetivos iniciais

- **RPO:** no maximo 24 horas de dados perdidos.
- **RTO:** voltar a operar em ate 4 horas.
- **Responsavel:** proprietario tecnico do Prumo.
- **Retencao:** 14 copias diarias, 8 semanais e 12 mensais.
- **Acesso:** somente o proprietario tecnico e um substituto formal.

## Camada 1: backup gerenciado

1. No Supabase, abra `Database > Backups` e confirme diariamente que existe
   uma copia recente.
2. Em projeto pago, confirme a retencao oferecida pelo plano. Habilite PITR
   quando o custo de perder ate 24 horas de vendas superar o custo do recurso.
3. Registre apenas data, horario, status e responsavel. Nao coloque dados de
   clientes, links de backup ou credenciais no Git.

Backups de banco do Supabase guardam metadados do Storage, mas nao os arquivos.
Por isso a camada logica abaixo tambem copia os objetos dos buckets.

## Camada 2: copia logica criptografada

### Preparacao unica

1. Instale Docker Desktop, Node.js, `psql`, Supabase CLI e `age`.
2. Dentro de `web`, execute `npm ci`.
3. Autentique e vincule o CLI ao projeto correto com `supabase login` e
   `supabase link --project-ref <PROJECT_REF>`.
4. Gere uma identidade `age` em maquina controlada. Guarde a chave privada em
   cofre de senhas e uma segunda copia offline. A rotina usa apenas o recipient
   publico, por exemplo `age1...`.
5. Escolha um destino privado e cifrado fora deste workspace. Nao use uma pasta
   sincronizada ou compartilhada sem controle de acesso.

### Execucao

```powershell
$env:PRUMO_BACKUP_AGE_RECIPIENT = "age1..."
.\ops\backup-supabase.ps1 -DestinationDirectory "E:\PrumoBackups"
```

O script:

- recusa destinos dentro do repositorio;
- exporta roles, schema e dados das tabelas do produto;
- compara os buckets remotos com `ops/storage-buckets.json`;
- recusa bucket remoto desconhecido ou bucket canonico ausente;
- baixa os arquivos dos buckets do Storage;
- inclui a configuracao versionada dos buckets no pacote;
- cria um pacote cifrado `.zip.age`;
- grava um checksum `.sha256`;
- apaga os arquivos temporarios em texto puro ao terminar;
- nao aceita senha de banco nem chave privada por argumento.

O formato atual e `prumo-supabase-logical-v3`. Ele inclui
`storage-buckets.json` com visibilidade, limite e MIME types dos buckets.
Pacotes v2 continuam verificaveis, mas sao identificados como legados porque
nao preservam essa configuracao.

O pacote registra explicitamente `managed-auth-schema` como excluido. Para uma
recuperacao do mesmo projeto, confirme tambem o backup gerenciado em
`Database > Backups`. Para migracao entre projetos, siga o procedimento oficial
do Supabase para Auth e espere que alguns usuarios precisem redefinir senha.

Agende a execucao diaria em uma maquina controlada e ligada, usando o Agendador
de Tarefas do Windows. Nao use GitHub Actions para transportar este backup.

## Verificacao diaria

1. Confirme que o `.zip.age` e o `.sha256` do dia existem e tem tamanho maior
   que zero.
2. Recalcule o SHA-256 e compare com o arquivo salvo:

```powershell
Get-FileHash "E:\PrumoBackups\prumo-supabase-AAAAMMDDTHHMMSSZ.zip.age" -Algorithm SHA256
```

3. Uma vez por semana, use a verificacao de conteudo e confirme que o resultado
   informa `storage_metadata: complete` e a quantidade esperada de buckets.
4. Apague a copia descriptografada logo apos a verificacao.

O verificador automatizado confere checksum sem a chave privada. Para tambem
inspecionar o conteudo, a identidade e informada somente por variavel:

```powershell
npm --prefix web run backup:verify -- --archive "E:\PrumoBackups\prumo-supabase-AAAAMMDDTHHMMSSZ.zip.age"
$env:PRUMO_BACKUP_AGE_IDENTITY = "E:\Chaves\prumo-age-key.txt"
npm --prefix web run backup:verify -- --archive "E:\PrumoBackups\prumo-supabase-AAAAMMDDTHHMMSSZ.zip.age"
```

## Ensaio mensal de restauracao

Use um projeto Supabase novo e descartavel, sem usuarios reais e sem integracao
Asaas. Nunca aponte estes comandos para producao.

1. Descriptografe e extraia o pacote fora do repositorio:

```powershell
age --decrypt --identity "E:\Chaves\prumo-age-key.txt" `
  --output "E:\PrumoRestore\backup.zip" `
  "E:\PrumoBackups\prumo-supabase-AAAAMMDDTHHMMSSZ.zip.age"
Expand-Archive "E:\PrumoRestore\backup.zip" "E:\PrumoRestore\conteudo"
```

2. Defina a connection string do projeto descartavel somente na sessao atual:

```powershell
$env:PRUMO_RESTORE_DB_URL = "postgresql://..."
```

3. Vincule o CLI ao projeto descartavel e configure as tres travas. O project
   ref de restore deve ser diferente do project ref de producao e deve
   corresponder ao banco informado:

```powershell
supabase link --project-ref "<REF_DESCARTAVEL>"
$env:PRUMO_RESTORE_CONFIRMATION = "DISPOSABLE_ONLY"
$env:PRUMO_RESTORE_PROJECT_REF = "<REF_DESCARTAVEL>"
$env:PRUMO_PRODUCTION_PROJECT_REF = "<REF_PRODUCAO>"
```

4. Execute o harness completo. Ele restaura banco, recria/upserta todos os
   buckets do inventario e envia os objetos encontrados:

```powershell
.\ops\test-restore-supabase.ps1 `
  -BundleDirectory "E:\PrumoRestore\conteudo" `
  -AllowRemoteDisposable `
  -StorageMode LinkedDisposable
```

O harness recusa producao, recusa divergencia entre banco e project ref e
recusa um CLI vinculado a outro projeto. Para um pacote v2, ele usa o inventario
canonico atual e registra `legacy_canonical` na evidencia.

5. Valide login de conta ficticia, empresas, clientes, orcamentos, obras,
   cobrancas, um PDF e uma foto do diario. Confirme que RLS continua ativa.
6. Registre data, duracao, resultado, falhas e responsavel, sem incluir PII.
7. Destrua o projeto de ensaio e apague todo material descriptografado.

Para um bundle ja descriptografado, o harness abaixo aceita banco local por
padrao, restaura o Storage local e recusa producao:

```powershell
$env:PRUMO_RESTORE_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/restore"
.\ops\test-restore-supabase.ps1 -BundleDirectory "E:\PrumoRestore\conteudo"
```

Use `-StorageMode Skip` apenas para diagnosticar o banco. O resultado sera
`partial_database_only` e nao conta como ensaio mensal completo.

## Resposta a incidente

1. Interrompa deploys e escritas destrutivas. Nao apague o projeto afetado.
2. Registre horario aproximado e tipo do incidente.
3. Escolha o ponto imediatamente anterior: PITR, backup diario ou copia logica.
4. Primeiro restaure e valide em ambiente isolado.
5. Se a restauracao de producao for necessaria, comunique indisponibilidade,
   restaure pelo Dashboard e valide Auth, RLS, Storage, webhook e checkout.
6. Troque credenciais caso haja suspeita de vazamento.
7. Depois da recuperacao, documente causa, impacto, perda real de dados e acao
   preventiva.

## Criterio de prontidao

O backup so e considerado operacional quando houver uma copia recente fora da
maquina de desenvolvimento, checksum valido e pelo menos um ensaio de
restauracao concluido nos ultimos 30 dias.
