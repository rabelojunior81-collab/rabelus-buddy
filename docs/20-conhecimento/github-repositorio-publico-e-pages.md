# GitHub: repositório público e Pages

**Classe:** CONHECIMENTO · **Última verificação:** 2026-10-20T10:12:48-03:00 · **Estado:** vigente · **Proveniência:** pesquisa ao vivo por subagente Claude Haiku 5.5 (piloto de paralelismo, onda 1, missão W4), conferida pelo buddy-dev: comando gh e endpoints relidos; as lacunas (minutos de macOS e Windows, rulesets em conta pessoal, permissões do Pages) ficam para medir ao vivo

> As lacunas marcadas "não encontrado na fonte" continuam abertas; nada aqui veio da memória do modelo.


Missão de pesquisa ao vivo, sem alteração de nada no repositório. Data da consulta: 2026-10-20. Fontes oficiais apenas (docs.github.com, cli.github.com, github.com/actions/...). Onde a fonte não respondeu, está escrito "não encontrado na fonte".

Grau de certeza: os fatos abaixo estão **CONFIRMADOS** pela fonte citada, salvo onde indicado como **PROVÁVEL** ou "não encontrado na fonte".

## 1. GitHub Actions: runners em repositório público

- Runners padrão (GitHub-hosted) em repositório público: **gratuitos**. A documentação diz "The use of standard GitHub-hosted runners is free:" e lista "In public repositories" como primeiro caso. Fonte: https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions (consultada em 2026-10-20).
- Limite de minutos para repositório público: **não encontrado na fonte**. A página não cita limite de minutos para repositório público.
- macOS e Windows em repositório público: a mesma página não trata sistemas operacionais separadamente para repositório público. A cobertura gratuita vale para os runners padrão de forma geral. **PROVÁVEL** que macOS e Windows padrão também sejam gratuitos em público, mas **não confirmado** pela página.
- Ressalva da mesma página: "Larger runners are always charged for, even when used by public repositories." Ou seja, runners maiores (larger runners) são cobrados mesmo em público.
- Referência de preço em repositório privado (para comparação, não se aplica ao público): Windows 2 cores US$ 0,010/min; macOS 3 ou 4 cores (M1 ou Intel) US$ 0,062/min; Linux 2 cores US$ 0,006/min. Mesma fonte. A página não usa o termo "multiplicador".
- A página não mostra data de última atualização.

## 2. Proteção de branch e rulesets no plano Free

- **Rulesets**: a página "About rulesets" diz que os rulesets estão disponíveis "for customers on GitHub Team and GitHub Enterprise plans". Não há menção a GitHub Free nem a visibilidade pública ou privada. Fonte: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets (consultada em 2026-10-20).
  - Não encontrado na fonte: a frase "Upgrade to GitHub Pro" e qualquer disponibilidade de rulesets em repositório público no plano Free.
- **Branch protection rules**: a página "About protected branches" não diz quais planos ou visibilidades as suportam.
- **Restrição de quem pode fazer push** (branch restrictions): a página diz "You can enable branch restrictions in public repositories owned by a GitHub Free organization" e "in all repositories owned by an organization using GitHub Team or GitHub Enterprise Cloud". Esta frase fala de **organização** no plano Free. Para conta pessoal, **não encontrado na fonte**. Mesma URL acima.
- Conclusão para conta pessoal: a fonte consultada **não confirma** que proteção de branch ou rulesets fiquem disponíveis em repositório público de conta pessoal Free. Hoje a resposta observada no privado é "Upgrade to GitHub Pro", mas esta pesquisa não confirmou a regra para o público. Lacuna declarada.

## 3. Segurança gratuita em repositório público

Fonte geral: https://docs.github.com/en/code-security/getting-started/github-security-features (consultada em 2026-10-20), e as páginas específicas citadas abaixo.

| Recurso | Disponibilidade em público | Como ligar (fonte) |
|---|---|---|
| Secret scanning | "Secret scanning runs automatically for free." Ligado por padrão em público. Fonte: https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning | Caminho na UI: **não encontrado na fonte** (a página fala de avaliação em organização). API: `PATCH /repos/{owner}/{repo}` com `security_and_analysis` e `secret_scanning: {"status": "enabled"}` (ver abaixo). Fonte: https://docs.github.com/en/rest/repos/repos |
| Push protection | Disponível em público por padrão, segundo a página de visão geral de segurança. Fonte: github-security-features | API: `PATCH /repos/{owner}/{repo}` com `security_and_analysis.secret_scanning_push_protection.status = "enabled"`. Fonte: rest/repos/repos. Caminho na UI: **não encontrado na fonte**. |
| Private vulnerability reporting | Página: "Owners and administrators of public repositories can allow security researchers to report vulnerabilities securely." Custo: **não encontrado na fonte**. Endpoint REST: **não encontrado na fonte**. | UI: Settings, seção "Security and quality", **Advanced Security**, botão **Enable** ao lado de "Private vulnerability reporting". Fonte: https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository |
| Dependabot alerts | Disponível para repositórios públicos e privados ("Most of these features are available for public and private repositories"). Gratuito em público: **PROVÁVEL**, não afirmado literalmente. | UI: Settings, "Security and quality", **Advanced Security**, **Enable** ao lado de Dependabot alerts. API: `PUT /repos/{owner}/{repo}/vulnerability-alerts` (exige admin). Fontes: https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configuring-dependabot-alerts e rest/repos/repos (seção enable vulnerability alerts). |
| Dependabot security updates | Mesma página de visão geral. Gratuito em público: **não confirmado** pelas páginas lidas. | API: `PUT /repos/{owner}/{repo}/automated-security-fixes` (exige admin). Caminho na UI: **não encontrado na fonte**. Mesma fonte REST. |
| Code scanning (CodeQL) | Página de visão geral: "Available for public repositories by default." | Caminho na UI e endpoint: **não encontrado na fonte** nesta pesquisa. |

Notas:
- Ao mudar para público, a documentação de visibilidade diz que o repositório "automatically gains access to GitHub Advanced Security features" (ver item 5 da visibilidade abaixo).
- Os valores aceitos em `security_and_analysis` (PATCH) são: `advanced_security`, `code_security`, `secret_scanning`, `secret_scanning_push_protection`, `secret_scanning_non_provider_patterns`, `secret_scanning_ai_detection`, `secret_scanning_delegated_alert_dismissal`, `secret_scanning_delegated_bypass`, `secret_scanning_delegated_bypass_options` (com `reviewers`). Cada um com `status`: `enabled` ou `disabled`. O parâmetro PATCH não inclui `dependabot_security_updates`, embora apareça na resposta GET. Fonte: https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#update-a-repository

## 4. Riscos de tornar público

Fonte: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility (consultada em 2026-10-20). A página traz o aviso: "Before you change your repository's visibility, understand the consequences of this change."

Consequências listadas pela documentação:
- **Código**: qualquer pessoa que acesse GitHub.com pode ver o código.
- **Histórico**: a página fala do código, não destaca commits antigos. **PROVÁVEL** que o histórico git inteiro fique visível (é a leitura natural de "o código"), mas a página não diz "histórico" literalmente. Tratar como risco a verificar.
- **Forks**: qualquer pessoa pode fazer fork. Forks privados existentes são desligados e viram repositórios privados independentes.
- **Stars e watchers**: são removidos.
- **Actions**: histórico de execuções e logs ficam visíveis para todos. Se o repositório usava workflows reutilizáveis ou obrigatórios de outro repositório da organização, o caminho do arquivo, com o nome desse repositório, aparece nos logs.
- **Rulesets**: todos os rulesets de push são desativados.
- **Atividade**: suas alterações são publicadas como atividade.
- **Segurança**: o repositório ganha acesso automático às funções de GitHub Advanced Security.

Não encontrado na fonte: o efeito sobre **secrets** do repositório e sobre o GitHub Pages nesse sentido (a página só trata do Pages no sentido inverso, ao tornar privado). Não encontrado na fonte: como tratar segredos já expostos no histórico.

O que a documentação recomenda verificar antes: a página recomenda entender as consequências e confirmar o nome do repositório na UI. A página não traz uma checklist de verificação de segredos. Lacuna declarada: a orientação "o que verificar antes" da documentação oficial desta página é apenas o aviso acima.

Tratamento de segredos já expostos, a partir do que é sabido sobre o secret scanning: **não encontrado na fonte** nesta pesquisa (a página de secret scanning consultada não trata disso). Recomendação de cautela, não fato de fonte: considerar qualquer segredo que já esteve no histórico como comprometido, rotacioná-lo antes de publicar e não confiar em remoção de commit.

## 5. Como tornar público

UI (fonte: página de visibilidade acima):
1. Repositório, aba **Settings** (ou menu ••• e depois Settings).
2. Seção **Danger Zone**, clicar **Change visibility**.
3. Escolher a visibilidade, confirmar o nome do repositório, clicar **I have read and understand these effects**.
4. Clicar **Make this repository public**.
- Se o dono da organização restringiu mudança de visibilidade a donos, pode não ser possível. Em conta pessoal, esta restrição não se aplica.

API REST: `PATCH /repos/{owner}/{repo}` com `{"visibility": "public"}`. Fonte: rest/repos/repos. Os valores aceitos são `public` e `private`.

gh CLI (fonte: https://cli.github.com/manual/gh_repo_edit, consultada em 2026-10-20):
```
gh repo edit OWNER/REPO --visibility public --accept-visibility-change-consequences
```
- A flag `--visibility <string>` aceita `{public,private,internal}`.
- A flag `--accept-visibility-change-consequences` é obrigatória quando `--visibility` é usada. Descrição oficial: "Accept the consequences of changing the repository visibility".
- Confirmado pela página do manual. A página não traz exemplo com essas flags.

## 6. GitHub Pages

- **Disponibilidade no plano Free para repositório público**: a página "Configuring a publishing source" **não** diz nada sobre planos ou visibilidade. Não encontrado na fonte nesta pesquisa. Não confirmado pela página lida.
- **Origem "GitHub Actions"**: a página diz que em "Build and deployment", "Source", se seleciona **GitHub Actions**. Os modelos de workflow usam um ambiente de deployment chamado `github-pages`. A página recomenda uma regra de proteção para que só a branch padrão implante nesse ambiente. Fonte: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site (consultada em 2026-10-20).
- **Permissões do workflow** (`pages: write`, `id-token: write`): **não encontrado na fonte** nas páginas lidas. Não confirmado. Recomenda-se confirmar nos starter workflows de https://github.com/actions/starter-workflows/tree/main/pages (não consultado nesta pesquisa por limite de buscas).
- **Ativar a origem Actions pela API**: `POST /repos/{owner}/{repo}/pages` com `build_type` = `workflow`. Valores aceitos: `legacy` e `workflow`. Permissão: administrador, mantenedor ou permissão "manage GitHub Pages settings". Token clássico e OAuth precisam do escopo `repo`. Fonte: https://docs.github.com/en/rest/pages/pages?apiVersion=2022-11-28#create-a-github-pages-site (consultada em 2026-10-20). O parâmetro `source` pede `branch` obrigatório e `path` (`/` ou `/docs`), usado apenas no modo legado. Uso exato do `build_type` com `workflow` e sem `source` não verificado com exemplo oficial.
- **Endereço resultante**: o formato `OWNER.github.io/REPO` **não encontrado na fonte** nesta pesquisa. Não confirmado; é o formato conhecido de site de projeto, mas esta pesquisa não o verificou em documentação oficial.

Versões das actions (releases consultadas em 2026-10-20):

| Action | Última release | Data de publicação (conforme exibida) | Fonte |
|---|---|---|---|
| actions/configure-pages | v6.0.0 | "25 Mar 17:00" (ano não exibido na página) | https://github.com/actions/configure-pages/releases/latest |
| actions/upload-pages-artifact | v5.0.0 | "10 Apr 18:22" (ano não exibido na página) | https://github.com/actions/upload-pages-artifact/releases/latest |
| actions/deploy-pages | v5.0.1 | "01 Sep 21:31" (ano não exibido na página) | https://github.com/actions/deploy-pages/releases/latest |

Lacuna: a página de release não mostrou o ano, então a data exata completa não está confirmada. Ler a data pela página de releases no navegador, ou pelo commit da tag, antes de fixar a versão. Não encontrado na fonte: exemplo de workflow completo com as três actions na versão exata.

Exemplo de bloco de permissões e ambiente (esqueleto, **não verificado** contra a fonte oficial; conferir nos starter workflows):
```yaml
permissions:
  contents: read
  pages: write
  id-token: write
environment:
  name: github-pages
  url: ${{ steps.deployment.outputs.page_url }}
```

## Pendências e lacunas

- Limite de minutos em repositório público: não encontrado na fonte.
- macOS e Windows gratuitos em público: não confirmado separadamente.
- Rulesets e proteção de branch em conta pessoal Free com repositório público: não confirmado na fonte.
- Caminho na UI e endpoint de private vulnerability reporting: endpoint não encontrado na fonte; UI confirmada.
- Caminho na UI de secret scanning e push protection: não encontrado na fonte.
- Caminho na UI e endpoint de Dependabot security updates: UI não encontrada; endpoint REST confirmado.
- Caminho na UI de code scanning: não encontrado na fonte.
- Permissões exatas do workflow de Pages (`pages: write`, `id-token: write`): não encontrado nas páginas lidas.
- Formato do endereço `OWNER.github.io/REPO`: não encontrado na fonte.
- Disponibilidade de Pages no Free em público: não encontrado na fonte.
- Tratamento oficial de segredos já expostos após publicar: não encontrado na fonte.
- Confirmação de que o histórico git inteiro fica visível: PROVÁVEL (a página fala de "código"), não literal.

## Fontes (consultadas em 2026-10-20)

1. https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions
2. https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility
3. https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
4. https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
5. https://docs.github.com/en/code-security/getting-started/github-security-features
6. https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning
7. https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configuring-dependabot-alerts
8. https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository
9. https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28 (PATCH /repos/{owner}/{repo}; vulnerability alerts; automated security fixes)
10. https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
11. https://docs.github.com/en/rest/pages/pages?apiVersion=2022-11-28#create-a-github-pages-site
12. https://github.com/actions/configure-pages/releases/latest
13. https://github.com/actions/upload-pages-artifact/releases/latest
14. https://github.com/actions/deploy-pages/releases/latest
15. https://cli.github.com/manual/gh_repo_edit
16. https://github.com/actions/configure-pages (README, sem o bloco de permissões)

Arquivo: C:\Users\rabel\AppData\Local\Temp\claude\C--Users-rabel-Desktop-rabelus-lab-rabelus-buddy\beb7663d-3c57-4278-99c1-9a9bcf710174\scratchpad\onda1\w4-github-publico-e-pages.md

## Histórico de verificações

- 2026-10-20T10:12:48-03:00: criação, a partir da missão W4 do piloto.
