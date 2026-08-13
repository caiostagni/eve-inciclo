# Modelos de contrato da CicloWay

Esta pasta guarda os **modelos** que o gerador de contratos usa. Cada modelo é um
contrato real, escrito uma vez, com **campos variáveis marcados** entre `{{ }}`.
Quando você pede um contrato, o gerador pergunta os valores, substitui os campos e
entrega um `.docx` pronto para revisão e assinatura.

## Como está organizado

```
contratos-template/
├── _dados-cicloway.yaml        ← dados fixos da CicloWay (preenche sozinho)
├── README.md                   ← este arquivo
└── <um-modelo-por-pasta>/
    ├── modelo.docx             ← o contrato com campos {{ }}
    └── campos.yaml             ← (opcional) perguntas, grupos e valores padrão
```

Cada subpasta = um tipo de contrato. O gerador lista todos e pergunta qual usar.

## Como criar um modelo novo (3 passos)

1. **Escreva o contrato no Word** como você normalmente faria, mas troque cada
   informação que muda de cliente para cliente por um campo entre chaves duplas:

   > A CONTRATADA, `{{CLIENTE_RAZAO_SOCIAL}}`, inscrita no CNPJ `{{CLIENTE_CNPJ}}`,
   > pagará o valor mensal de R$ `{{VALOR_MENSAL}}`...

   Use os dados fixos da CicloWay com o prefixo `CICLOWAY_` (ver `_dados-cicloway.yaml`):
   `{{CICLOWAY_RAZAO_SOCIAL}}`, `{{CICLOWAY_CNPJ}}`, `{{CICLOWAY_REPRESENTANTE}}`, etc.
   Esses preenchem automaticamente — você não precisa digitá-los a cada vez.

2. **Salve** o arquivo como `modelo.docx` dentro de uma pasta nova com o nome do tipo,
   ex.: `locacao-veiculos/modelo.docx`.

3. **(Opcional, recomendado)** Crie um `campos.yaml` ao lado para deixar as perguntas
   mais claras e definir valores padrão. Sem ele, o gerador detecta os `{{ }}` sozinho
   e pergunta cada um pelo nome. Modelo de `campos.yaml`:

   ```yaml
   tipo: "Locação de Veículos Elétricos"
   quando_usar: "Aluguel de veículos da CicloWay para empresas (B2B), por prazo determinado."
   cicloway_papel: CONTRATANTE        # a CicloWay é CONTRATANTE ou CONTRATADA neste contrato
   campos:
     - chave: CLIENTE_RAZAO_SOCIAL
       label: "Razão social do cliente"
       grupo: "Dados do cliente"
     - chave: VALOR_MENSAL
       label: "Valor mensal da locação (R$)"
       grupo: "Pagamento"
       default: ""
   ```

Veja os modelos já prontos (ex.: `locacao-padrao/`, `compra-e-venda/`) como referência.
Cada um tem o `origem.txt` (texto original) ao lado, para conferência.

## Regras dos campos `{{ }}`

- Use MAIÚSCULAS_COM_UNDERLINE: `{{VALOR_TOTAL}}`, `{{PRAZO_MESES}}`.
- O mesmo campo pode aparecer várias vezes — todas são preenchidas com o mesmo valor.
- `{{DATA_HOJE}}` é preenchido automaticamente com a data da geração.
- Campos `{{CICLOWAY_*}}` vêm do `_dados-cicloway.yaml`.

> ⚠️ Os contratos gerados são **rascunhos**. Revise (e idealmente passe pelo jurídico)
> antes de assinar.
