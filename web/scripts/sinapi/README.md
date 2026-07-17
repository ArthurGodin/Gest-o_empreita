# Fonte oficial SINAPI

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
