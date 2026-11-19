# Simulador de Faturamento Líquido PJ

Aplicação web em React para estimar a distribuição mensal do faturamento de uma empresa PJ entre pró-labore, INSS, DAS, contabilidade e valor disponível. Toda a interface está em português do Brasil e funciona em celular e desktop.

## Uso

Instale Node.js 22 ou superior e execute `npm ci` e `npm run dev`. Informe o faturamento bruto mensal ou use uma das sugestões rápidas. Os valores são recalculados na hora. Abra **Parâmetros e definição das regras** para ajustar o pró-labore, INSS, DAS e custo mensal de contabilidade; as configurações ficam salvas no `localStorage` do navegador. Use **Copiar resumo** para copiar o detalhamento.

## Regras padrão

- Pró-labore simulado: 28% do faturamento bruto.
- INSS: 11% sobre o pró-labore calculado.
- DAS: 6% sobre o faturamento bruto, como simulação da faixa inicial do Anexo III.
- Contabilidade: R$ 168,00 fixos por mês.
- Custos e impostos diretos: INSS + DAS + contabilidade.
- Transferência líquida do pró-labore: pró-labore bruto menos INSS.
- Distribuição de lucros prevista: faturamento bruto menos DAS, contabilidade e pró-labore bruto.
- Valor líquido previsto: transferência líquida do pró-labore mais distribuição de lucros.

Esta é uma estimativa simplificada para planejamento. A tributação efetiva depende da atividade, do faturamento acumulado e do enquadramento. Confirme os valores com a contabilidade responsável.

## Publicação no GitHub Pages

O repositório esperado é `pj_net_revenue_calculator`. O workflow em `.github/workflows/deploy.yml` instala as dependências, gera o bundle de produção e publica `dist` automaticamente quando há push para `main` (ou execução manual).

1. Crie no GitHub um repositório público chamado `pj_net_revenue_calculator`.
2. Envie este projeto para a branch `main`.
3. Nas configurações do repositório, abra **Pages** e selecione **GitHub Actions** como fonte de publicação.
4. Aguarde a execução do workflow. O endereço ficará no formato `https://SEU_USUARIO.github.io/pj_net_revenue_calculator/`.

O app usa React e Vite. O `base` do Vite está configurado para o caminho do repositório no GitHub Pages.

## Medidas contra injeção no navegador

- A interface usa renderização declarativa do React; nenhum valor do usuário ou do `localStorage` é inserido como HTML.
- Não usamos `dangerouslySetInnerHTML`, scripts de terceiros, fontes remotas ou dependências de runtime carregadas por CDN.
- A política CSP restringe scripts, estilos, conexões e recursos à própria origem, além de bloquear objetos e formulários externos.
- Valores restaurados do `localStorage` são verificados quanto ao tipo, finitude e limites antes de entrarem nos cálculos.

Estas medidas reduzem riscos de XSS no front-end, mas não substituem revisão contínua de dependências e atualizações de segurança.
