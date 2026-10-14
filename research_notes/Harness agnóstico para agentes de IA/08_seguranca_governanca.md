# 08 — Segurança, privacidade, governança e licenciamento

**Data de referência:** 14/10/2026. Fontes acessadas em 14/10/2026, salvo indicação. Controles de memória estão na nota 07; preços e retenção de provedores na nota 02; isolamento de execução na nota 04.

## Resumo

- **Ameaça central:** injeção de prompt levando a ação não aprovada. Referências: OWASP LLM Top 10 (2025) com LLM01 Prompt Injection, LLM04 Data and Model Poisoning e LLM08 Vector and Embedding Weaknesses; OWASP Top 10 for Agentic Applications 2026 com ASI06 Memory & Context Poisoning; além de cheat sheets de AI Agent Security, LLM Prompt Injection Prevention, MCP Security, RAG Security e Secrets Management [1][2][3].
- **SSRF no gateway:** o guia da OWASP manda não aceitar URL completa do usuário, usar allowlist de hosts, validar IP resolvido, conectar só no IP validado preservando Host e SNI, desligar redirecionamentos e tratar discordância de parsers como rejeição; deny-list só como último recurso, com faixas mínimas bloqueadas (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.169.254, fc00::/7, fe80::/10, 224.0.0.0/4) [4].
- **Segredos:** cofre do sistema operacional é o caminho — Credential Manager no Windows (API Win32 documentada), Keychain no macOS e libsecret no Linux. Nada de segredo em banco, log ou trace [5][6].
- **LGPD (Lei 13.709/2018):** o art. 4º, inciso I, exclui tratamento por pessoa natural para fins exclusivamente particulares e não econômicos. Uso pessoal do harness está, em tese, fora da lei; os direitos do titular (art. 18) e os princípios (art. 6) permanecem como boas práticas, e passam a valer se o produto for oferecido a terceiros ou gerar receita [6].
- **Supply chain:** SLSA 1.0 define níveis de build (L1 proveniência existe; L2 plataforma hospedada com proveniência assinada; L3 builds endurecidos); versão atual da especificação é 1.2. Para um projeto individual, L1 com lockfile e revisão de dependências é o realista [7].
- **Licenças:** MIT e Apache-2.0 são as mais comuns no ecossistema (notas 01, 02, 03, 07); dependências AGPL-3.0 existem e exigem decisão (Honcho, Basic Memory — nota 07).
- **Recomendação preliminar:** controle de aprovação por classe de ação como peça central; rede desligada por padrão; cofre do SO; allowlist de destinos de rede; SBOM e lockfile; auditoria sem conteúdo sensível;遮蔽 (redaction) antes de qualquer trace.

## Fatos verificados

### 1. Referências de ameaça

- OWASP Top 10 for LLM Applications (2025): LLM01 Prompt Injection; LLM04 Data and Model Poisoning (inclui dados de embedding); LLM08 Vector and Embedding Weaknesses [1].
- OWASP Top 10 for Agentic Applications 2026: ASI06 Memory & Context Poisoning; controles prescritos incluem varrer escritas de memória antes do commit, segmentar sessões e domínios, aceitar só fontes autenticadas e curadas, registrar proveniência, não reingerir saídas do próprio agente, snapshots e rollback, revisão humana em ações de alto risco e expirar memória não verificada [2].
- A série de cheat sheets da OWASP inclui, entre outras: AI Agent Security, LLM Prompt Injection Prevention, MCP Security, RAG Security, Secrets Management, Dependency Graph SBOM, Software Supply Chain Security, Webhook Security, Verifying Third Party Agent Execution Evidence (títulos observados no índice da série) [3].
- Pesquisas acadêmicas citadas na nota 07: AgentPoison (sucesso médio acima de 80% com poison rate abaixo de 0,1%) e MINJA (injeção por consulta, sem alterar o banco).

### 2. SSRF [4]

- Não aceitar URL completa do usuário; aceitar IP ou domínio e comparar com allowlist; construir a requisição no servidor.
- Validar o IP resolvido contra as redes permitidas e conectar apenas no IP validado, preservando hostname para `Host`, SNI e verificação de certificado; aplicar a política também a retries e fallbacks.
- Discordância de parsers sobre o host = rejeição (ex.: `http://example.com\@evil.com` lido como `evil.com` por parser que trata tudo antes do último `@` como userinfo).
- Allowlist de domínio sozinha não impede DNS rebinding; desligar redirecionamentos no cliente HTTP.
- Deny-list como último recurso, com faixas mínimas: localhost 127.0.0.0/8, 0.0.0.0/8, ::1/128; RFC1918 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16; IPv6 ULA fc00::/7; link-local fe80::/10; multicast 224.0.0.0/4 e ff00::/8; metadados de nuvem 169.254.169.254.
- Em nuvem, IMDSv2 como defesa adicional (AWS).

### 3. Segredos e OAuth [5]

- Windows Credential Manager: API Win32 de gerenciamento de credenciais, integrada ao Multiple Provider Router; documentada pela Microsoft [5].
- macOS Keychain e libsecret (Linux) são os equivalentes naturais; documentação oficial específica não lida nesta rodada (marcar como verificação pendente).
- Canais usam OAuth (Slack, Teams, Google) ou tokens de bot (Telegram, Discord) — nota 05. Tokens de canal e chaves de provedor são o material a proteger.

### 4. LGPD [6]

- Lei 13.709/2018, alterada pelas Leis 13.853/2019 e 15.352/2026 (esta última alterando a definição de encarregado e autoridade nacional).
- Art. 4º: a lei **não se aplica** ao tratamento realizado por pessoa natural para fins exclusivamente particulares e não econômicos (inciso I), nem a fins exclusivamente jornalísticos, artísticos ou acadêmicos (inciso II), entre outros.
- Art. 6º: princípios — finalidade, adequação, necessidade, livre acesso, qualidade, transparência, segurança, prevenção, não discriminação, responsabilização e prestação de contas.
- Art. 18: direitos do titular — confirmação, acesso, correção, anonimização/bloqueio/eliminação, portabilidade, eliminação, informação sobre compartilhamento, revogação de consentimento.
- Art. 16: após o término do tratamento, dados são eliminados, salvo conservação para obrigação legal, estudo, transferência a terceiro ou uso exclusivo do controlador com anonimização.
- Definições incluem dado pessoal sensível, anonimização e transferência internacional (art. 5º).

### 5. Supply chain [7]

- SLSA 1.0: Build L1 (proveniência existe, pode ser incompleta ou não assinada), Build L2 (plataforma de build hospedada, proveniência assinada), Build L3 (builds endurecidos, isolamento entre execuções, material de assinatura inacessível aos passos do build). Versão atual da especificação: 1.2.
- A página de níveis está marcada como "Retired" (status), com a documentação corrente em v1.2 — conferir requisitos na versão atual antes de exigir níveis.

## Interpretações

- **I1. Controle central é a aprovação por classe de ação.** A matriz de ameaças do harness é: conteúdo externo (página, e-mail, mensagem de canal, memória) influencia o modelo, que decide ações com efeito no mundo. A defesa principal não é detectar injeção (impossível de forma confiável), é garantir que ação com efeito passe por política determinística e aprovação humana — exatamente o requisito do usuário.
- **I2. Rede desligada por padrão.** Toda ferramenta começa sem rede. `webfetch`, `websearch`, MCP remoto e chamadas externas são classes com aprovação própria. Isso reduz SSRF, exfiltração e gasto não autorizado.
- **I3. Allowlist de destinos.** Provedores de API, canais e endpoints do gateway formam uma allowlist curta e explícita. Web search e fetch arbitrário entram como classe aprovada, com allowlist não aplicável (Caso 2 do OWASP) — daí a importância de bloqueio de faixas privadas e de metadados.
- **I4. Segredos nunca em artefatos.** Cofre do SO por plataforma; injeção no processo filho só no momento do uso; proibição de segredo em log, trace, memória e diff. Auditoria registra `args_hash`, não argumentos.
- **I5. Auditoria sem conteúdo sensível.** O log guarda ator, ação, alvo, hashes, aprovação e sessão. Conteúdo completo só quando aprovado explicitamente e armazenado fora do log. Tracing segue a regra de contivo desligado por padrão (OTel GenAI, nota 03) e redação no processo (Langfuse masking, LangSmith hide_inputs — nota 03).
- **I6. LGPD no uso pessoal.** Para uso exclusivamente particular e não econômico, a lei não se aplica (art. 4º, I). Mas o projeto coleta dados de terceiros indiretamente: mensagens de canais, conteúdo de páginas, perfis. Se o produto for distribuído ou monetizado, as obrigações passam a valer — desenhar já com exportação, correção e eliminação (art. 18) custa pouco agora.
- **I7. Fornecedores e transferência internacional.** Provedores de API e canais processam dados fora do Brasil (nota 02). No uso pessoal, é decisão informada do usuário; para distribuição, exigiria cláusulas contratuais e informação ao titular.
- **I8. Supply chain proporcional ao time.** Um desenvolvedor: lockfile, atualização com revisão, SBOM básico (CycloneDX ou SPDX) gerado no release, builds em CI hospedado (L1/L2). Assinatura de artefatos com Sigstore é o passo natural; custo de manutenção de L3 não se justifica.
- **I9. Plugins e scripts como zona hostil.** Plugin de terceiro e script arbitrário são código não confiável: processo separado, permissões mínimas, sem rede, com aprovação de instalação e hash fixado (nota 09). A diretriz 2.5.2 da Apple reforça a fronteira em iOS (nota 09).
- **I10. Identidade de terceiros.** Pacotes de identidade ou skills de terceiros (como os perfis do Hermes) entram como conteúdo não confiável: varredura, quarentena e aprovação, nunca instalação silenciosa (nota 07).

## Hipóteses e pontos não confirmados

- H1. Eficácia do scanner de injeção em SOUL.md e AGENTS.md do Hermes: alegada pela documentação; não testada (nota 07).
- H2. Cobertura das cheat sheets de AI Agent Security e MCP Security: apenas os títulos foram observados no índice; o conteúdo não foi lido.
- H3. libsecret e Keychain: equivalente à Credential Manager, mas documentação oficial não lida nesta rodada.
- H4. Sigstore para assinar releases do projeto: não avaliado nesta rodada.
- H5. Obrigações concretas de GDPR (UE): texto não lido; apenas referenciado como aplicável se houver usuários na UE.
- H6. Política de "AI Providers" do WhatsApp (nota 05): pode impor requisitos adicionais de privacidade e consentimento.
- H7. Ciclo de vida de incidentes e divulgação: não pesquisado.

## Lacunas e conflitos

- SLSA: página de níveis em status "Retired"; versão corrente 1.2 — usar a documentação da 1.2 para requisitos.
- LGPD: interpretação do art. 4º, I, para software pessoal que processa dados de terceiros em canais é zona cinzenta; não é aconselhamento jurídico.
- Retenção de dados dos provedores (nota 02) permanece como lacuna.

## Recomendação preliminar

### Controles prioritários (ordem de implementação)

1. **Política de permissões por classe de ação** no núcleo, com `allow`/`ask`/`deny` e casamento por padrão (modelo do OpenCode, nota 01). Classes: criar ou alterar arquivos; executar comandos; apagar; alterar sistemas externos; enviar mensagem em canal; usar credenciais; instalar pacote ou plugin; acessar rede; gastar acima de limite.
2. **Rede desligada por padrão** em ferramentas e workspaces (nota 04); allowlist de destinos para o que for liberado.
3. **Cofre do SO** para segredos; proibição de segredo em log, trace, memória e diff.
4. **Auditoria sem conteúdo**: hashes, metadados e aprovações; conteúdo completo só com autorização e fora do log.
5. **Varredura de memória e de conteúdo externo** na escrita (OWASP ASI06); não reingerir saída do próprio agente.
6. **Plugins e scripts em processo separado**, permissões mínimas, instalação com aprovação e hash fixado.
7. **Gateway com allowlist e anti-SSRF** (IP validado, sem redirecionamento, faixas privadas bloqueadas).
8. **Supply chain:** lockfile, CI hospedado, SBOM no release, atualização com revisão.
9. **Direitos do titular desde já:** exportar, corrigir e eliminar memória; retenção configurável.
10. **Tracing com conteúdo desligado** e redação no processo (nota 03).

### Pontuação (1 a 5; em custo, 5 = mais barato; julgamento qualitativo)

| Controle (pergunta de arquitetura) | Eficácia | Maturidade | Custo | O&M |
|---|---|---|---|---|
| Aprovação por classe de ação | 5 | 4 | 5 | 4 |
| Rede desligada por padrão + allowlist | 5 | 4 | 5 | 4 |
| Cofre do SO para segredos | 5 | 5 | 5 | 4 |
| Auditoria sem conteúdo sensível | 4 | 4 | 5 | 4 |
| Sandbox descartável para scripts de terceiros | 4 | 4 | 5 | 3 |
| Varredura de conteúdo na escrita de memória | 3 | 3 | 4 | 3 |
| Scanner de injeção em arquivos de identidade | 3 | 2 | 4 | 3 |
| SBOM + builds em CI (SLSA L1/L2) | 3 | 4 | 4 | 3 |
| Assinatura de releases (Sigstore) | 3 | 4 | 5 | 3 |

Justificativas curtas: aprovação e rede desligada atacam o vetor principal (injeção → ação) sem depender de detecção; cofre e auditoria sem conteúdo reduzem vazamento; scanners são camada auxiliar, não defesa única.

### Próximos passos (não executados)

1. Ler as cheat sheets de AI Agent Security e MCP Security.
2. Confirmar documentação de Keychain e libsecret.
3. Ler a política de AI Providers do WhatsApp.
4. Decidir formato de SBOM e pipeline de release.
5. Escrever a política de retenção e eliminação (inclusive de memória e traces).

## Fontes

| # | Título | Organização | URL | Acesso |
|---|---|---|---|---|
| 1 | OWASP Top 10 for LLM Applications (2025) | OWASP GenAI Security Project | https://genai.owasp.org/llm-top-10/ | via nota 07 (13/10/2026) |
| 2 | OWASP Top 10 for Agentic Applications 2026 (ASI06) | OWASP GenAI Security Project | https://genai.owasp.org/download/52117 | via nota 07 (13/10/2026) |
| 3 | Cheat Sheet Series (índice) | OWASP | https://cheatsheetseries.owasp.org/index.html | 14/10/2026 |
| 4 | Server Side Request Forgery Prevention Cheat Sheet | OWASP | https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html | 14/10/2026 |
| 5 | Credential Manager (Win32 apps) | Microsoft Learn | https://learn.microsoft.com/en-us/windows/win32/secauthn/credential-manager | 14/10/2026 |
| 6 | Lei 13.709/2018 (LGPD) | Presidência da República (Planalto) | https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm | 14/10/2026 |
| 7 | SLSA v1.0 — Security levels | SLSA / Linux Foundation | https://slsa.dev/spec/v1.0/levels | 14/10/2026 |
