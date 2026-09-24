# Fonte oficial SINAPI

## Atualizacao mensal

`npm run sinapi:update`, executado a partir de `web`, procura o pacote XLSX mais
recente na CAIXA, confere tipo/tamanho/assinatura ZIP, valida layout, competencia
e contagens, mede a ocupacao do banco e so entao publica. Se qualquer etapa
falhar, a competencia anterior continua ativa. A origem e o SHA-256 ficam no
relatorio em `.sinapi/reports/`; os arquivos locais sao ignorados pelo Git.

O workflow `.github/workflows/sinapi-update.yml` roda nos dias 4, 11, 18 e 25
de cada mes e tambem manualmente. Para ativa-lo no GitHub, definir os secrets
`SINAPI_SUPABASE_URL` e `SINAPI_SUPABASE_SERVICE_ROLE_KEY` com os valores do
projeto de producao. Nao usar credenciais de Preview. Sem esses secrets, o job
falha sem alterar a base. Conferir o historico de Actions e notificacoes de
falha; o agendamento nao garante que a CAIXA ja publicou o mes corrente.

O importador pausa quando o tamanho atual do banco, somado a uma reserva para
a proxima competencia, ultrapassaria 400 MiB. No plano Free, isso evita uma
publicacao que possa esgotar o limite. Revisar capacidade e historico antes
de liberar novas competencias; releases antigas nao sao apagadas porque podem
estar referenciadas por orcamentos e catalogos existentes.

Registro da fonte usada para desenvolver e validar o importador. O pacote e os
XLSX ficam em `.sinapi/sources/` e nunca entram no Git.

## Pacote inspecionado

- Competencia: `2026-06`
- Fonte: pagina oficial SINAPI da CAIXA
- URL: `https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais/SINAPI-2026-06-formato-xlsx.zip`
- Arquivo: `SINAPI-2026-06-formato-xlsx.zip`
- Tamanho: `15.715.816` bytes
- SHA-256: `83A133D782A18CC091E95011829341659D1A599DC27DF90D63385BC296D925D9`

Arquivos no ZIP:

| Arquivo | Bytes |
| --- | ---: |
| `SINAPI_familias_e_coeficientes_2026_06.xlsx` | 559.768 |
| `SINAPI_Manutencoes_2026_06.xlsx` | 1.131.611 |
| `SINAPI_mao_de_obra_2026_06.xlsx` | 2.498.694 |
| `SINAPI_Referencia_2026_06.xlsx` | 13.487.075 |

Os nomes acima foram normalizados para ASCII somente nesta documentacao. O
pacote oficial usa acentos em alguns nomes.

## Workbook de referencia

Planilhas e dimensoes observadas, incluindo cabecalhos:

| Planilha | Linhas | Colunas | Uso |
| --- | ---: | ---: | --- |
| `Menu` | 21 | 4 | Competencia e navegacao |
| `Busca` | 12 | 3 | Apoio do workbook |
| `ISD`, `ICD`, `ISE` | 4.886 | 32 | Insumos nos tres regimes |
| `CSD`, `CCD`, `CSE` | 10.464 | 58 | Composicoes nos tres regimes |
| `Analitico` | 66.121 | 8 | Codigos e itens das composicoes |
| `Analitico com Custo` | 201 | 9 | Amostra oficial com custo |

O layout executavel esta em `layouts/caixa-2025.ts`. Os indices de linha e
coluna sao baseados em zero, como no array retornado por `read-excel-file`.

## Regras confirmadas

- `ISD/CSD`: sem desoneracao.
- `ICD/CCD`: com desoneracao.
- `ISE/CSE`: sem encargos sociais.
- Os 27 precos dos insumos comecam na coluna 5.
- Nas composicoes, cada UF ocupa o par `Custo` e `%AS` a partir da coluna 4.
- Nas abas sinteticas de composicoes, a coluna de codigo e uma formula que foi
  observada como zero. O importador deve cruzar cada linha, na mesma ordem, com
  os 10.454 cabecalhos canonicos da planilha `Analitico`.
- Grupo, descricao e unidade coincidiram em todas as 10.454 linhas do
  cruzamento inspecionado, sem chaves canonicas duplicadas.
- Custo zero com `%AS` vazio significa preco ausente. A UF deve ser omitida do
  mapa; nunca deve ser publicada como custo oficial de zero reais.
- As descricoes maximas observadas tinham 311 caracteres em insumos e 364 em
  composicoes, abaixo do limite interno de 500.

Toda nova competencia deve passar novamente pelas validacoes estruturais e de
contagem. Mudanca de layout exige um novo manifest; nao se corrige silenciosamente
o manifest existente.
