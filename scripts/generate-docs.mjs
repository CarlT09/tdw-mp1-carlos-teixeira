import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ImageRun,
  AlignmentType,
  ShadingType,
} from "docx";

const mermaidCode = `flowchart TD
    subgraph S1 ["1. Validação em Paralelo (Todos os eventos)"]
        lint["ESLint (lint)"]
        format["Prettier (format)"]
        test["Vitest (test)"]
    end

    subgraph S2 ["2. Compilação (Build Once)"]
        build["Next.js Static Export (build)<br/><i>Gera pasta ./out como artefacto</i>"]
    end

    subgraph S3_Main ["3A. Produção (Apenas branch main)"]
        deploy["Cloudflare Workers (deploy)<br/><b>Deploy Oficial em Produção</b>"]
    end

    subgraph S3_PR ["3B. Pré-visualização (Apenas em PRs / MRs)"]
        ai["Gemini (ai-review)<br/><i>(Revisão do diff em PR/MR)</i>"]
        preview["Cloudflare Preview (preview)<br/><i>GitHub: bot comenta link no PR<br/>GitLab: botão nativo 'View app'</i>"]
        lh["Lighthouse CI (lighthouse)<br/><i>(Audita a Preview após HTTP 200)</i>"]
    end

    lint --> build
    format --> build
    test --> build

    build -->|Se for na branch main| deploy
    build -->|Se for em Pull Request / Merge Request| preview
    preview -->|Após link de preview ativo| lh
    ai -.->|Análise paralela no PR/MR| preview`;

async function fetchMermaidPng() {
  const cleanCode = mermaidCode
    .replace(/<br\/>/g, "\n")
    .replace(/<\/?i>/g, "")
    .replace(/<\/?b>/g, "");
  const b64 = Buffer.from(cleanCode, "utf8").toString("base64");
  const url = `https://mermaid.ink/img/${b64}?bgColor=white`;
  console.log("Fetching Mermaid PNG from mermaid.ink...");
  try {
    const res = await fetch(url);
    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      console.log("Mermaid PNG fetched successfully, bytes:", buffer.byteLength);
      return buffer;
    }
  } catch (err) {
    console.warn("Could not fetch from mermaid.ink:", err.message);
  }
  return null;
}

async function buildDocx(imageBuffer) {
  console.log("Building REPORT.docx...");

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Segoe UI",
            size: 21, // 10.5 pt
            color: "1A1A1A",
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1140, // ~20mm
              bottom: 1140,
              left: 1140,
              right: 1140,
            },
          },
        },
        children: [
          // Title
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: "Relatório Técnico: Implementação e Replicação de Pipeline CI/CD",
                bold: true,
                size: 32, // 16pt
                color: "0F172A",
              }),
            ],
          }),

          // Metadata
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: "Unidade Curricular: ",
                bold: true,
              }),
              new TextRun(
                "Tecnologias de Desenvolvimento Web (TDW) — Módulo 1A (2026/2027)"
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: "Autor: ", bold: true }),
              new TextRun("Carlos Teixeira"),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: "Repositório GitHub: ", bold: true }),
              new TextRun({
                text: "https://github.com/CarlT09/tdw-mp1-carlos-teixeira",
                color: "2563EB",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: "Repositório GitLab: ", bold: true }),
              new TextRun({
                text: "https://gitlab.com/tdw-mp1-group/tdw-mp1-carlos-teixeira",
                color: "2563EB",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "URL de Produção (Cloudflare Workers): ",
                bold: true,
              }),
              new TextRun({
                text: "https://tdw-mp1.carlosteixeira05.workers.dev",
                color: "2563EB",
              }),
            ],
          }),

          // 1. O Desafio
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: "1. O Desafio e o Objetivo do Trabalho",
                bold: true,
                size: 26,
                color: "1E3A8A",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun(
                "Neste trabalho, o objetivo foi construir a infraestrutura de automação (CI/CD) para levar uma aplicação Next.js (TypeScript) integrada com o Contentful Headless CMS até à produção no Cloudflare Workers."
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 180 },
            children: [
              new TextRun(
                "O foco esteve em aplicar boas práticas: usar branches de funcionalidade (feature branches), proteger a branch main com Pull Requests obrigatórios, validar a qualidade antes da compilação e replicar toda a lógica no GitLab CI/CD, comparando as duas plataformas."
              ),
            ],
          }),

          // 2. Escolha da 2a Plataforma
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: "2. Escolha da 2ª Plataforma: GitLab CI/CD",
                bold: true,
                size: 26,
                color: "1E3A8A",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun(
                "Para replicar a pipeline do GitHub Actions, escolhi o GitLab CI/CD por três razões:"
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [
              new TextRun(
                "É uma referência na indústria e no mercado de trabalho em DevOps."
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [
              new TextRun(
                "Tem uma abordagem distinta do GitHub: corre diretamente em contentores Docker (node:22) organizados por estágios (stages)."
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 180 },
            children: [
              new TextRun(
                "Possui suporte nativo a Review Apps (ambientes dinâmicos), permitindo comparar a gestão de pré-visualizações entre ecossistemas."
              ),
            ],
          }),

          // 3. Como Estruturei a Pipeline
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: "3. Como Estruturei a Pipeline de CI/CD",
                bold: true,
                size: 26,
                color: "1E3A8A",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun(
                "Em vez de correr todas as tarefas em fila indiana, estruturei a pipeline para otimizar o tempo de execução e garantir que nenhum código com erros chega a produção."
              ),
            ],
          }),

          // Diagram Image
          ...(imageBuffer
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 120, after: 180 },
                  children: [
                    new ImageRun({
                      data: imageBuffer,
                      transformation: {
                        width: 580,
                        height: 330,
                      },
                    }),
                  ],
                }),
              ]
            : []),

          // 3.1. Validações
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 180, after: 80 },
            children: [
              new TextRun({
                text: "3.1. Validações em Paralelo",
                bold: true,
                size: 23,
                color: "334155",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun(
                "Tanto no GitHub Actions (.github/workflows/ci.yml) como no GitLab (.gitlab-ci.yml), a pipeline começa por correr três verificações ao mesmo tempo:"
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [
              new TextRun({ text: "ESLint (lint): ", bold: true }),
              new TextRun(
                "Confirma se não há erros de sintaxe ou de regras de código."
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [
              new TextRun({ text: "Prettier (format): ", bold: true }),
              new TextRun(
                "Confirma se o estilo e a formatação do código estão consistentes."
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [
              new TextRun({ text: "Vitest (test): ", bold: true }),
              new TextRun("Corre os testes unitários."),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun(
                "O passo seguinte (build) só arranca se estes três trabalhos passarem com sucesso (através da instrução needs: [lint, format, test])."
              ),
            ],
          }),

          // 3.2. Build Once
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 180, after: 80 },
            children: [
              new TextRun({
                text: "3.2. Compilar uma só vez (Build Once)",
                bold: true,
                size: 23,
                color: "334155",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun(
                "Uma preocupação importante foi não perder tempo a compilar a aplicação várias vezes. No job build, o Next.js gera a versão estática do site para a pasta ./out (output: 'export'). Esta pasta é guardada como um artefacto da pipeline."
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun(
                "Depois, os jobs que precisam desses ficheiros (tanto o deploy de produção como o preview de teste) limitam-se a descarregar essa mesma pasta e a enviá-la para a Cloudflare através da ferramenta wrangler. Isto garante que aquilo que foi testado é exatamente aquilo que vai para a nuvem."
              ),
            ],
          }),

          // 3.3. Comportamento Diferenciado
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 180, after: 80 },
            children: [
              new TextRun({
                text: "3.3. Comportamento: Branch main vs. Branches de Teste (PR / MR)",
                bold: true,
                size: 23,
                color: "334155",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun(
                "A pipeline distingue de forma clara o destino das alterações para proteger a versão de produção:"
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: "Se o código for para a branch main: ",
                bold: true,
              }),
              new TextRun(
                "A pipeline avança do build diretamente para o job de deploy, atualizando o site oficial na Cloudflare Workers (https://tdw-mp1.carlosteixeira05.workers.dev). Os jobs de pré-visualização e auditoria são ignorados, pois a main é a versão estável final."
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: "Se estivermos numa branch que não a main (em Pull Request ou Merge Request): ",
                bold: true,
              }),
              new TextRun(
                "O deploy de produção é bloqueado. Em vez disso, a pipeline gera um ambiente de pré-visualização (preview) com um URL temporário na Cloudflare:"
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 1 },
            spacing: { after: 40 },
            children: [
              new TextRun({ text: "No GitHub Actions: ", bold: true }),
              new TextRun(
                "O bot automatizado (github-actions[bot]) publica um comentário diretamente na discussão do Pull Request com o link de teste."
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 1 },
            spacing: { after: 40 },
            children: [
              new TextRun({ text: "No GitLab CI/CD: ", bold: true }),
              new TextRun(
                "O GitLab ativa o seu mecanismo nativo de Review Apps, colocando logo no topo do Merge Request um botão interativo \"View app\" para abrir o site de teste sem encher o histórico de comentários."
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 1 },
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: "Auditoria com Lighthouse CI: ",
                bold: true,
              }),
              new TextRun(
                "Apenas nos PRs/MRs (e após o link de preview responder HTTP 200), o job lighthouse executa a auditoria de Performance, Acessibilidade e SEO sobre a URL de preview."
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 1 },
            spacing: { after: 120 },
            children: [
              new TextRun({ text: "Revisão IA: ", bold: true }),
              new TextRun(
                "O job ai-review analisa o diff do código com o Gemini exclusivamente durante o PR/MR."
              ),
            ],
          }),

          // 3.4. Gestão de Segredos e Gatilhos
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 180, after: 80 },
            children: [
              new TextRun({
                text: "3.4. Gestão de Segredos e Gatilhos",
                bold: true,
                size: 23,
                color: "334155",
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [
              new TextRun({ text: "Segredos: ", bold: true }),
              new TextRun(
                "Chaves de API (CLOUDFLARE_API_TOKEN, CONTENTFUL_ACCESS_TOKEN, GEMINI_API_KEY) foram configuradas em Secrets no GitHub e em variáveis mascaradas (Masked) no GitLab. Identificadores normais (CLOUDFLARE_ACCOUNT_ID, CONTENTFUL_SPACE_ID) ficaram como variáveis comuns."
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [
              new TextRun({ text: "Gatilho Contentful: ", bold: true }),
              new TextRun(
                "Quando crio ou edito um artigo no CMS, o Contentful dispara um webhook (repository_dispatch) que manda a pipeline reconstruir o site automaticamente."
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 180 },
            children: [
              new TextRun({ text: "Agendamento diário: ", bold: true }),
              new TextRun(
                "Configurei o cron para correr à meia-noite (0 0 * * *). Após confirmar que funcionava, comentei-o no YAML (com nota explicativa), cumprindo o pedido do enunciado para poupar minutos de CI/CD."
              ),
            ],
          }),

          // 4. Extras e Bónus
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: "4. Extras e Bónus Implementados",
                bold: true,
                size: 26,
                color: "1E3A8A",
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: "100% de Cobertura de Testes (Vitest): ",
                bold: true,
              }),
              new TextRun(
                "Configurei a medição de cobertura com o @vitest/coverage-v8 cobrindo 100% das linhas, funções e ramificações. Adicionei os badges no README.md do GitHub e configurei uma expressão regular no GitLab para mostrar os 100% no Merge Request."
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [
              new TextRun({ text: "Testes de Snapshot: ", bold: true }),
              new TextRun(
                "Adicionei testes de snapshot com Vitest no ficheiro constants.test.ts para garantir que configurações fixas não mudam por acidente."
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: "Auditoria com Lighthouse CI: ",
                bold: true,
              }),
              new TextRun(
                "Tanto no GitHub como no GitLab, adicionei um job que audita o link de preview na Cloudflare, avaliando Performance, Acessibilidade e SEO antes do merge."
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: "Revisor de Código com Inteligência Artificial (Google Gemini): ",
                bold: true,
              }),
              new TextRun(
                "Criei um script em Node.js (scripts/ai-review.mjs) que lê o diff do PR/MR e pede uma revisão técnica ao modelo gemini-2.0-flash. O script é independente de plataforma e corre da mesma forma no GitHub e no GitLab."
              ),
            ],
          }),

          // 5. Comparação Prática
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: "5. Comparação Prática: GitHub Actions vs. GitLab CI/CD",
                bold: true,
                size: 26,
                color: "1E3A8A",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun(
                "Ao replicar a pipeline no GitLab, notei diferenças evidentes no funcionamento de cada plataforma:"
              ),
            ],
          }),

          // Comparison Table
          createComparisonTable(),

          // 6. Problemas Reais
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: "6. Problemas Reais que Tive e Como Resolvi",
                bold: true,
                size: 26,
                color: "1E3A8A",
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: "Conflito de dependências no Node 22 com o Vitest: ",
                bold: true,
              }),
              new TextRun(
                "Ao correr npm ci dava erro de pacotes. Resolvi criando um ficheiro .npmrc com legacy-peer-deps=true e regerei o package-lock.json."
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: "Configuração da proteção de branch no GitHub: ",
                bold: true,
              }),
              new TextRun(
                "No início o merge ficava bloqueado porque tinha selecionado verificações manuais. Alinhei as regras com os nomes dos jobs (lint, format, test)."
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: "Tempo de espera do link de preview na Cloudflare: ",
                bold: true,
              }),
              new TextRun(
                "Quando o comando do Wrangler terminava, o URL às vezes demorava alguns segundos a responder na internet. Criei um ciclo de espera simples que faz pedidos até o site responder HTTP 200 antes de arrancar com o Lighthouse."
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: "Pipelines duplicadas no GitLab: ",
                bold: true,
              }),
              new TextRun(
                "Quando abri o Merge Request no GitLab, o preview não encontrava o build porque o GitLab estava a gerar duas pipelines ao mesmo tempo. Resolvi adicionando a diretiva workflow: rules: que unificou o fluxo."
              ),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: "Ajuste na API do Gemini: ",
                bold: true,
              }),
              new TextRun(
                "Inicialmente tive erros 404 porque o nome do modelo variava. Atualizei o script para interrogar a API sobre os modelos disponíveis na chave e aumentei o limite de tokens (maxOutputTokens: 2500) para a análise não ficar cortada."
              ),
            ],
          }),

          // 7. O que Aprendi e Conclusão
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: "7. O que Aprendi e Conclusão",
                bold: true,
                size: 26,
                color: "1E3A8A",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun(
                "Este trabalho permitiu-me perceber na prática como funciona uma pipeline profissional de CI/CD e porque é que estas ferramentas são fundamentais no dia a dia. Ao implementar tudo passo a passo, compreendi o valor de ter a certeza de que nenhum código com falhas chega a produção."
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun(
                "A experiência de replicar tudo no GitLab foi especialmente enriquecedora, provando que o essencial são os conceitos base: isolar tarefas, reutilizar artefactos, proteger credenciais e garantir processos repetíveis. Ambas as pipelines ficaram totalmente funcionais, verdes e com paridade completa."
              ),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const docxPath = path.resolve("REPORT.docx");
  fs.writeFileSync(docxPath, buffer);
  console.log(`Success! REPORT.docx generated at ${docxPath} (${buffer.length} bytes)`);
}

function createComparisonTable() {
  const tableData = [
    [
      "Aspeto",
      "GitHub Actions",
      "GitLab CI/CD",
    ],
    [
      "Estrutura",
      "Ficheiro baseado em eventos (on: push, pull_request).",
      "Ficheiro baseado em estágios (stages: validate, build, deploy).",
    ],
    [
      "Ambiente",
      "Corre em máquinas virtuais Ubuntu completas (runs-on: ubuntu-latest).",
      "Corre em contentores Docker limpos (image: node:22).",
    ],
    [
      "Cache de dependências",
      "Fácil de ativar através do cache: npm no setup-node.",
      "Definido manualmente indicando a pasta .npm/ e a chave baseada no package-lock.json.",
    ],
    [
      "Links de Teste (Preview)",
      "O bot comenta o link do preview na discussão do PR.",
      "O GitLab tem suporte nativo para Review Apps, colocando logo um botão 'View app' no Merge Request.",
    ],
    [
      "Controlo de Pipelines",
      "Cada job avalia os seus if: de forma independente.",
      "Foi necessário usar workflow: rules: no topo para evitar que o GitLab criasse duas pipelines concorrentes.",
    ],
    [
      "Variáveis Protegidas",
      "Os segredos ficam disponíveis em todas as branches por defeito.",
      "No GitLab há o visto 'Protect variable'; se ativo, as variáveis só vão para a main, falhando em branches.",
    ],
  ];

  const border = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: "CBD5E1",
  };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: border,
      bottom: border,
      left: border,
      right: border,
      insideHorizontal: border,
      insideVertical: border,
    },
    rows: tableData.map((row, rowIndex) => {
      const isHeader = rowIndex === 0;
      return new TableRow({
        tableHeader: isHeader,
        children: row.map((cellText, cellIndex) => {
          const widthPercent = cellIndex === 0 ? 25 : cellIndex === 1 ? 37 : 38;
          return new TableCell({
            width: { size: widthPercent, type: WidthType.PERCENTAGE },
            shading: isHeader
              ? { fill: "F1F5F9", type: ShadingType.CLEAR }
              : rowIndex % 2 === 1
              ? { fill: "FFFFFF", type: ShadingType.CLEAR }
              : { fill: "F8FAFC", type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 140, right: 140 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cellText,
                    bold: isHeader || cellIndex === 0,
                    size: 19, // 9.5pt
                    color: isHeader ? "0F172A" : "334155",
                  }),
                ],
              }),
            ],
          });
        }),
      });
    }),
  });
}

async function main() {
  const imageBuf = await fetchMermaidPng();
  await buildDocx(imageBuf);
}

main().catch(console.error);
