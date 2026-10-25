# Relatório Técnico: Implementação e Replicação de Pipeline CI/CD

**Unidade Curricular:** Tecnologias de Desenvolvimento Web (TDW) — Módulo 1A (2026/2027)  
**Autor:** Carlos Teixeira  
**Repositório GitHub:** [https://github.com/CarlT09/tdw-mp1-carlos-teixeira](https://github.com/CarlT09/tdw-mp1-carlos-teixeira)  
**Repositório GitLab:** [https://gitlab.com/tdw-mp1-group/tdw-mp1-carlos-teixeira](https://gitlab.com/tdw-mp1-group/tdw-mp1-carlos-teixeira)  
**URL de Produção (Cloudflare Workers):** [https://tdw-mp1.carlosteixeira05.workers.dev](https://tdw-mp1.carlosteixeira05.workers.dev)

---

## 1. Introdução e Apresentação do Desafio

O presente projeto teve como objetivo conceber, implementar e replicar uma infraestrutura completa de Integração Contínua e Entrega Contínua (CI/CD) para uma aplicação web moderna baseada em Next.js (TypeScript) integrada com o Contentful Headless CMS e alojada na infraestrutura de _edge computing_ do Cloudflare Workers.

O desafio exigiu o cumprimento rigoroso das melhores práticas de engenharia de software: desenvolvimento guiado por branches de funcionalidade (_feature branches_), proteção da branch principal (`main`), automação de validações estáticas e testes unitários, estratégia de compilação única (_Build Once, Deploy Anywhere_), criação automática de ambientes de pré-visualização (_preview_) para cada proposta de alteração e replicação integral da solução numa segunda plataforma de CI/CD, garantindo portabilidade e resiliência operacional.

---

## 2. Escolha da Segunda Plataforma: GitLab CI/CD

Para cumprir o requisito de replicação da pipeline, selecionou-se o **GitLab CI/CD**. A escolha fundamentou-se em três pilares técnicos:

1. **Maturidade e Adoção Corporativa:** O GitLab é uma das referências mundiais em soluções completas de DevOps, sendo amplamente adotado em ambientes empresariais devido à sua orquestração nativa de pipelines em contentores Docker.
2. **Diferenciação Arquitetural:** Ao contrário do GitHub Actions, cujo modelo se baseia em fluxos de trabalho orientados a eventos e blocos reutilizáveis (_actions_), o GitLab CI/CD assenta numa especificação puramente declarativa por estágios (`stages`) executados sobre contentores limpos (`node:22`).
3. **Gestão Nativa de Ambientes (_Review Apps_):** O GitLab oferece suporte de primeira classe a ambientes dinâmicos e rastreio de implementações, permitindo comparar de forma enriquecedora o mecanismo de pré-visualizações face ao ecossistema do GitHub.

---

## 3. Arquitetura da Pipeline e Estratégia de CI/CD

A pipeline foi desenhada segundo uma arquitetura de Grafo Acíclico Dirigido (DAG), otimizando tempos de execução através da paralelização de tarefas e eliminando bloqueios desnecessários.

```
       [lint] -------\
      [format] --------> [build] ------> [deploy] (apenas na main)
       [test] -------/      \
                             \---------> [preview] ------> [lighthouse] (apenas em PRs/MRs)
   [ai-review] -----------------------/
```

### 3.1. Paralelismo e DAG (`needs`)

Tanto no GitHub Actions (`.github/workflows/ci.yml`) como no GitLab CI/CD (`.gitlab-ci.yml`), a fase de validação executa três verificações em simultâneo:

- **Linting:** Análise estática com ESLint garantindo a aderência às normas de codificação.
- **Formatação:** Verificação de estilo com Prettier.
- **Testes:** Execução da suite de testes automatizados com Vitest.

O job de **`build`** depende diretamente do sucesso concorrente destas três tarefas através da diretiva `needs: [lint, format, test]`.

### 3.2. Estratégia "Build Once, Deploy Anywhere"

Para evitar discrepâncias entre o código testado e o código implementado, a compilação do Next.js estático (`output: 'export'`) ocorre exclusivamente no job `build`. O resultado compilado no diretório `./out` é empacotado e preservado como um artefacto de pipeline (`artifacts`). Os jobs subsequentes (`deploy` e `preview`) descarregam o artefacto imutável e limitam-se a enviá-lo para a Cloudflare através da CLI `wrangler`, garantindo integridade absoluta do binário.

### 3.3. Gestão de Segredos e Variáveis de Ambiente

Implementou-se o princípio do menor privilégio na gestão de dados sensíveis:

- **Segredos Criptografados:** Tokens de elevado privilégio (`CLOUDFLARE_API_TOKEN`, `CONTENTFUL_ACCESS_TOKEN`, `GEMINI_API_KEY`) foram armazenados em _Secrets_ (GitHub) e _Masked Variables_ (GitLab), impedindo a sua impressão inadvertida nos registos de execução.
- **Variáveis de Configuração:** Identificadores públicos (`CLOUDFLARE_ACCOUNT_ID`, `CONTENTFUL_SPACE_ID`) foram configurados como variáveis de repositório normais.
- **Resiliência de Sintaxe:** No GitHub Actions, utilizou-se a sintaxe de contingência `${{ vars.VAR || secrets.VAR }}` para garantir compatibilidade caso variáveis fossem promovidas a segredos.

### 3.4. Gatilhos de Automação

A pipeline responde a quatro eventos fundamentais:

1. **Push na branch `main`:** Dispara a validação, geração de artefactos e implementação imediata em produção.
2. **Pull Request / Merge Request:** Ativa a validação, compilação, implementação do ambiente de _preview_, auditoria Lighthouse e revisão de código com Inteligência Artificial.
3. **Webhook do Contentful (`repository_dispatch`):** Sempre que um artigo é publicado ou alterado no CMS, o Contentful envia um pedido HTTP à API do GitHub, regenerando o site estático sem intervenção humana.
4. **Agendamento Noturno (`schedule`):** Implementou-se um gatilho cron (`0 0 * * *`). Após a validação do seu funcionamento em ambiente de teste, o gatilho foi comentado com nota explicativa no código para cumprir a diretriz do enunciado de preservação da quota gratuita de minutos.

---

## 4. Extensões Técnicas e Bónus Implementados

Para além dos requisitos nucleares, foram incorporadas melhorias substanciais:

1. **Cobertura de Testes a 100% (Vitest + Badges):** Configurou-se o `@vitest/coverage-v8`, atingindo 100% de cobertura em instruções, funções, linhas e ramificações. No GitHub, adicionaram-se distintivos (_badges_) dinâmicos ao `README.md`; no GitLab, utilizou-se uma expressão regular (`coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'`) que extrai o valor e carimba o selo nativo de 100% diretamente na interface do Merge Request.
2. **Testes de Snapshot:** Implementaram-se testes de snapshot no Vitest para estruturas imutáveis da aplicação, prevenindo regressões visuais ou de configuração.
3. **Auditoria com Lighthouse CI:** Em cada PR/MR, o job `lighthouse` aguarda a disponibilidade do URL de pré-visualização na Cloudflare e executa uma auditoria completa de Performance, Acessibilidade, Melhores Práticas e SEO, gerando relatórios em HTML preservados como artefactos.
4. **Revisor de Código Inteligente com Google Gemini (IA):** Desenvolveu-se um utilitário portátil em Node.js (`scripts/ai-review.mjs`) que extrai o _diff_ do Git entre a branch e a `main`, consulta a API do Google Gemini (`gemini-2.0-flash`) e elabora um parecer estruturado sobre segurança, estilo e potenciais falhas. O script efetua descoberta dinâmica de modelos suportados e funciona de forma agnóstica em qualquer sistema operativo ou runner de CI/CD.

---

## 5. Análise Comparativa: GitHub Actions vs. GitLab CI/CD

A replicação no GitLab CI/CD evidenciou importantes divergências conceituais e arquiteturais:

| Dimensão Técnica                     | GitHub Actions                                                                         | GitLab CI/CD                                                                                                              |
| :----------------------------------- | :------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| **Paradigma de Configuração**        | Orientado a eventos com jobs assíncronos e dependências explícitas (`needs`).          | Orientado a estágios (`stages`) sequenciais com DAG opcional (`needs`).                                                   |
| **Ambiente de Execução**             | Máquinas virtuais dedicadas (`ubuntu-latest`) com ferramentas comuns pré-instaladas.   | Execução baseada em imagens Docker (`image: node:22`), exigindo declaração explícita de dependências.                     |
| **Mecanismo de Cache**               | Ação especializada (`actions/setup-node` com `cache: npm`), gerida na cloud da GitHub. | Diretiva explícita `cache: paths: [.npm/]` persistida entre contentores.                                                  |
| **Pré-visualizações e Ambientes**    | Dependente de comentários em PR via `actions/github-script` e tokens de automação.     | Funcionalidade nativa de **Review Apps / Environments**, com botão interativo **"View app"** e ciclo de vida do ambiente. |
| **Segurança e Restrições de Tokens** | `GITHUB_TOKEN` com escopos permissivos configuráveis no ficheiro YAML.                 | `CI_JOB_TOKEN` com isolamento estrito (bloqueio de escrita em discussões na versão pública SaaS).                         |
| **Controlo de Execução Duplicada**   | Avalia condições `if:` independentemente por cada job.                                 | Exige regras de fluxo global (`workflow: rules:`) para evitar duplicação entre pipelines de branch e de MR.               |

---

## 6. Desafios Superados e Resolução de Problemas

Durante o ciclo de desenvolvimento, resolveram-se múltiplos desafios técnicos de elevada relevância:

- **Conflito de Dependências Peer no Node 22:** A instalação do `@types/node: ^20` conflitua nativamente com o ecossistema do Vitest. A resolução passou pela criação de um ficheiro `.npmrc` na raiz com `legacy-peer-deps=true` e pela regeneração limpa do `package-lock.json`, garantindo instalações reproduzíveis com `npm ci` em ambas as clouds.
- **Proteção de Branches e Nomenclatura de Status Checks:** A proteção da branch `main` exigiu alinhar com precisão os identificadores dos jobs obrigatórios (`lint`, `format`, `test`), eliminando verificações fantasmas criadas por cadeias manuais.
- **Propagação de Versões e Aliases na Cloudflare:** O comando `wrangler versions upload --preview-alias` gera subdomínios determinísticos baseados no nome da branch ou ID do pedido. Para contornar falhas de temporização na propagação do DNS da Cloudflare, desenvolveu-se um mecanismo de sondagem ativa (_polling_) em bash que aguarda a resposta `HTTP 200` antes de invocar o Lighthouse.
- **Resolução de Pipelines Duplicadas no GitLab:** Ao misturar regras de evento de Merge Request com jobs sem regras, o GitLab gerava duas pipelines concorrentes. A implementação da diretiva `workflow: rules:` unificou o fluxo e garantiu a correta resolução de dependências do job `preview` face ao `build`.
- **Descoberta Dinâmica de Modelos na API Gemini:** Variações regionais de nomes de modelos (`gemini-2.5-flash` vs. `gemini-2.0-flash`) causavam erros HTTP 404. O script `scripts/ai-review.mjs` foi desenhado para interrogar previamente o endpoint `/v1beta/models`, selecionar dinamicamente o modelo suportado e comunicar através de cabeçalhos `x-goog-api-key`.

---

## 7. Conclusão

A execução deste projeto permitiu validar na prática os princípios fundamentais da cultura DevOps e da automação de software. O desacoplamento estrito entre código fonte, compilação imutável e infraestrutura de entrega garantiu uma arquitetura robusta, fiável e totalmente agnóstica de fornecedor.

A replicação integral no GitLab CI/CD demonstrou que pipelines de alta qualidade não devem depender de ferramentas proprietárias de uma única plataforma, mas sim assentar em padrões portáteis, scripts universais em Node.js e configurações declarativas bem estruturadas. O projeto atingiu 100% de paridade funcional em ambos os ecossistemas, encontrando-se plenamente operacional e documentado.
