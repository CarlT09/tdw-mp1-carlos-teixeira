import fs from "node:fs";
import path from "node:path";

const mermaidCode = `flowchart TD
    subgraph S1 ["1. Validação em Paralelo (Todos os eventos)"]
        lint["ESLint (lint)"]
        format["Prettier (format)"]
        test["Vitest (test)"]
    end

    subgraph S2 ["2. Compilação (Build Once)"]
        build["Next.js Static Export (build)\nGera pasta ./out como artefacto"]
    end

    subgraph S3_Main ["3A. Produção (Apenas branch main)"]
        deploy["Cloudflare Workers (deploy)\nDeploy Oficial em Produção"]
    end

    subgraph S3_PR ["3B. Pré-visualização (Apenas em PRs / MRs)"]
        ai["Gemini (ai-review)\nRevisão do diff em PR/MR"]
        preview["Cloudflare Preview (preview)\nGitHub: bot comenta link no PR | GitLab: botão 'View app'"]
        lh["Lighthouse CI (lighthouse)\nAudita a Preview após HTTP 200"]
    end

    lint --> build
    format --> build
    test --> build

    build -->|Se for na branch main| deploy
    build -->|Se for em Pull Request / Merge Request| preview
    preview -->|Após link de preview ativo| lh
    ai -.->|Análise paralela no PR/MR| preview`;

async function run() {
  const cleanCode = mermaidCode
    .replace(/<br\/>/g, "\n")
    .replace(/<\/?i>/g, "")
    .replace(/<\/?b>/g, "");
  const b64 = Buffer.from(cleanCode, "utf8").toString("base64");
  const url = `https://mermaid.ink/img/${b64}?bgColor=white`;
  console.log("Fetching Mermaid PNG from mermaid.ink...");

  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const arrayBuf = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  const p1 = path.resolve("pipeline-diagram.png");
  const p2 = path.resolve("../pipeline-diagram.png");
  const p3 = "C:/Users/dania/.gemini/antigravity/brain/bb8bb4e4-4197-4ce1-8d43-4927fc278691/pipeline-diagram.png";

  fs.writeFileSync(p1, buffer);
  try { fs.writeFileSync(p2, buffer); } catch(e){}
  try { fs.writeFileSync(p3, buffer); } catch(e){}

  console.log("Success! Saved PNG (size: " + buffer.length + " bytes) to:");
  console.log("1.", p1);
  console.log("2.", p2);
  console.log("3.", p3);
}

run().catch(console.error);
