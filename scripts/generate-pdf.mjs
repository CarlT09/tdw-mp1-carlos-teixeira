import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

// Simple markdown to HTML converter tailored for REPORT.md
function markdownToHtml(md) {
  let html = md;

  // Extract metadata / title
  const lines = html.split("\n");
  let output = [];
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockContent = [];
  let inTable = false;
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        if (codeBlockLang === "mermaid") {
          output.push(
            `<pre class="mermaid">\n${codeBlockContent.join("\n")}\n</pre>`
          );
        } else {
          output.push(
            `<pre><code>${codeBlockContent.join("\n")}</code></pre>`
          );
        }
        inCodeBlock = false;
        codeBlockLang = "";
        codeBlockContent = [];
      } else {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
        codeBlockContent = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Tables
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      tableRows.push(line);
      inTable = true;
      continue;
    } else if (inTable) {
      // End of table, process it
      output.push(renderTable(tableRows));
      tableRows = [];
      inTable = false;
    }

    // Headers
    if (line.startsWith("# ")) {
      output.push(`<h1>${line.slice(2).trim()}</h1>`);
      continue;
    }
    if (line.startsWith("## ")) {
      output.push(`<h2>${line.slice(3).trim()}</h2>`);
      continue;
    }
    if (line.startsWith("### ")) {
      output.push(`<h3>${line.slice(4).trim()}</h3>`);
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---") {
      output.push(`<hr />`);
      continue;
    }

    // Unordered lists
    if (line.startsWith("* ") || line.startsWith("- ")) {
      output.push(`<li>${line.slice(2).trim()}</li>`);
      continue;
    }

    // Numbered lists
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      output.push(`<li>${numMatch[2].trim()}</li>`);
      continue;
    }

    // Paragraph
    if (line.trim().length > 0) {
      output.push(`<p>${line.trim()}</p>`);
    }
  }

  if (inTable && tableRows.length > 0) {
    output.push(renderTable(tableRows));
  }

  let finalHtml = output.join("\n");

  // Format list items into <ul>
  finalHtml = finalHtml.replace(/((?:<li>.*?<\/li>\s*)+)/gs, "<ul>$1</ul>");

  // Inline styling: bold, italic, code, links
  finalHtml = finalHtml.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  finalHtml = finalHtml.replace(/_(.*?)_/g, "<em>$1</em>");
  finalHtml = finalHtml.replace(/`([^`]+)`/g, "<code>$1</code>");
  finalHtml = finalHtml.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2">$1</a>'
  );

  return finalHtml;
}

function renderTable(rows) {
  if (rows.length < 2) return "";
  const header = rows[0]
    .split("|")
    .map((c) => c.trim())
    .filter(Boolean);
  const data = rows.slice(2).map((r) =>
    r
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean)
  );

  let html = '<table>\n<thead>\n<tr>';
  header.forEach((h) => (html += `<th>${h}</th>`));
  html += '</tr>\n</thead>\n<tbody>\n';
  data.forEach((row) => {
    html += '<tr>';
    row.forEach((cell) => (html += `<td>${cell}</td>`));
    html += '</tr>\n';
  });
  html += '</tbody>\n</table>';
  return html;
}

async function generatePdf() {
  const mdPath = path.resolve("REPORT.md");
  const pdfPath = path.resolve("REPORT.pdf");
  const tempHtmlPath = path.resolve("REPORT_TEMP.html");
  const tempUserData = path.resolve("temp_edge_pdf_" + Date.now());

  const mdContent = fs.readFileSync(mdPath, "utf8");
  const bodyHtml = markdownToHtml(mdContent);

  const fullHtml = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>Relatório Técnico - TDW MP1</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'neutral',
      flowchart: { curve: 'linear', useMaxWidth: true }
    });
  </script>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 20mm 16mm;
      @bottom-right {
        content: counter(page);
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.55;
      color: #1a1a1a;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    h1 {
      font-size: 19pt;
      color: #0f172a;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 6px;
      margin-top: 0;
      margin-bottom: 12px;
    }
    h2 {
      font-size: 13pt;
      color: #1e3a8a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-top: 18px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }
    h3 {
      font-size: 11pt;
      color: #334155;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    p {
      margin: 6px 0;
      text-align: justify;
    }
    ul, ol {
      margin: 6px 0;
      padding-left: 20px;
    }
    li {
      margin-bottom: 4px;
      text-align: justify;
    }
    hr {
      border: 0;
      border-top: 1px solid #e2e8f0;
      margin: 14px 0;
    }
    code {
      font-family: Consolas, "Liberation Mono", Menlo, Courier, monospace;
      font-size: 8.5pt;
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 4px;
      border-radius: 3px;
      border: 1px solid #e2e8f0;
    }
    pre {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px;
      overflow-x: auto;
      page-break-inside: avoid;
    }
    pre.mermaid {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      text-align: center;
      padding: 12px;
      margin: 12px 0;
      page-break-inside: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: left;
    }
    th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 600;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    a {
      color: #2563eb;
      text-decoration: none;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      font-size: 8pt;
      background: #e0f2fe;
      color: #0369a1;
      border-radius: 4px;
    }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

  fs.writeFileSync(tempHtmlPath, fullHtml, "utf8");
  console.log("HTML generated, invoking Edge for PDF printing...");

  const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

  const p = spawn(edge, [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    "--virtual-time-budget=4000",
    "--user-data-dir=" + tempUserData,
    "--print-to-pdf=" + pdfPath,
    "file:///" + tempHtmlPath.replace(/\\/g, "/"),
  ]);

  p.on("close", (code) => {
    try {
      fs.rmSync(tempUserData, { recursive: true, force: true });
      fs.unlinkSync(tempHtmlPath);
    } catch (e) {}

    if (fs.existsSync(pdfPath)) {
      const stats = fs.statSync(pdfPath);
      console.log(`Success! PDF created at ${pdfPath} (${stats.size} bytes)`);
    } else {
      console.error("PDF file was not created. Exit code:", code);
    }
  });
}

generatePdf().catch(console.error);
