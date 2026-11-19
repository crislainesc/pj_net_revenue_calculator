# Simulador de Faturamento Líquido PJ

Aplicação web estática para estimar a distribuição mensal do faturamento de uma empresa PJ entre pró-labore, INSS, DAS, contabilidade e valor disponível. Toda a interface está em português do Brasil e funciona em celular e desktop.

## Uso

Abra `index.html` no navegador ou acesse a versão publicada no GitHub Pages. Informe o faturamento bruto mensal ou use uma das sugestões rápidas. Os valores são recalculados na hora. Abra **Parâmetros e definição das regras** para simular outras taxas; as configurações ficam salvas no `localStorage` do navegador. Use **Copiar resumo** para copiar o detalhamento.

## Regras padrão

- Pró-labore simulado: 28% do faturamento bruto.
- INSS: 11% sobre o pró-labore calculado.
- DAS: 6% sobre o faturamento bruto, como simulação da faixa inicial do Anexo III.
- Contabilidade: R$ 168,00 fixos por mês.
- Custos e impostos diretos: INSS + DAS + contabilidade.
- Líquido após custos diretos: faturamento bruto menos INSS, DAS e contabilidade.
- Sobra após retirar o pró-labore integral: líquido após custos diretos menos pró-labore.

Esta é uma estimativa simplificada para planejamento. A tributação efetiva depende da atividade, do faturamento acumulado e do enquadramento. Confirme os valores com a contabilidade responsável.

## Publicação no GitHub Pages

O repositório esperado é `pj_net_revenue_calculator`. O workflow em `.github/workflows/deploy.yml` publica o conteúdo da raiz automaticamente quando há push para `main` (ou execução manual).

1. Crie no GitHub um repositório público chamado `pj_net_revenue_calculator`.
2. Envie este projeto para a branch `main`.
3. Nas configurações do repositório, abra **Pages** e selecione **GitHub Actions** como fonte de publicação.
4. Aguarde a execução do workflow. O endereço ficará no formato `https://SEU_USUARIO.github.io/pj_net_revenue_calculator/`.

Não há etapa de build: é um site estático HTML, CSS e JavaScript, servido diretamente pelo GitHub Pages.
