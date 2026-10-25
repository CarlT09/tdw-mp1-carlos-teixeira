import fs from "node:fs";

async function runReview() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not found. Skipping AI review.");
    return;
  }

  let diff = "";
  if (fs.existsSync("pr_diff.txt")) {
    diff = fs.readFileSync("pr_diff.txt", "utf8");
  }

  if (!diff || diff.trim().length === 0) {
    console.log("No git diff detected. Skipping review.");
    fs.writeFileSync(
      "review.md",
      "### 🤖 Gemini AI Code Review\n\nNão foram detetadas alterações de código para analisar neste Pull Request."
    );
    return;
  }

  // Truncate if diff is overly large to stay within context limits
  if (diff.length > 25000) {
    diff =
      diff.slice(0, 25000) + "\n\n... [diff truncado para respeitar limites]";
  }

  const prompt = `Analisa o seguinte git diff de um Pull Request para este projeto (Next.js 15, TypeScript, Contentful CMS, Cloudflare Workers e CI/CD com GitHub Actions).

\`\`\`diff
${diff}
\`\`\`
`;

  const systemInstruction = `És um engenheiro de software sénior especialista em Next.js, TypeScript e pipelines de CI/CD.
Faz uma revisão de código profissional, construtiva e concisa em Português para este Pull Request.
Usa formatação Markdown limpa com as seguintes secções:
### 🤖 Gemini AI Code Review
- **📋 Resumo das Alterações:** Breve resumo das mudanças efetuadas.
- **🛡️ Segurança & Segredos:** Verifica se foram expostos segredos, chaves de API ou falhas de segurança.
- **⚡ Qualidade de Código & Boas Práticas:** Avalia clareza, TypeScript, manutenibilidade e padrões Next.js.
- **✅ Parecer / Veredito:** Aprovação ou sugestões construtivas pontuais.
Mantém a resposta focada e elegante (máximo de 300 palavras).`;

  const models = ["gemini-2.5-flash", "gemini-1.5-flash"];
  let reviewText = "";

  for (const model of models) {
    try {
      console.log(`Calling Gemini API using model: ${model}...`);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1000,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(
          `Model ${model} failed with status ${response.status}: ${errorText}`
        );
        continue;
      }

      const data = await response.json();
      reviewText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reviewText) {
        console.log("Successfully generated AI code review!");
        break;
      }
    } catch (err) {
      console.warn(`Error with model ${model}:`, err);
    }
  }

  if (reviewText) {
    fs.writeFileSync("review.md", reviewText);
  } else {
    fs.writeFileSync(
      "review.md",
      "### 🤖 Gemini AI Code Review\n\nNão foi possível gerar a revisão automática da IA nesta execução."
    );
  }
}

runReview().catch((err) => {
  console.error("AI review runner failed:", err);
  process.exit(0); // Do not fail the entire pipeline if AI review encounters an issue
});
