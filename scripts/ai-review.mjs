import fs from "node:fs";

async function runReview() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not found in environment.");
    return;
  }

  let diff = "";
  if (fs.existsSync("pr_diff.txt")) {
    diff = fs.readFileSync("pr_diff.txt", "utf8");
  }

  if (!diff || diff.trim().length === 0) {
    console.log("No git diff found.");
    fs.writeFileSync(
      "review.md",
      "### 🤖 Gemini AI Code Review\n\nNenhuma alteração de código detectada neste Pull Request."
    );
    return;
  }

  if (diff.length > 20000) {
    diff =
      diff.slice(0, 20000) + "\n\n... [diff truncado para respeitar limites]";
  }

  const prompt = `Age como um engenheiro de software sénior especialista em Next.js, TypeScript e pipelines de CI/CD.
Analisa este Pull Request (git diff) e faz uma revisão de código construtiva, profissional e concisa em Português:

\`\`\`diff
${diff}
\`\`\`

Estrutura o teu parecer com:
### 🤖 Gemini AI Code Review
- **📋 Resumo das Alterações:** Breve resumo do que foi alterado.
- **🛡️ Segurança & Segredos:** Confirma se não há tokens expostos ou falhas de segurança.
- **⚡ Qualidade & Boas Práticas:** Avalia estilo, padrões TypeScript e boas práticas de Next.js.
- **✅ Parecer Final:** Veredito e recomendações pontuais.`;

  const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
  let reviewText = "";

  for (const model of models) {
    try {
      console.log(`Calling Gemini API with model ${model}...`);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1000,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.warn(
          `Model ${model} returned HTTP ${response.status}: ${errorBody}`
        );
        continue;
      }

      const data = await response.json();
      reviewText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reviewText) {
        console.log(`Success with model ${model}!`);
        break;
      }
    } catch (err) {
      console.warn(`Error connecting with model ${model}:`, err);
    }
  }

  if (reviewText) {
    fs.writeFileSync("review.md", reviewText);
  } else {
    fs.writeFileSync(
      "review.md",
      "### 🤖 Gemini AI Code Review\n\nNão foi possível obter resposta da API do Gemini nesta execução."
    );
  }
}

runReview().catch((err) => {
  console.error("AI review script failed:", err);
});
