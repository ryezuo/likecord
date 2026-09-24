# Likecord — Roadmap de UI/UX e Polish

> **Archive context:** image references and dated operator checkpoints in this document are historical evidence. The former Likecord GHCR packages were deleted; they are not current deployment inputs or work orders. See [operations history](../history/operations.md); forks must build their own images.

> Checklist vivo para acompanhar as melhorias de navegação, usabilidade e polish visual do Likecord.
>
> Consolidação desta lista: 08/09/2026.

> **PUBLIC ARCHIVE FREEZE — 2026-09-23:** `PROJECT_DEVELOPMENT_FROZEN=true`.
> This formerly living checklist is now historical stage evidence, not an active
> upstream work schedule. `EM ANDAMENTO`, unchecked boxes and pre-RC targets below
> describe the state/intent at their recorded checkpoints. Use
> [PROJECT_STATUS.md](../../PROJECT_STATUS.md) and [ROADMAP.md](../../ROADMAP.md)
> for the freeze snapshot. Dedicated feature contracts still own their detailed
> accepted behavior and unresolved acceptance rows.

## Legenda

- [x] Implementado e validado
- [ ] Planejado / pendente
- **EM ANDAMENTO** = stage atual
- **FUTURO / OPCIONAL** = não bloqueia o 1.0 neste momento

---

# 1. Navegação canônica e estrutura de URLs

## Rotas principais

- [x] `/channels/@me` como Home autenticada do usuário.
- [x] `/channels/{serverId}` como rota intermediária do servidor.
- [x] `/channels/{serverId}/{channelId}` como rota canônica do canal de texto visível.
- [x] URL como fonte canônica de `selectedServerId` e `selectedTextChannelId`.
- [x] Browser Back / Forward acompanha servidor e canal selecionados.
- [x] F5 / deep link restaura o canal correto.
- [x] `/app` redireciona para a arquitetura canônica.
- [x] Navegação entre canais ocorre via client-side routing, sem novo `Document`.
- [x] Server Rail mantém highlight do servidor selecionado.
- [x] Channel Sidebar mantém highlight do canal de texto selecionado.
- [x] Troca de canal preserva Voice e Screen Share.
- [x] Loading de canal é confinado à área de conteúdo; shell permanece estável.

## Preferência persistente de navegação

- [x] PostgreSQL armazena o último canal de texto por usuário + servidor.
- [x] Mesma conta recupera a preferência em outro navegador/dispositivo.
- [x] Usuários diferentes possuem preferências independentes.
- [x] Canal removido/inacessível não quebra a navegação.
- [x] `/channels/{serverId}` resolve:
  1. último canal acessível;
  2. primeiro canal de texto acessível;
  3. empty state do servidor.

---

# 2. `/channels/@me` — Home do usuário

## Objetivo

A Home deve ser um ponto de entrada útil e simples, sem copiar visualmente o Discord.

O escopo atual de polish pertence a [F7.2 no contrato F7](./f7-core-user-ux.md#5-f72--channelsme-home-ux).
A F7.2 implementa welcome, cards, estados independentes e Continue com leitura
autenticada das preferências existentes. A [API de navegação](../api-spec.md#navigation)
e a Web passaram na validação automatizada. F7.2 está aceita em staging: 40/40
checks do núcleo e 16/16 do smoke final Home, conforme o
[aceite F7.2](./f7-core-user-ux.md#18-f72-final-staging-acceptance--recorded-2026-09-02).

## V1 planejada

- [x] Login normal cai em `/channels/@me`.
- [x] Exibir os servidores dos quais o usuário participa.
- [x] Permitir abrir um servidor a partir da Home.
- [x] Entrada Home no topo do ServerRail para voltar a `/channels/@me` — F7.2R aceita em staging.
- [x] Melhorar apresentação dos cards/lista de servidores — F7.2 aceita em staging.
- [x] Melhorar o estado vazio básico existente e distinguir loading/erro de ausência de servidores — F7.2 aceita em staging.
- [x] Colocar CTA evidente de `Add a Server`.
- [x] Exibir `Continue where you left off` com a preferência PostgreSQL existente e a leitura agregada limitada definida em F7.2; sem destino válido, permanecer em Home sem selecionar servidor arbitrário — F7.2 aceita em staging.
- [ ] **FUTURO / OPCIONAL, fora de F7:** seção separada de canais/servidores recentes; não criar tracking excessivo.

## Não implementar agora

- [ ] **FUTURO / OPCIONAL** DMs.
- [ ] **FUTURO / OPCIONAL** Friends.
- [ ] **FUTURO / OPCIONAL** Mentions.
- [ ] **FUTURO / OPCIONAL** Activity feed.

---

# 3. Server Rail — `Add a Server`

## Comportamento desejado

O botão `+` do Server Rail não deve significar apenas “Create Server”.

Ao clicar:

### Modal `Add a Server`

- [x] Título e explicação curta.
- [x] Ação principal: `Create a Server`.
- [x] Ação secundária: `Join a Server`.
- [x] Fechar por botão X.
- [x] Fechar por Escape.
- [x] Fechar clicando fora, se consistente com os demais modais.

### Create a Server

- [x] Reutilizar fluxo/backend já existente.
- [x] Nome do servidor.
- [x] Sem ícone de servidor nesta fatia.
- [x] Criar e navegar por `/channels/{serverId}`, deixando o resolver canônico selecionar o estado/canal inicial correto.

### Join a Server

Aceitar:

- [x] código puro;
- [x] `/invite/{code}`;
- [x] URL completa de invite same-origin.

Normalizar internamente tudo para o `inviteCode`.

Fluxo esperado:

```text
Add a Server
  -> Join a Server
  -> inserir código/URL
  -> preview
  -> confirmação
  -> membership
  -> /channels/{serverId}
```

---

# 4. Menu do servidor no Channel Sidebar

## Entrada

Ao clicar no nome do servidor / chevron no topo da Channel Sidebar:

- [x] Abrir menu contextual do servidor.

## Itens planejados

- [x] `Invite People`
- [x] `Create Channel`
- [x] `Create Category`
- [x] `Server Settings`
- [x] divisor
- [x] `Leave Server`
- [x] Atalho de `Leave Server` no botão direito do Server Rail para não-owner, reutilizando a confirmação e o lifecycle canônicos do Header.

## Regras de UX

- [x] Mostrar apenas ações permitidas pelo usuário.
- [x] Ícones próprios do Likecord.
- [x] Tooltips onde fizer sentido.
- [x] Não usar textos compactos atuais como `+Invite` / `+Ch` como solução final.
- [ ] **POLISH DIFERIDO:** revisar tamanho e animação/rotação do chevron; não integra a correção F.5.3.1.

---

# 5. Invite UX

## Rota canônica

- [ ] `/invite/{inviteCode}` deve ser o ponto único de entrada de convite.

Evitar arquitetura final baseada em:

```text
/register?code=...
```

## Usuário não autenticado

Fluxo desejado:

```text
/invite/{code}
  -> preview seguro do servidor
  -> Login ou Create Account
  -> preservar returnTo
  -> voltar para /invite/{code}
  -> Accept Invite explícito
  -> /channels/{serverId}
```

- [ ] Não aceitar automaticamente o convite apenas porque o usuário fez login/register.
- [ ] Preservar explicitamente o invite durante autenticação.

## Usuário autenticado e ainda não membro

- [ ] Mostrar preview do servidor.
- [ ] Botão `Accept Invite`.
- [ ] Depois do aceite, navegar para o canal apropriado.

## Usuário já membro

- [ ] Exibir estado `Already a member`.
- [ ] Botão `Open Server`.

## Invite inválido / expirado

- [ ] Empty/error state amigável.
- [ ] Não revelar metadata indevida.

---

# 6. Modal `Invite People`

## Conteúdo V1

- [ ] Nome/identidade do servidor.
- [ ] URL canônica `/invite/{code}`.
- [ ] Campo copiável.
- [ ] Botão `Copy`.
- [ ] Feedback `Copied ✓`.
- [ ] Canal de destino do convite, quando aplicável.
- [ ] Informação de expiração, se o backend já suportar.

## Futuro

- [ ] **FUTURO / OPCIONAL** `Edit Invite Settings`.
- [ ] Expiração configurável.
- [ ] Limite de usos.
- [ ] Revogação/gerenciamento de invites.

---

# 7. Channel Sidebar

## Navegação

- [x] Highlight do servidor selecionado.
- [x] Highlight do text channel selecionado.
- [x] Sidebar persiste durante navegação.
- [x] Troca de text channel não causa global `Loading server...`.

## Criação de canais

- [x] Colocar `+` próximo ao cabeçalho/agrupamento de canais, em vez de depender apenas de ação textual no topo.
- [x] Tooltip `Create Channel`, renderizado fora do overflow estreito da sidebar para não ser cortado.
- [x] Modal de criação consistente com design do Likecord.
- [x] Escolha Text / Voice, conforme permissões e suporte existente.
- [x] Category header `+` abre o mesmo modal com a Category pré-selecionada e mantém Text/Voice disponível.
- [x] Com `MANAGE_CHANNELS`, seções Text/Voice e Categories vazias permanecem visíveis e criáveis.
- [x] Sem `MANAGE_CHANNELS`, seções Text/Voice sem Channels visíveis e Categories sem filhos visíveis ficam ocultas.

## Realtime

- **CLOSED — F.3.5B; regressão integrada de staging aprovada no `SEC-PREF4-GATE`**
- [x] Criar Text Channel em A aparece em B/C sem F5.
- [x] Criar Voice Channel em A aparece em B/C sem F5.
- [x] Rename/update sincroniza em realtime, se já suportado.
- [x] Delete sincroniza em realtime, se já suportado.
- [x] Nenhum canal duplicado no criador por REST + Socket.
- [x] Respeitar `VIEW_CHANNEL` e não vazar canais privados.
- [x] Delete do canal atualmente aberto resolve a URL canônica para fallback seguro.

---

# 8. Message Delete UX

> **Limite de autoridade:** este roadmap define o stage, status e a intenção de UX de F.4. O contrato dedicado [F.4 — Message Delete Lifecycle](./f4-message-delete-lifecycle.md) define de forma autoritativa persistência da Message, lifecycle de Attachments, ordenação de falhas, contratos REST/realtime e o aceite final. F.4 está completo.

## Estado atual

A exclusão deixa um tombstone como:

```text
This message has been deleted
```

## Comportamento desejado

- [ ] Clique em `Delete`.
- [ ] Abrir modal de confirmação.
- [ ] Mostrar contexto suficiente da mensagem.
- [ ] `Cancel`.
- [ ] `Delete` destrutivo.
- [ ] Após confirmação, a mensagem some da timeline.
- [ ] Remoção realtime em todos os clientes conectados.
- [ ] Não manter tombstone permanente no chat como comportamento padrão.

## Attachments

- [ ] Remover ownership/referência no banco.
- [ ] Excluir arquivo em storage local/R2.
- [ ] Falha de storage não deve corromper a operação de banco.
- [ ] Implementar cleanup/retry/GC para órfãos.
- [ ] Lifecycle do R2 pode ser safety net, não o mecanismo primário de delete.

---

# 9. Voice Channel — Presence UI

> **Autoridade atual:** o contrato dedicado
> [F.6 Voice UX](./f6-voice-ux.md) reconciliou estas direções históricas com o
> source real. As seções 9–13 preservam a visão resumida; quando houver diferença
> de precisão ou baseline, o contrato F.6 prevalece. Em particular, a faixa
> aceita de personal mix é `0%–100%`; a sugestão histórica de amplificação até
> 200% foi superseded.
> A apresentação atual dos menus Member/Voice pertence à
> [convergência concluída e congelada](./member-voice-context-menu-convergence.md),
> que adiciona ações administrativas elegíveis sem alterar o personal mix de F6.

## Objetivo

Mostrar quem está conectado em cada Voice Channel mesmo para usuários que ainda não entraram naquela call.

Exemplo:

```text
🔊 Sala Geral
   User A
   User B
   User C
```

## Regras

- [x] Presença deve vir do estado realtime/Socket.IO.
- [x] Observador fora da call vê quem está conectado.
- [x] Observador fora da call NÃO recebe áudio.
- [x] Observador fora da call NÃO cria `RTCPeerConnection`.
- [x] Observador fora da call NÃO inicia ICE/TURN.
- [x] Observador fora da call NÃO pede permissão de microfone.
- [x] Observador fora da call NÃO executa speaking detection.

---

# 10. Voice Channel — Speaking Indicator

## Quando habilitar

Somente quando o usuário local estiver conectado naquela mesma Voice Room.

## UX

- [x] Ring/outline no avatar de quem está falando — C2A automated pass; manual staging passed (see the dedicated C2 acceptance record).
- [x] Indicador no próprio usuário.
- [x] `selfMute` nunca deve aparecer como speaking.
- [x] Analisar apenas áudio de CALL/MIC.
- [x] Screen Share audio não participa do speaking indicator.

## Estabilidade visual

- [x] Threshold de atividade (`0.035`).
- [x] Attack rápido.
- [x] Release/hysteresis de `300 ms` para evitar flicker.
- [x] Análise de áudio não cria um segundo sink de reprodução.

---

# 11. Voice — Personal Mix / volume por usuário

## UX

Botão direito em um usuário conectado ao Voice Channel:

```text
User B

User Volume
0% ---------------- 100%

Mute locally
```

## Regras

- [x] Slider individual por usuário remoto.
- [x] Faixa contratual: `0%–100%`.
- [x] `100%` = volume padrão.
- [x] `Mute locally` separado do slider.
- [x] C4 remove o botão Reset explícito; o popover mantém identidade, slider,
  percentual numérico e mute local conforme o [contrato F.6](./f6-voice-ux.md#15-participant-context-menu-contract).
- [x] Desmutar localmente restaura o volume anterior.
- [x] Alteração de A sobre B afeta somente A.
- [x] B/C não são afetados.
- [x] Controle atua apenas no áudio de CALL/MIC do usuário.
- [x] Não alterar Screen Share audio.
- [x] Não criar segundo `<audio>` / sink apenas para controlar volume.

## Persistência

C3 implementa PostgreSQL por par listener + target, com defaults `100/false`,
hidratação na montagem autenticada e gravação/reset privados. Modelo e constraints
no [contrato de dados](../database.md#user_voice_mix_preferences); API e ownership
no [contrato REST](../api-spec.md#personal-voice-mix-f6c3).

- [x] Identidade composta `(listenerUserId, targetUserId)`.
- [x] Mesma conta recupera o mix no próximo load autenticado em outro navegador/dispositivo — automação e staging C3 passaram; evidência no [contrato F.6](./f6-voice-ux.md#accepted-c3-staging-evidence--2026-09-02).
- [x] Usuários mantêm mixes independentes.

---

# 12. Voice — menu contextual do usuário

Ao clicar com botão direito em usuário conectado à Voice:

- [x] Nome/avatar.
- [x] `User Volume`.
- [x] `Mute locally`.
- [ ] **FUTURO / OPCIONAL** `View Profile`.
- [x] Roles, `Server Mute / Server Unmute`, Kick/Ban e Copy User ID para o
  participante remoto conforme elegibilidade da
  [convergência Member/Voice](./member-voice-context-menu-convergence.md).
  Self Voice permanece apenas identidade; Server Deafen e Move to Voice
  administrativos continuam fora do produto atual.

Não misturar local mute com server mute/moderação.

---

# 13. Voice — bugs conhecidos

## Mute / Deafen state machine

- [ ] Validar `Mute + Deafen -> desativar Deafen` para manter Mute e corrigir
  somente qualquer delta confirmado.
- [ ] Validar transições de estado em todas as ordens.
- [ ] Validar representação visual do mic enquanto Deafen estiver ativo e
  corrigir somente qualquer delta confirmado.
- [ ] Não misturar esta correção com Screen Share.

## Username -> UUID regression

- [ ] Auditar caso em que nome correto vira UUID após algum tempo.
- [ ] Reconnect/F5 atualmente restaura o username.
- [ ] Investigar hydration/cache/realtime identity.
- [ ] Não mascarar UUID com dados inconsistentes no frontend.

---

# 14. Screen Share — estado atual

## Já implementado e validado

- [x] múltiplos presenters.
- [x] viewer opt-in.
- [x] múltiplas streams simultâneas.
- [x] Grid/Gallery.
- [x] Focus.
- [x] CENTRAL.
- [x] DETACHED.
- [x] HIDDEN.
- [x] HIDDEN silencia localmente o screen audio correspondente.
- [x] Leave Stream -> Rejoin Stream.
- [x] self preview.
- [x] viewer count/list.
- [x] Call/Mic e Screen Share audio independentes.
- [x] sem duplicação/echo em validação multi-dispositivo real.

---

# 15. Screen Share — polish futuro

Não bloqueia o 1.0 atual, salvo decisão posterior.

- [ ] **FUTURO / OPCIONAL** drag/move do estado DETACHED.
- [ ] **FUTURO / OPCIONAL** resize do estado DETACHED.
- [ ] **FUTURO / OPCIONAL** limites de viewport e snap do estado DETACHED.
- [ ] **FUTURO / OPCIONAL** fullscreen.
- [ ] **FUTURO / OPCIONAL** volume por Screen Share.
- [ ] **FUTURO / OPCIONAL** mute local por share.
- [ ] **FUTURO / OPCIONAL** overlay de controles e polish de detach/reattach.
- [ ] **FUTURO / OPCIONAL** feedback explícito de `Stop Sharing`.
- [ ] **FUTURO / OPCIONAL** preview próprio pode ser colapsado/ocultado localmente sem afetar a transmissão.
- [ ] **FUTURO / OPCIONAL** ocultar/compactar o preview próprio é apenas apresentação e não reutiliza nem altera a semântica de transporte `HIDDEN` do viewer.
- [ ] **FUTURO / OPCIONAL** duplo clique no preview próprio pode promovê-lo para `CENTRAL`/`FOCUS`.
- [ ] **FUTURO / OPCIONAL** focar uma Live remota pode colapsar o preview próprio para um tile compacto.
- [ ] **FUTURO / OPCIONAL** introduzir um estado de apresentação `MINIMIZED` verdadeiro para a Live.
- [ ] **FUTURO / OPCIONAL** `MINIMIZED` não significa `Leave Stream` e preserva o transporte ativo.
- [ ] **FUTURO / OPCIONAL** `MINIMIZED` preserva o áudio de Screen Share, salvo mute separado pelo usuário.
- [ ] **FUTURO / OPCIONAL** `Restore` retorna a Live a um estado de apresentação principal/anterior apropriado.
- [ ] **FUTURO / OPCIONAL** oferecer minimizar de forma consistente em `CENTRAL`/Grid/Focus/DETACHED onde a UX final suportar.
- [ ] **FUTURO / OPCIONAL** polish visual da Gallery.
- [ ] **FUTURO / OPCIONAL** som curto ao parar compartilhamento.

---

# 16. Chat UI

## F.1 já fechado

- [x] Composer permanece visível com histórico longo.
- [x] Message List possui scroll próprio.
- [x] Header/shell não cresce além do viewport.
- [x] Ao abrir/trocar canal, inicia no latest.
- [x] Near-bottom recebe auto-scroll.
- [x] Usuário lendo histórico não é puxado automaticamente.
- [x] Indicador `↓ N new messages`.
- [x] Clique no indicador vai ao final.
- [x] Mensagem própria leva ao latest.
- [x] Prepend de histórico preserva anchor.

## Polish futuro possível

- [ ] **FUTURO / OPCIONAL** melhorar visual do indicador de novas mensagens.
- [ ] **FUTURO / OPCIONAL** unread/read markers persistentes.
- [ ] **FUTURO / OPCIONAL** posição de leitura por canal.

---

# 17. Status dos stages de UX

## Concluídos

- [x] C.5 — Screen Share/WebRTC.
- [x] F.1 — Chat Layout / Scroll / Composer.
- [x] F.2 — Canonical Navigation & PostgreSQL Preferences.

## Concluídos / encerrados

- [x] **F.3 — Realtime Channel Synchronization:** concluído; regressão integrada de staging aprovada no `SEC-PREF4-GATE`.
- [x] **SEC-PREF4-GATE:** PASS no candidato runtime `accepted pre-F.4 security candidate`; `CURRENT_PREF4_BLOCKERS=0`.
- [x] **F.4 — Message Delete Lifecycle:** implementação, validação automatizada e aceite manual final de staging concluídos no par composto API/Web registrado no [contrato F.4](./f4-message-delete-lifecycle.md).

## Stage atual

Próximo stage oficial: [SCREEN_SHARE_UX_01](./screen-share-ux.md), preflight
completo e contrato aceito/congelado; SSUX.1 aceito para continuação e SSUX.2
implementado/validado. SSUX.3 teve [validação técnica e publicação Web aprovadas](./screen-share-ux.md#21-ssux3-technical-release-candidate-and-operator-handoff--2026-09-11), incluindo áudio Screen aceito; candidato de áudio genérico 64 kbps publicado; matriz manual pausada até rollout e R01 (§23), stage ainda não aceito. Voice & Audio está congelado;
Voice Connection Quality permanece NOT_STARTED e vem depois de Screen Share UX
por decisão de prioridade do owner em 2026-09-11. Ponteiros de próximo stage nos
resumos de fechamentos anteriores abaixo são históricos, supersedidos por esta ordem.

- [x] **F.5 — Invite / Server Entry — COMPLETE:** F.5.1 a F.5.5 foram aceitas. O aceite final de F.5.5, inclusive smoke visual, usou o runtime misto intencional registrado no [contrato dedicado](./f5-channel-category-management.md): API F.5.4.1 e Web final Web-only.
- [x] **F.6 — Voice UX — COMPLETE / FROZEN:** C1–C4 e o smoke Web-only final foram aceitos no runtime imutável do [contrato F6](./f6-voice-ux.md). O antigo resumo de C4 pendente está supersedido por esse fechamento.
- [x] **F.7 — Core User UX Polish — COMPLETE / FROZEN:** F7.1/F7.2/F7.3 aceitas; F7.3 final 38/38 PASS. [Fechamento e runtime final](./f7-core-user-ux.md#20-final-f7-staging-acceptance-and-milestone-closure--2026-09-03) registrados, zero bloqueadores de fechamento. W3 permanece dívida fora de F7, sem correção. F5/F6 continuam congeladas.
- [x] **LINK_PREVIEW_01 — COMPLETE / ACCEPTED / FROZEN:** o [owner dedicado](./link-preview.md#31-lp3-final-owner-acceptance-and-feature-freeze--2026-09-09) registra LP.1/LP.2, o rollout técnico LP.3 e o aceite final de Staging: 22 PASS, 0 FAIL, 2 evidências runtime explicitamente deferidas pelo proprietário e 0 pendências ativas. Os limites e a matriz pertencem ao owner; o próximo stage oficial é `VOICE_AUDIO_SETTINGS_01`.

## Antes do RC

- [ ] Completar evidência da matriz Mute/Deafen e corrigir qualquer delta confirmado.
- [ ] Corrigir Username -> UUID regression.
- [ ] Fazer sweep geral de bugs/UX blockers.
- [ ] Stage 1/D — Backup / Restore / VPS Operations.
- [ ] Concluir `TEST-HARDEN-01` e adotar `QA-GATE-01`.
- [ ] Concluir `SEC-APP-AUDIT-01`, remediações exigidas e `SEC-DAST-01`.
- [ ] Aceitar `RC-STABILIZATION` e `RC-SECURITY-GATE`.
- [ ] Release Candidate / Beta Gate.

---

# 18. Princípios de UI/UX acordados

- [x] Não copiar visualmente o Discord; usar seus padrões de interação apenas quando forem familiares e úteis.
- [x] Usar ícones/SVG próprios do Likecord.
- [x] URL representa navegação persistente, não estados efêmeros de Voice/Screen Share.
- [x] PostgreSQL é a fonte durável para preferências importantes de usuário.
- [x] Não transformar frontend storage em banco paralelo de preferências.
- [x] Voice connection não deve mudar ao navegar por text channels.
- [x] Screen Share transport não deve mudar ao navegar por text channels.
- [x] Observer de Voice pode ver presence sem iniciar WebRTC.
- [x] Volume individual é sempre local ao listener.
- [x] Mic/Call audio e Screen Share audio permanecem semanticamente separados.
- [x] Realtime deve respeitar permissões e não vazar metadata.
- [x] A aplicação deve permanecer server-authoritative; UI realtime converge para o estado persistido.
- [x] O frontend cuida de apresentação, interação, dicas de UX e controles ocultos/desabilitados; visibilidade ou estado visual nunca constitui fronteira de segurança autoritativa.
- [x] O backend aplica independentemente autenticação, autorização, validação de entrada, regras de negócio, ownership de recursos e permissões.

---

# 19. Checklist resumido para acompanhar daqui em diante

## Gate concluído — SEC-PREF4

- [x] `SEC-BUILD-01`, `SEC-WS-01` e alinhamento runtime suplementar, `SEC-TURN-01`, `RUNTIME-NODE-01` e `WEB-NEXT-01`.
- [x] Baseline de staging, readiness R2 e pacote de rollback.
- [x] `APPLICATION_READINESS_RACE=CORRECTED`; Block 4A concluído.
- [x] Candidate images e aceite integrado de staging concluídos.
- [x] `SEC_PREF4_FINAL_GATE_PASS=true`; `CURRENT_PREF4_BLOCKERS=0`.
- [x] F.4 concluído no par composto API/Web aceito; a diferença intencional de SHAs e imagens está registrada no contrato F.4 e não reabre `SEC-PREF4`.
- [x] F.5.1 implementada, validada automaticamente e aceita em staging no par imutável registrado no contrato F.5.
- [x] F.5.2 Add a Server: aceite manual final de staging concluído no par composto imutável registrado no contrato F.5.
- [x] F.5.5 foi encerrada com publicação Web imutável e aceite manual final; o runtime aceito está registrado em [f5-channel-category-management.md](./f5-channel-category-management.md).

## F.3 — Realtime Channels — concluído

- [x] Text Create realtime.
- [x] Voice Create realtime.
- [x] Rename/update realtime, se suportado.
- [x] Delete realtime, se suportado.
- [x] Idempotência.
- [x] Permission-safe.
- [x] Canonical URL fallback no delete.

## F.4 — Message Delete

Contrato de lifecycle: [f4-message-delete-lifecycle.md](./f4-message-delete-lifecycle.md). Este checklist permanece a referência de UX; persistência, cleanup e payloads pertencem ao contrato dedicado.

- [x] Modal implementado e coberto por testes automatizados.
- [x] Remoção real implementada e coberta por testes automatizados.
- [x] Realtime implementado e coberto por testes automatizados.
- [x] Attachment cleanup implementado e coberto por testes automatizados.
- [x] Aceite manual final de staging do par composto API/Web.
- [x] Normal click abre confirmação; Shift+click bypassa somente o modal e usa o mesmo lifecycle autorizado.

## F.5 — Invite / Server Entry

Contrato específico: [f5-invite-server-entry.md](./f5-invite-server-entry.md). Este checklist mantém a visão resumida; segurança, permissões, baseline atual, ambiguidades e sequência proposta pertencem ao contrato dedicado.

- [x] `/invite/{code}`.
- [x] Invite preview público mínimo e estado autenticado autoritativo.
- [x] Auth return-to-invite seguro, sem aceite implícito.
- [x] Explicit Accept atômico/idempotente com convergência realtime do usuário ingressante.
- [x] Already member -> Open Server pela navegação canônica.
- [x] Add a Server modal — implementação, validação automatizada e aceite manual de staging concluídos.
- [x] Create Server — reuso, validação automatizada e aceite manual de staging concluídos.
- [x] Join Server — normalização/preview/Accept, validação automatizada e aceite manual de staging concluídos.
- [x] **F.5.3 — COMPLETE:** Server Header menu, Invite People, Create Channel/Category, Leave/Delete, realtime room lifecycle e Member List após Invite Join passaram no aceite manual final.
- [x] **F.5.3.1 — COMPLETE:** o runtime final de source `member list join convergence milestone` convergiu a room do owner após criação e passou o cenário Server novo → Invite Join sem F5/troca.
- [x] **F.5.4 — Server Settings & Invite Administration — COMPLETE:** o runtime corretivo imutável de source `administration creation flow milestone` passou o aceite manual final conforme [contrato autoritativo](./f5-server-settings-invite-admin.md).
- [x] **F.5.5 — Channel & Category Management UX — COMPLETE:** aceite manual final e smoke visual aprovados no runtime misto Web-only registrado em [f5-channel-category-management.md](./f5-channel-category-management.md).

## F.6 — Voice UX

F.6 está completo e congelado. A discovery está concluída e o
[contrato dedicado](./f6-voice-ux.md) é a autoridade de baseline, escopo,
eventos-alvo, persistência, critérios de aceite e sequência. Os itens abaixo
permanecem como visão resumida de implementação e não substituem o contrato.

- [x] Voice members visible under every visible Voice Channel — C1 automated pass; manual staging passed (see the dedicated C2 acceptance record).
- [x] Socket disconnect fails Voice/Screen Share closed; reconnect refreshes occupancy without automatic rejoin — C1 automated pass; manual staging passed (see the dedicated C2 acceptance record).
- [x] Speaking ring — C2A automated pass; manual staging passed (see the dedicated C2 acceptance record).
- [x] Right-click/keyboard Voice participant popover — C2B automated pass; manual staging passed (see the dedicated C2 acceptance record).
- [x] Per-user volume 0–100% and remote local mute — C2B/C3 automated pass; accepted C2 playback semantics preserved.
- [x] PostgreSQL personal mix — C3 migration/API/hydration/write/reset automated pass; staging migration and manual C3 durability/media accepted in the [dedicated record](./f6-voice-ux.md#accepted-c3-staging-evidence--2026-09-02).
- [x] C4 final popover polish — explicit Reset button removed; API DELETE/reset preserved; final automated regression and bounded Web-only staging smoke passed on the final immutable runtime in the [dedicated contract](./f6-voice-ux.md#final-accepted-f6-runtime-and-c4-staging-smoke--2026-09-02).

F6 did not redesign the Member List context menu. That follow-on work now belongs
to the finalized [F7 contract](./f7-core-user-ux.md); the later F7.1 implementation
status is recorded below. Separately owned before-RC work is not started by F7.1.

```text
F6_NEXT_STAGE=false
F6_STAGE_ACTIVE=false
F6_DISCOVERY_STARTED=true
F6_DISCOVERY_COMPLETE=true
F6_CONTRACT_FINALIZED=true
F6_IMPLEMENTATION_STARTED=true
F6_C1_IMPLEMENTED=true
F6_C1_AUTOMATED_VALIDATION_PASS=true
F6_C1_MANUAL_STAGING_PENDING=false
F6_C1_MANUAL_STAGING_PASS=true
F6_C2_STARTED=true
F6_C2A_IMPLEMENTED=true
F6_C2A_AUTOMATED_VALIDATION_PASS=true
F6_C2_IMPLEMENTED=true
F6_C2_AUTOMATED_VALIDATION_PASS=true
F6_C2_MANUAL_STAGING_PENDING=false
F6_C2_MANUAL_STAGING_PASS=true
F6_C2P_VISUAL_STAGING_PASS=true
F6_C2B_STARTED=true
F6_C2B_IMPLEMENTED=true
F6_C2B_AUTOMATED_VALIDATION_PASS=true
F6_C3_STARTED=true
F6_C3_IMPLEMENTED=true
F6_C3_AUTOMATED_VALIDATION_PASS=true
F6_C3_MANUAL_STAGING_PENDING=false
F6_C3_MANUAL_STAGING_PASS=true
F6_C3_STAGING_ACCEPTED=true
F6_C4_STARTED=true
F6_C4_IMPLEMENTED=true
F6_C4_AUTOMATED_VALIDATION_PASS=true
F6_C4_MANUAL_STAGING_PASS=true
F6_C4_STAGING_ACCEPTED=true
F6_C4_MANUAL_STAGING_PENDING=false
F6_C4_FINAL_WEB_ARTIFACT_PENDING=false
F6_STAGE_COMPLETE=true
F6_CONTRACT_FROZEN=true
```

## F.7 — Core User UX Polish — COMPLETE / FROZEN

O [contrato F7](./f7-core-user-ux.md) é a autoridade de baseline, matriz de
permissões, limites de API/persistência, acessibilidade e aceite. Discovery
concluída; F7.1/F7.2/F7.3 aceitas em staging conforme evidência fornecida pelo
usuário. F7 completa/congelada, sem bloqueadores de fechamento. O
[registro final](./f7-core-user-ux.md#20-final-f7-staging-acceptance-and-milestone-closure--2026-09-03)
é dono do runtime misto intencional: API F7.2 e Web F7.3, com sources diferentes.

- [x] **F7.1 — Member Context Menu — STAGING ACEITO:** os 40 checks do smoke
  limitado passaram segundo o usuário. Artefato imutável e evidência no
  [aceite F7.1](./f7-core-user-ux.md#15-f71-manual-staging-acceptance--recorded-2026-09-02);
  a F7.2 não repete essa bateria.
- [x] **F7.2 — Home `/channels/@me` — STAGING ACEITO:** welcome,
  servidores, estados/retry, Add Server e Continue sobre UserServerPreference.
  Núcleo 40/40 e smoke Home F7.2R 16/16 aprovados. Artefatos do runtime misto no
  [aceite F7.2](./f7-core-user-ux.md#18-f72-final-staging-acceptance--recorded-2026-09-02).
  Sem novo tracking; bateria aceita não repetida pela F7.3.
- [x] **F7.3 — sweep limitado — STAGING ACEITO, 38/38 PASS:** W1
  integra teclado/foco nos menus existentes; W2 contém MessageDeleteModal; W4
  usa cópia genérica de Invite indisponível. W3 reproduzido e escalado fora de F7
  por falta de correlação otimista no payload WS; sem correção de produção.
  Evidência de implementação no [registro F7.3](./f7-core-user-ux.md#19-f73-bounded-sweep-implementation-and-triage)
  e aceite no registro final. W1/W2/W4 passaram; W3 mantém a disposição aceita
  `escalated_outside_f7`, sem impedir fechamento. Envio/receiver corretos e ausência
  de duplicação persistida observável passaram no staging, sem afirmar fim do flicker.
- [x] **Aceite/reconciliação final F7 — COMPLETE / FROZEN:** todos os quatro
  pacotes possuem disposição final; runtime registrado; zero bloqueadores de
  fechamento. Sem F7.4 funcional ou adoção dos gates pre-RC.

Move to Voice e Server Deafen administrativos permanecem diferidos: bits de
permissão existentes não equivalem a operações implementadas. Responsividade
mobile, presença, segurança, operações e dívidas Voice/pre-RC mantêm seus donos.
Os registros históricos de dívidas abaixo permanecem evidência; o contrato F7
define apenas o recorte concluído e as dívidas que continuam fora dele.

`COMPLETE / FROZEN / member_voice_context_menu_convergence`:
C1–C4 concluídas conforme D01-A/D02-A e arquitetura B; validação automatizada e
M01–M08 manuais aceitos. O [fechamento no contrato dedicado](./member-voice-context-menu-convergence.md#24-final-staging-acceptance-and-contract-closure--recorded-2026-09-03)
é a autoridade sobre evidências, runtime imutável e zero blockers deste contrato.
A expansão funcional UX deliberada atualmente planejada após F7 está concluída.
O trabalho visual posterior é delimitado em `VISUAL_IDENTITY_01`, abaixo;
não reabre a expansão funcional nem os contratos congelados. Os pré-requisitos
pendentes de produto, operações, QA e segurança continuam exigindo reconciliação
antes dos gates formais. Somente um novo blocker material de release demonstrado
justifica escopo funcional adicional. F5/F6/F7 permanecem congelados, sem novo
blocker formal de RC introduzido pelo branding.
As dívidas abaixo mantêm seus donos/status e a ordem formal da seção 24.2
permanece inalterada.

## VISUAL_IDENTITY_01 — VI.1–VI.7 completa / aceita / congelada

- [x] **VI.0 — DISCOVERY_COMPLETE / CONTRACT_FINALIZED / IMPLEMENTATION_READY:**
  auditoria estática do frontend e inspeção das quatro referências locais;
  inventários, direção visual, tokens propostos, limites dos assets, fatias/riscos
  e matrizes futuras de aceite no
  [contrato de identidade visual](./visual-identity-refresh.md).
- [x] **VI.1 — Foundation & Brand Assets: IMPLEMENTED / AUTOMATED_VALIDATION_PASS**;
  tokens/fundação global e cópia byte-idêntica do ícone implementados. Jest Web
  32 suítes/525 testes, typecheck e lint sem erros; sanity visual local limitado.
  **MANUAL_STAGING_PASS (checkpoint até VI.3R2)**: o aceite cobre o primeiro checkpoint,
  não o aceite visual completo V01–V10. Evidência e limites na
  [seção VI.1 do contrato](./visual-identity-refresh.md#13-vi1-foundation--brand-assets--implemented-2026-09-03).
- [x] **VI.2 — Shared UI Primitives: IMPLEMENTED / AUTOMATED_VALIDATION_PASS**;
  variantes explícitas de controles nativos, Tooltip, ContextMenu, fundação de
  diálogos, navegação compartilhada de Settings e feedback genérico. Regressão
  focada: 12 suítes/202 testes; Web completo: 32 suítes/525 testes; typecheck e
  lint sem erros. **MANUAL_STAGING_PASS (checkpoint até VI.3R2)**; escopo, compatibilidade, contraste
  e limites do sanity local na
  [seção VI.2 do contrato](./visual-identity-refresh.md#14-vi2-shared-ui-primitives--implemented-2026-09-03).
- [x] **VI.3 — Navigation & App Shell: IMPLEMENTED / AUTOMATED_VALIDATION_PASS**;
  ServerRail, ChannelSidebar, MemberPanel, Home e headers persistentes atualizados.
  Testes focados: 10 suítes/218 testes; Web completo: 32 suítes/525 testes;
  typecheck e lint sem erros. Sanity local populado e overflow/foco verificados;
  **MANUAL_STAGING_PASS (checkpoint até VI.3R2)**. Evidência na
  [seção VI.3 do contrato](./visual-identity-refresh.md#15-vi3-navigation--app-shell--implemented-2026-09-03).
- [x] **VI.3R — Shell Depth & Layout Reconciliation: IMPLEMENTED / AUTOMATED_VALIDATION_PASS**;
  profundidade Depth 0–4 reconciliada, header do workspace compartilhado,
  UserPanel sob ServerRail + ChannelSidebar, Add Server dentro da lista e
  scrollbars/slots de ícones delimitados. Testes focados: 10 suítes/219 testes;
  Web completo: 32 suítes/527 testes; typecheck e lint sem erros. Sanity local
  confirmou profundidade, foco, nomes longos, menus/modais e overflow interno;
  zoom real 100%/125%/150% passou no checkpoint VI.3R2. **MANUAL_STAGING_PASS (checkpoint até VI.3R2)**.
  Evidência na
  [seção VI.3R do contrato](./visual-identity-refresh.md#16-vi3r-shell-depth--layout-reconciliation--implemented-2026-09-04).
- [x] **VI.3R2 — First Checkpoint Visual Tuning: IMPLEMENTED / AUTOMATED_VALIDATION_PASS**;
  hierarquia de navegação/workspace refinada, faixa persistente de UserPanel e
  composer reconciliada, canal ativo simplificado, Add Server diferenciado e
  modal de criação ajustado com escopo local. Testes focados: 6 suítes/163 testes;
  Web completo: 32 suítes/527 testes; typecheck e lint sem erros. Sanity local
  confirmou cores, foco, seleção, truncamento, modal e overflow sem deslocamento;
  zoom real 100%/125%/150% passou no checkpoint VI.3R2. **MANUAL_STAGING_PASS (checkpoint até VI.3R2)**.
  Evidência na
  [seção VI.3R2 do contrato](./visual-identity-refresh.md#17-vi3r2-first-checkpoint-visual-tuning--implemented-2026-09-04).
- [x] **VI.3R3 — User-Validated Shell Cleanup: IMPLEMENTED / AUTOMATED_VALIDATION_PASS / MANUAL_STAGING_PASS**;
  correções explícitas da inspeção do usuário aplicadas ao shell, seleção e
  rodapé, preservando os demais tratamentos VI.3R2. Finalização de 2026-09-05:
  headers efetivos alinhados em 48px, títulos de modais com quebra segura,
  wrapper do UserPanel primário e bordas transparentes restritas às ações de
  criação. Focados 7 suítes/205 testes; Web completo 32 suítes/527 testes;
  typecheck e lint sem erros. Sanity local confirmou geometria, títulos e estados;
  validação manual local passou em 100%/125%/150%, sem overlap; **MANUAL_STAGING_PASS / ACCEPTED=true**.
  Decisões e limites no
  [registro final VI.3R3](./visual-identity-refresh.md#184-final-vi3r3-user-refinements--implemented-2026-09-05).
- [x] **Refinamento pontual pós-VI.3R3 / pré-VI.4:** o inset externo do wrapper
  persistente do UserPanel foi estabilizado em `var(--space-2)`. Não reabre o
  aceite VI.3R3. Os três inputs locais então preservados foram consumidos pela
  primeira fatia delimitada de VI.4.
- [x] **VI.4 — Messaging & Management: IMPLEMENTATION_COMPLETE / AUTOMATED_VALIDATION_PASS / MANUAL_VALIDATION_PASS / COMPLETE / ACCEPTED:** primeira
  fatia delimitada implementada e validada automaticamente: inset externo
  compacto do Composer, escolhas de tipo de canal sem contorno redundante,
  remoção do `border-color` obsoleto do estado marcado e preset de canal privado
  com menor contenção. Focados 13 suítes/161 testes; Web completo 32 suítes/527
  testes; zero snapshots; typecheck e lint sem erros, com 87 avisos preexistentes;
  `git diff --check` aprovado. A segunda fatia delimitada refinou linhas e ações
  de mensagem, edição inline, anexos/nomes longos/estados pendentes e a superfície
  visual existente de exclusão, sem alterar scroll, Composer, sender/realtime,
  upload/storage ou lifecycle F.4. Focados 5 suítes/68 testes; Web completo 32
  suítes/530 testes; zero snapshots; typecheck e lint sem erros, com os mesmos 87
  avisos preexistentes; `git diff --check` aprovado. A terceira fatia concluiu a
  apresentação de Server Settings, Roles, Members, Invite People/Administração,
  Channel/Category Settings e `PermissionOverwriteEditor`, mantendo hierarquia,
  permissões, lifecycles e scroll. Linhas administrativas ficaram densas e sem
  elevação; estados, perigo, proteção e `DENY / NEUTRAL / ALLOW` permanecem
  textuais/simbólicos e semânticos. Focados 10 suítes/125 testes; Web completo 32
  suítes/530 testes; zero snapshots; typecheck e lint sem erros, com os mesmos 87
  avisos; `git diff --check` aprovado. A reconciliação das três fatias encontrou
  `VI4_REMAINING_IMPLEMENTATION_SCOPE=none` e a implementação de produção VI.4
  está concluída. O candidato imutável VI.4R2 foi publicado, implantado somente
  no Web local e validado manualmente em 100%/125%/150%; `VI_4_COMPLETE=true` e
  `VI_4_ACCEPTED=true`. Evidência completa está no [registro de aceite final](./visual-identity-refresh.md#23-vi4-formal-acceptance--recorded-2026-09-05).
- [x] **VI.4R — User-Directed Final Surface Reconciliation: IMPLEMENTED /
  AUTOMATED_VALIDATION_PASS / MANUAL_VALIDATION_PASS:** o candidato VI.4
  anterior (`web jest execution milestone`, OCI index
  `sha256:88c147465be25967434f7f2390595f39d100e255b8013c21677275cb116b089a`)
  passou V4-01–V4-12, zoom real 100%/125%/150% e V4-14. Esse PASS permanece
  evidência histórica válida. Depois dele, a decisão explícita do usuário
  reconciliou Rail/Channel Sidebar/Channel Header/Settings Sidebar no papel
  secundário; App/Chat Header, Main Content, Message List, Member Panel e
  Settings Main no terciário; wrapper do UserPanel transparente; e base
  compartilhada de botões sem borda genérica. Focados 11 suítes/152 testes;
  Web completo 32 suítes/530 testes; zero snapshots; typecheck e lint sem erros,
  com os mesmos 87 avisos; `git diff --check` aprovado. Essa reconciliação foi
  aceita no fechamento formal de VI.4.
- [x] **VI.4R2 — Invite Administration toolbar micro-refinement: IMPLEMENTED /
  AUTOMATED_VALIDATION_PASS / MANUAL_VALIDATION_PASS:** `.invite-admin-toolbar`
  agora usa `var(--bg-tertiary)` e removeu o `border-bottom` redundante, sem
  alteração de geometria ou comportamento. As duas suítes focadas passaram
  (14 testes, zero snapshots). Publicação, troca somente do Web local e
  confirmação visual da toolbar passou em 100%/125%/150%; VI.4 está completo e aceito.
- [x] **VI.5 preflight — COMPLETE / IMPLEMENTATION_READY / NOT_STARTED AT
  PREFLIGHT CLOSURE:** owners
  reais de Voice/Screen Share, limites visuais/funcionais e de mídia/layout,
  mapa de testes, checkpoint manual e duas fatias delimitadas reconciliados na
  [seção VI.5 do contrato](./visual-identity-refresh.md#24-vi5-voice--screen-share-preflight--completed-2026-09-05).
  Nenhum source de produção, Voice/WebRTC, Screen Share, Presence ou runtime foi
  alterado; VI.4 e os contratos funcionais permanecem congelados.
- [x] **VI.5A Voice — IMPLEMENTED / AUTOMATED_VALIDATION_PASS /
  MANUAL_VALIDATION_PASS:** Channel Sidebar Voice/participant/speaking,
  UserPanel connected/mute/deafen/leave e o popover/mix/contexto de Voice foram
  refinados somente em apresentação e acessibilidade delimitada. Focados
  11 suítes/230 testes e Web completo 32 suítes/531 testes, zero snapshots;
  typecheck, lint com 0 erros/87 avisos inalterados e diff-check passaram.
  Nenhum hook/callback/estado, Presence, Voice/WebRTC, Screen Share ou runtime
  mudou. Evidência e limites estão na
  [seção VI.5A](./visual-identity-refresh.md#25-vi5a-voice-presentation--implemented-2026-09-05).
- [x] **VI.5B Screen Share — IMPLEMENTED / AUTOMATED_VALIDATION_PASS /
  MANUAL_VALIDATION_PASS:** Live Streams, controle do UserPanel, workspace,
  galeria/foco, detached/hidden, preview local, card do apresentador e estados
  existentes foram refinados somente em apresentação. Focados 7 suítes/247
  testes e Web completo 32 suítes/531 testes, zero snapshots; typecheck, lint
  com 0 erros/87 avisos inalterados e diff-check passaram. AppContent,
  ScreenStreamVideo, `object-fit`, lifecycle, subscriptions, transporte,
  Voice/Presence e scroll/layout permanecem inalterados. VI.5A + VI.5B cobrem
  todo o escopo de implementação VI.5 atual. Publicação Web imutável, validação
  local e todos os checkpoints Staging foram aceitos no
  [registro de fechamento VI.5](./visual-identity-refresh.md#27-vi5-formal-acceptance-and-milestone-closure--recorded-2026-09-05).
- [x] **VI.6 preflight — COMPLETE / IMPLEMENTATION_READY:** a
  [seção 28 do contrato](./visual-identity-refresh.md#28-vi6-auth--entry--system-states-preflight--completed-2026-09-05)
  registra as rotas reais, owners de apresentação e comportamento, estados
  sistêmicos, limites de acessibilidade, testes existentes e duas fatias
  delimitadas. O resultado é Web-only, sem mudança de API, banco ou contrato de
  Auth. Auth/Entry pertence a VI.6A; bootstrap e estados de rota pertencem a
  VI.6B. Home, Messaging/Management, Voice e Screen Share aceitos permanecem
  congelados.
- [x] **VI.6A — Auth & Entry: INITIAL_MANUAL_VALIDATION_PASS /
  R1_IMPLEMENTED / R1_AUTOMATED_VALIDATION_PASS /
  R1_MANUAL_VALIDATION_PASS / COMPLETE:** Login, Register, Invite e Add Server receberam
  a hierarquia compacta dark-first, ícone canônico nas rotas públicas, controles
  compartilhados, estados semânticos e overflow local delimitado. O checkpoint
  humano inicial passou; a **VI.6A targeted visual reconciliation** altera apenas
  `.auth-card` de `--bg-primary` para `--bg-secondary`, para Login/Register/Invite.
  Add Server e comportamentos Auth/Invite permanecem inalterados. O recheck R1
  delimitado passou em Login/Register/Invite a 100%/125%/150%, sem observações;
  a evidência está na [seção VI.6A do contrato](./visual-identity-refresh.md#292-vi6a-manual-validation-closure--recorded-2026-09-05).
- [x] **VI.6B — Bootstrap & route-level System States: IMPLEMENTED /
  AUTOMATED_VALIDATION_PASS / MANUAL_VALIDATION_PASS:** bootstrap protegido,
  redirect legado `/app` e os estados existentes de loading, indisponibilidade,
  ausência de Text Channels acessíveis e seleção de canal receberam apresentação
  compacta, neutra, responsiva localmente e sem cards/elevations adicionais.
  Metadados `status`/`aria-live`/`aria-busy` refletem apenas estado existente.
  Focados Web Jest: 3 suítes/41 testes; Web completo: 33 suítes/537 testes; zero
  snapshots; typecheck passou; lint passou com 0 erros/87 avisos inalterados.
  Auth, routing, AppContent, WebSocket, Presence, Voice e Screen Share não mudaram.
  Evidência de implementação está na [seção VI.6B](./visual-identity-refresh.md#30-vi6b-bootstrap--route-level-system-states--implemented-2026-09-05)
  e o aceite consolidado está na [seção 31](./visual-identity-refresh.md#31-vi6-formal-acceptance-and-milestone-closure--recorded-2026-09-06).
- [x] **VI.6 — COMPLETE / ACCEPTED:** o checkpoint humano local consolidado
  passou. B7, B8 e B10 permanecem `NOT_TESTED_ENVIRONMENT_LIMITATION`, não são
  falhas e não bloqueiam o aceite. Staging não é requisito de aceitação para
  este slice Web-only; a identidade OCI aceita está no fechamento do contrato.
- [x] **VI.7 — IMPLEMENTED / AUTOMATED_VALIDATION_PASS /
  MANUAL_VALIDATION_PASS / FINAL_STAGING_VALIDATION_PASS / COMPLETE / ACCEPTED:** a
  [seção 32 do contrato](./visual-identity-refresh.md#32-vi7-final-visual-regression--polish-preflight--completed-2026-09-06)
  aplicou V01–V10 ao source atual e determinou
  `VI7_IMPLEMENTATION_REQUIRED=true`, com uma única fatia Web-only delimitada.
  Os únicos deltas elegíveis são: remover o separador inferior de
  `.voice-connection`; normalizar o hover comum de `.user-menu-item`; consumir o
  fundo danger sutil no erro do MemberPanel; alinhar sombra/hover do indicador de
  novas mensagens aos tokens existentes; e expor nome/current-page verdadeiros
  no Add Server, servidor ativo e Text Channel ativo. A fatia possui somente
  `globals.css`, `ServerRail.tsx` e `ChannelSidebar.tsx` como owners de produção.
  Implementação limitada aos seis deltas autorizados nos três owners de produção;
  Add Server, servidor ativo e Text Channel ativo receberam os metadados
  acessíveis previstos, e as quatro regras CSS foram reconciliadas somente com
  tokens existentes. A suíte focada passou 6 suítes/144 testes e a Web completa
  passou 33 suítes/537 testes, ambas com zero snapshots; typecheck passou; lint
  passou com 0 erros/87 avisos inalterados; `git diff --check` passou. Nenhuma
  fatia VI.7 cria F-stage ou reabre F5/F6/F7/Member–Voice/VI.3–VI.6. Evidência
  completa na [seção 33 do contrato](./visual-identity-refresh.md#33-vi7-final-visual-regression--polish--implemented-2026-09-06).
  O aceite final foi registrado na [seção 34 do contrato](./visual-identity-refresh.md#34-vi7-final-acceptance-and-visual_identity_01-closure--recorded-2026-09-06):
  o candidato Web imutável `ghcr.io/ryezuo/likecord-web@sha256:e6032fe6f213d228f906c70e06fe43723bf79209a74eed1494392c4bb5fb6647`
  foi implantado em Staging pelo operador, o Web permaneceu saudável, os
  serviços não-Web foram preservados, e V01–V10, zoom 100%/125%/150%, altura
  reduzida e os cenários multi-cliente de Voice/Screen Share passaram.

O **primeiro checkpoint de staging VI.1–VI.3R2 e sua fundação/direção estão
aceitos**. Identidade imutável Web/API, revisão/plataforma OCI, verificação do
ícone e R01–R10 PASS pertencem ao
[registro de aceite VI.3R2](./visual-identity-refresh.md#174-vi3r2-first-staging-checkpoint--accepted).
A lacuna documental de publicação/staging VI.3R2 foi resolvida. O aceite final
de VI.3R3 está registrado na [seção 18.5 do contrato](./visual-identity-refresh.md#185-final-vi3r3-acceptance--recorded-2026-09-05).

O milestone `VISUAL_IDENTITY_01` está completo, aceito e congelado. O artefato
final, a evidência de Staging e a matriz V01–V10 estão registrados na seção 34
do contrato. Wordmark limpo e small mark permanecem dívidas de assets; favicon
não mudou. As referências em `docs/design/likecord-brand-reference/` continuam
locais, não rastreadas e intocadas; somente a cópia canônica do ícone foi
promovida para `apps/web/public/brand/likecord-icon.png`.

## POST_VI_PRODUCT_UX_01 — THEME_ENGINE_01 completo, aceito e congelado

O [contrato pós-VI](./post-vi-product-ux.md) é o dono atual da reconciliação de
todo o backlog UI/UX `FUTURE / OPTIONAL / DEFERRED / POLISH`, das classificações,
dependências e da sequência de implementação antes dos gates formais pre-RC.
O preflight somente de leitura está completo. `USER_SETTINGS_01` foi autorizado
explicitamente, implementado e agora está completo, aceito e congelado. Slice A implementou `UserPreference`
tipado um-para-um, `showSendButton=false`, a migration
`20260906120000_add_user_preferences` e `GET/PATCH /users/@me/preferences`.
Slice B implementou a camada User Settings montada sobre o `AppContent`
persistente, `My Account` com `displayName`/`bio`, identidade somente leitura,
Log Out pelo dono Auth existente e hidratação tipada com loading/error/retry no
`UserPreferencesProvider` autenticado. Abrir/fechar Settings preserva rota,
WebSocket, Voice, Screen Share e Chat montados. Slice C implementou `APP SETTINGS
-> Appearance`, persistência imediata e serializada de Show Send Button pelo
mesmo provider e o botão Send opcional no Composer, convergindo botão/Enter no
mesmo submit e preservando Shift+Enter, anexos, permissões e messaging/realtime.
As Slices A–C estão `IMPLEMENTATION_COMPLETE / AUTOMATED_VALIDATION_PASS`; o
runtime integrado final, a migration de Staging e a matriz manual US01–US16
foram aceitos com PASS, incluindo zoom 100%/125%/150% e altura reduzida. O
contrato autoritativo registra a identidade exata do source `appearance preferences milestone`, os refs imutáveis API/Web, a decisão
page-layer e a regra de freeze. A observação de que Display Name não propaga em
realtime para outros clientes permanece não corrigida e não bloqueia esta etapa.
`ACCOUNT_SECURITY_01` está completo, aceito e congelado após AS.3;
`USER_AVATAR_01` está completo, aceito e congelado após o runtime integrado, Staging e aceite
manual final registrados no dono dedicado. O [owner de USER_AVATAR_02](./user-avatar-v2.md)
registra o preflight combinado concluído e o contrato aceito/congelado para Crop
& Position e Animated GIF/WebP. AV2.1 está implementado, validado automaticamente
e aceito para continuação. O primeiro probe AV2.2 permanece FAIL, com capacidades
de codec comprovadas preservadas; o probe complementar validou o limite de processo
filho e o headroom operacional, mas falhou a meta de memória por animação no teto
antigo. O teto aceito permanece 48 MiB / 12.582.912 pixel-frames após o PASS da
confirmação focada. AV2.2 está implementado, com validação automatizada e prova
local Linux aprovadas. O primeiro rollout integrado expôs a falha de preview
animado em UA2-M05/UA2-M06; a remediação Web limitada, a publicação API/Web do
mesmo source, o rollout técnico final e a matriz manual completa UA2-M01–M26
passaram. USER_AVATAR_02 está [completo, aceito e congelado](./user-avatar-v2.md#21-final-integrated-acceptance-and-freeze--2026-09-07).
O bloqueio de resolução de módulo descoberto no primeiro
smoke do CMD padrão de produção foi corrigido e a
[sanidade de release passou](./user-avatar-v2.md#19-production-default-cmd-release-sanity-remediation--2026-09-06);
nenhuma imagem foi publicada nessa remediação.
O [contrato dedicado de THEME_ENGINE_01](./theme-engine.md) registra o preflight,
a descoberta de source, o inventário de tokens e as matrizes futuras. TE01-D01
até TE01-D10 estão finalizadas, aceitas e congeladas, incluindo D04 Option B e
  D06 Option B. O stage está `IMPLEMENTATION_COMPLETE / TE.3_COMPLETE / COMPLETE /
  ACCEPTED / FROZEN`: o contrato tipado, migration, API, provider,
  bootstrap e a aplicação live de `data-theme`/UA `color-scheme` foram
  implementados. O escopo de tokens existente está exposto sob a identidade
  explícita de Likecord Default sem mudar valores; o seletor de um único tema
  permaneceu oculto em TE.3. A matriz histórica encerrou com 19 PASS e
  TE-M03/04/05/06/10 adiados até o segundo tema. W98.3 agora passou os cinco,
  reconciliando o total atual para 24 PASS / 0 N/A / 0 bloqueados sem reabrir o
  Theme Engine. A publicação, migration e Staging `PREPARE -> DEPLOY -> VERIFY`
  de TE.3 permanecem evidência aceita.
Os novos stages `LINK_PREVIEW_01` e `VOICE_CONNECTION_QUALITY_01` foram
explicitamente promovidos para o round atual antes do RC. Link Preview tem LP.1
e LP.2 implementados/validados e aguarda LP.3; Voice Connection Quality permanece
`NOT_STARTED`.
Itens `DEFER_AFTER_RC`, outros `SEPARATE_PRODUCT_FEATURE`, dívidas funcionais e
dependências de assets preservam os donos e limites registrados no contrato.
Camera permanece fora do round atual sob o identificador estável
`CAMERA_VIDEO_01`, `SEPARATE_PRODUCT_FEATURE / AFTER_RC / NOT_STARTED`.

`USER_SETTINGS_01` não deve ser reaberto para avatar, email/password, username,
Voice & Audio, Theme Engine, Language/i18n, responsive/mobile, profile realtime
propagation ou generic Settings polish. `USER_AVATAR_01` está completo, aceito e
congelado, prioridade `PROMOTE_BEFORE_RC`, conforme o [fechamento dedicado](./user-avatar.md#17-final-integrated-acceptance-and-freeze).
O contrato dedicado registra o aceite explícito dos três conjuntos de decisões
e as reconciliações de GC, limites de leitura e admissão local de processamento.
A [evidência da UA.2](./user-avatar.md#16-ua2-web-implementation-and-validation) e o
fechamento final registram a implementação Web, as referências imutáveis, o rollout
Staging e a matriz manual UA-M01–UA-M16. A
[aceitação integrada final de USER_AVATAR_02](./user-avatar-v2.md#21-final-integrated-acceptance-and-freeze--2026-09-07)
registra a publicação API/Web do mesmo source, o rollout Staging e a matriz
UA2-M01–M26 completa. Os resultados gerais dos probes anteriores continuam FAIL
como evidência histórica e a feature V1 permanece fechada.
O [runbook operacional](../operations/staging-vps.md) já está reconciliado com
`PREPARE -> DEPLOY -> VERIFY`. A ordem formal pre-RC permanece inalterada.

O [owner de ACCOUNT_SECURITY_01](./account-security.md) agora registra AS.1
backend/auth/session implementado com validação automatizada aprovada: identidade
de sessão durável em PostgreSQL, refresh estável, revogação REST/WS, migration de
email canônico com abort em colisão, mutações dedicadas, guarda estrita, rate
limits e AuditLog. AS.2 implementa e valida automaticamente a superfície Account
Security em Settings, formulários independentes, estado bounded de
`passwordChangeRequired`, reconciliação do AuthProvider, falha definitiva de
refresh fail-closed e preservação dos owners persistentes. AS.3 fechou o gap E2E
em PostgreSQL/Redis descartáveis, publicou API/Web do mesmo source, aplicou a
migration com backup e zero colisões, passou `PREPARE -> DEPLOY -> VERIFY` e a
matriz AS-M01–AS-M24, incluindo access/refresh/socket revogados e preservação de
Voice/Screen Share na sessão retida. Nenhum stage posterior foi iniciado.

```text
USER_SETTINGS_01_COMPLETE=true
USER_SETTINGS_01_ACCEPTED=true
USER_SETTINGS_01_CONTRACT_FROZEN=true
USER_SETTINGS_PRESENTATION=page_layer
USER_SETTINGS_MODAL_REQUIRED=false
USER_PROFILE_REALTIME_SYNC_OBSERVATION_RETAINED=true
USER_PROFILE_REALTIME_SYNC_FIXED=false
USER_PROFILE_REALTIME_SYNC_BLOCKS_USER_SETTINGS=false
USER_SETTINGS_RUNTIME_SOURCE_MILESTONE=appearance preferences milestone
USER_SETTINGS_API_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-api@sha256:6994d2142411267df03bfb5dae05ee6a7ace0d41bf659d80dfae9f3f1f7e4250
USER_SETTINGS_WEB_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-web@sha256:1ac8425b7cb13ea59c03ffab7be58c3168ae4ecd02985a07b601eb9f79ff33cb
STAGING_MIGRATION_EXECUTED=true
INTEGRATED_USER_SETTINGS_DEPLOYMENT_COMPLETE=true
USER_AVATAR_01_STATUS=COMPLETE_ACCEPTED_FROZEN
USER_AVATAR_01_STARTED=true
USER_AVATAR_01_PREFLIGHT_COMPLETE=true
USER_AVATAR_01_CONTRACT_FINALIZED=true
USER_AVATAR_01_CONTRACT_ACCEPTED=true
USER_AVATAR_01_CONTRACT_FROZEN=true
USER_AVATAR_01_IMPLEMENTATION_STARTED=true
USER_AVATAR_01_UA1_IMPLEMENTED=true
USER_AVATAR_01_UA2_IMPLEMENTED=true
USER_AVATAR_01_IMPLEMENTATION_COMPLETE=true
USER_AVATAR_01_AUTOMATED_VALIDATION_PASS=true
USER_AVATAR_01_FINAL_RUNTIME_VALIDATION_PENDING=false
USER_AVATAR_01_FINAL_RUNTIME_VALIDATION_PASS=true
USER_AVATAR_01_FINAL_STAGING_VALIDATION_PENDING=false
USER_AVATAR_01_FINAL_STAGING_VALIDATION_PASS=true
USER_AVATAR_01_COMPLETE=true
USER_AVATAR_01_ACCEPTED=true
USER_AVATAR_01_RUNTIME_SOURCE_MILESTONE=user avatar experience milestone
USER_AVATAR_01_API_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-api@sha256:8bb0fa7da166dc8fc8a2e2d997dcf057b827763fdbc560fe68f0921e2c7e4a55
USER_AVATAR_01_WEB_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-web@sha256:940bd612f7bd4ede620af7f9fb872be41cc5a79856c4e273c2808624a1c164bf
USER_AVATAR_02_STATUS=COMPLETE_ACCEPTED_FROZEN
USER_AVATAR_02_STARTED=true
USER_AVATAR_02_PREFLIGHT_COMPLETE=true
USER_AVATAR_02_CONTRACT_FINALIZED=true
USER_AVATAR_02_CONTRACT_ACCEPTED=true
USER_AVATAR_02_CONTRACT_FROZEN=true
USER_AVATAR_02_IMPLEMENTATION_STARTED=true
USER_AVATAR_02_AV21_CROP_POSITION_PLANNED=true
USER_AVATAR_02_AV21_IMPLEMENTED=true
USER_AVATAR_02_AV21_AUTOMATED_VALIDATION_PASS=true
USER_AVATAR_02_AV21_ACCEPTED_FOR_CONTINUATION=true
USER_AVATAR_02_AV22_ANIMATED_AVATAR_PLANNED=true
USER_AVATAR_02_AV22_IMPLEMENTED=true
AV22_FIRST_PROBE_PASS=false
AV22_CONTRACT_AMENDMENT_ACCEPTED=true
AV22_COMPLEMENTARY_PROBE_EXECUTED=true
AV22_COMPLEMENTARY_PROBE_PASS=false
AV22_RESOURCE_LIMITS_TIGHTENED=true
AV22_MAX_PIXEL_FRAMES=12582912
AV22_MAX_DECODED_RGBA_BYTES=50331648
AV22_RESOURCE_CONFIRMATION_REQUIRED=true
AV22_RESOURCE_CONFIRMATION_PASS=true
AV22_RUNTIME_FEASIBILITY_PROVEN=true
AV22_IMPLEMENTATION_BLOCKED=false
USER_AVATAR_02_ANIMATED_INPUT_SCOPE=GIF,ANIMATED_WEBP
USER_AVATAR_02_WEBM_INCLUDED=false
USER_AVATAR_02_APNG_INCLUDED=false
USER_AVATAR_02_SVG_INCLUDED=false
ACCOUNT_SECURITY_01_STARTED=true
ACCOUNT_SECURITY_01_PREFLIGHT_COMPLETE=true
ACCOUNT_SECURITY_01_CONTRACT_CREATED=true
ACCOUNT_SECURITY_01_CONTRACT_FINALIZED=true
ACCOUNT_SECURITY_01_CONTRACT_ACCEPTED=true
ACCOUNT_SECURITY_01_CONTRACT_FROZEN=true
ACCOUNT_SECURITY_01_IMPLEMENTATION_READY=true
ACCOUNT_SECURITY_01_IMPLEMENTATION_STARTED=true
ACCOUNT_SECURITY_01_AS1_STARTED=true
ACCOUNT_SECURITY_01_AS1_IMPLEMENTED=true
ACCOUNT_SECURITY_01_AS1_AUTOMATED_VALIDATION_PASS=true
ACCOUNT_SECURITY_01_AS2_STARTED=true
ACCOUNT_SECURITY_01_AS2_IMPLEMENTED=true
ACCOUNT_SECURITY_01_AS2_AUTOMATED_VALIDATION_PASS=true
AS2_API_E2E_REVALIDATED=true
AS2_API_E2E_PASS=true
ACCOUNT_SECURITY_01_AS3_COMPLETE=true
ACCOUNT_SECURITY_01_IMPLEMENTATION_COMPLETE=true
ACCOUNT_SECURITY_01_FINAL_STAGING_VALIDATION_PASS=true
ACCOUNT_SECURITY_01_FINAL_MANUAL_ACCEPTANCE_PASS=true
ACCOUNT_SECURITY_01_COMPLETE=true
ACCOUNT_SECURITY_01_ACCEPTED=true
ACCOUNT_SECURITY_01_FROZEN=true
ACCOUNT_SECURITY_01_USER_DECISIONS_PENDING=false
ACCOUNT_SECURITY_01_RUNTIME_SOURCE_MILESTONE=account security controls milestone
ACCOUNT_SECURITY_01_API_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-api@sha256:db217f89fc6d58800f337db116c3ad35237b04d41b0deb09786b4b2d6c800397
ACCOUNT_SECURITY_01_WEB_IMMUTABLE_REF=ghcr.io/ryezuo/likecord-web@sha256:926b0349989d2977a26c9c23d633b31d2e858cee8f9f5ea1cdb9b39682dd0d95
EMAIL_MIGRATION_APPLIED_STAGING=true
DATABASE_BACKUP_BEFORE_MIGRATION_PASS=true
EMAIL_CANONICALIZATION_COLLISION_FOUND=false
PREPARE_PASS=true
DEPLOY_PASS=true
VERIFY_PASS=true
API_WEB_SAME_SOURCE=true
SEC_AS01_F01_CREDENTIAL_MUTATION_BOUNDARY_REMEDIATED=true
SEC_AS01_F01_CREDENTIAL_MUTATION_BOUNDARY_VALIDATED=true
SEC_AS01_F01_GLOBAL_FIXED=false
THEME_ENGINE_01_STARTED=true
THEME_ENGINE_01_PREFLIGHT_COMPLETE=true
THEME_ENGINE_01_CONTRACT_CREATED=true
THEME_ENGINE_01_CONTRACT_FINALIZED=true
THEME_ENGINE_01_CONTRACT_ACCEPTED=true
THEME_ENGINE_01_CONTRACT_FROZEN=true
THEME_ENGINE_01_IMPLEMENTATION_READY=true
THEME_ENGINE_01_IMPLEMENTATION_STARTED=true
THEME_ENGINE_01_TE1_IMPLEMENTED=true
THEME_ENGINE_01_TE1_AUTOMATED_VALIDATION_PASS=true
THEME_ENGINE_01_TE2_STARTED=true
THEME_ENGINE_01_TE2_IMPLEMENTED=true
THEME_ENGINE_01_TE2_AUTOMATED_VALIDATION_PASS=true
THEME_ENGINE_01_TE3_STARTED=true
THEME_ENGINE_01_TE3_COMPLETE=true
THEME_ENGINE_01_IMPLEMENTATION_COMPLETE=true
THEME_ENGINE_01_COMPLETE=true
THEME_ENGINE_01_ACCEPTED=true
THEME_ENGINE_01_FROZEN=true
THEME_ENGINE_01_USER_DECISIONS_PENDING=false
THEME_WIN98_01_STARTED=true
THEME_WIN98_01_PREFLIGHT_COMPLETE=true
THEME_WIN98_01_CONTRACT_CREATED=true
THEME_WIN98_01_CONTRACT_FINALIZED=true
THEME_WIN98_01_CONTRACT_ACCEPTED=true
THEME_WIN98_01_CONTRACT_FROZEN=true
THEME_WIN98_01_IMPLEMENTATION_READY=true
THEME_WIN98_01_IMPLEMENTATION_STARTED=true
THEME_WIN98_01_W98_1_STARTED=true
THEME_WIN98_01_W98_1_IMPLEMENTED=true
THEME_WIN98_01_W98_1_AUTOMATED_VALIDATION_PASS=true
THEME_WIN98_01_W98_2_STARTED=true
THEME_WIN98_01_W98_2_IMPLEMENTED=true
THEME_WIN98_01_W98_2_AUTOMATED_VALIDATION_PASS=true
THEME_WIN98_01_W98_3_COMPLETE=true
THEME_WIN98_01_IMPLEMENTATION_COMPLETE=true
THEME_WIN98_01_COMPLETE=true
THEME_WIN98_01_ACCEPTED=true
THEME_WIN98_01_FROZEN=true
THEME_ENGINE_MULTI_THEME_MANUAL_REVALIDATION_REQUIRED_ON_SECOND_THEME=false
THEME_ENGINE_MULTI_THEME_MANUAL_REVALIDATION_COMPLETE=true
THEME_WIN98_01_USER_DECISIONS_PENDING=false
WIN98_ASSET_LICENSE_REVIEW_REQUIRED=false
WIN98_MICROSOFT_DERIVED_REFERENCE_ASSETS_EXCLUDED=true
WIN98_MICROSOFT_DERIVED_ASSETS_ALLOWED_IN_PRODUCTION=false
THEME_WINXP_01_STARTED=false
THEME_WINXP_01_DEFERRED_BY_USER=true
THEME_WINXP_01_REMOVED=false
MEDIA_VIEWER_01_STATUS=COMPLETE_ACCEPTED_FROZEN
MEDIA_VIEWER_01_NEXT_ACTIVE_STAGE=false
MEDIA_VIEWER_01_STARTED=true
MEDIA_VIEWER_01_PREFLIGHT_COMPLETE=true
MEDIA_VIEWER_01_CONTRACT_CREATED=true
MEDIA_VIEWER_01_CONTRACT_FINALIZED=true
MEDIA_VIEWER_01_CONTRACT_ACCEPTED=true
MEDIA_VIEWER_01_CONTRACT_FROZEN=true
MEDIA_VIEWER_01_IMPLEMENTATION_READY=true
MEDIA_VIEWER_01_IMPLEMENTATION_STARTED=true
MEDIA_VIEWER_01_MV1_IMPLEMENTATION_COMPLETE=true
MEDIA_VIEWER_01_MV1_REQUIRED_LOCAL_VALIDATION_COMPLETE=true
MEDIA_VIEWER_01_MV2_IMPLEMENTATION_STARTED=true
MEDIA_VIEWER_01_MV2_IMPLEMENTATION_COMPLETE=true
MEDIA_VIEWER_01_MV2_REQUIRED_LOCAL_VALIDATION_COMPLETE=true
MEDIA_VIEWER_01_MV3_IMPLEMENTATION_STARTED=true
MEDIA_VIEWER_01_IMPLEMENTATION_COMPLETE=true
MEDIA_VIEWER_01_STAGING_VALIDATION_COMPLETE=true
MEDIA_VIEWER_01_COMPLETE=true
MEDIA_VIEWER_01_ACCEPTED=true
MEDIA_VIEWER_01_FROZEN=true
MV3_COMPLETE=true
MV3_RUNTIME_MATRIX_PASS=24
MV3_RUNTIME_MATRIX_FAIL=0
MV3_ACCEPTED_OWNER_DISPOSITIONS=2
MV3_DEFERRED_NON_TARGET_VALIDATIONS=1
MEDIA_VIEWER_01_USER_DECISIONS_PENDING=false
MEDIA_VIEWER_01_WAITING_ON_MEDIA_DELIVERY_PREFLIGHT=false
MEDIA_VIEWER_01_WAITING_ON_MEDIA_DELIVERY_REMEDIATION=false
MEDIA_DELIVERY_CHANGE_REQUIRED_BEFORE_MV1=true
MEDIA_VIEWER_CAROUSEL_END_BEHAVIOR=STOP_AT_ENDS
MEDIA_VIEWER_ZOOM_MAX=400%
MEDIA_VIEWER_ZOOM_FACTOR=1.25
MEDIA_VIEWER_ZOOM_MIN=DYNAMIC_FIT
MEDIA_DELIVERY_FOUNDATION_01_REGISTERED=true
MEDIA_DELIVERY_FOUNDATION_01_CLASSIFICATION=CROSS_CUTTING_TECHNICAL_FOUNDATION
MEDIA_DELIVERY_FOUNDATION_01_PREFLIGHT_STARTED=true
MEDIA_DELIVERY_FOUNDATION_01_PREFLIGHT_COMPLETE=true
MEDIA_DELIVERY_FOUNDATION_01_USER_DECISIONS_PENDING=false
MEDIA_DELIVERY_FOUNDATION_01_IMPLEMENTATION_STARTED=true
MEDIA_DELIVERY_FOUNDATION_01_MDF1_ACCEPTED=true
MEDIA_DELIVERY_FOUNDATION_01_MDF1_RUNTIME_SOURCE=private no-store on attachment downloads milestone
MEDIA_DELIVERY_FOUNDATION_01_MDF1_API_DIGEST=sha256:868457a46741218a9ea680eaba6303521856262e72cebff052b35fb6629f039c
MEDIA_DELIVERY_FOUNDATION_01_MDF1_STAGING_VALIDATION_COMPLETE=true
MEDIA_DELIVERY_INITIAL_LAUNCH_SCALE=100_TO_500_USERS
HTTP_CACHE_FIRST=true
SERVICE_WORKER_MEDIA_CACHE_DEFAULT=false
INDEXEDDB_MEDIA_CACHE_DEFAULT=false
AVATAR_REALTIME_REPLACEMENT_REQUIRED=true
AVATAR_REALTIME_REMOVAL_REQUIRED=true
ATTACHMENT_AUTHORITY_PRESERVED=true
ATTACHMENT_DELETE_REALTIME_INVALIDATION_REQUIRED=true
ATTACHMENT_STORAGE_LIFECYCLE_PRESERVED=true
ATTACHMENT_CACHE_AUTH_BYPASS_ALLOWED=false
MEDIA_VARIANTS_IMPLEMENTATION_AUTHORIZED=false
POST_VI_STAGE_COUNT=15
LINK_PREVIEW_01_CLASSIFICATION=PROMOTE_BEFORE_RC
LINK_PREVIEW_01_STATUS=COMPLETE_ACCEPTED_FROZEN
LINK_PREVIEW_01_STARTED=true
LINK_PREVIEW_01_PREFLIGHT_STARTED=true
LINK_PREVIEW_01_PREFLIGHT_COMPLETE=true
LINK_PREVIEW_01_CONTRACT_CREATED=true
LINK_PREVIEW_01_CONTRACT_FINALIZED=true
LINK_PREVIEW_01_CONTRACT_ACCEPTED=true
LINK_PREVIEW_01_CONTRACT_FROZEN=true
LINK_PREVIEW_01_USER_DECISIONS_PENDING=false
LINK_PREVIEW_01_IMPLEMENTATION_READY=true
LINK_PREVIEW_01_IMPLEMENTATION_STARTED=true
LP1_IMPLEMENTED=true
LP1_SECURITY_BOUNDARY_PROVEN=true
LP2_IMPLEMENTATION_READY=true
LP2_IMPLEMENTATION_STARTED=true
LP2_IMPLEMENTED=true
LP2_AUTOMATED_VALIDATION_PASS=true
LP2_REQUIRED_LOCAL_VALIDATION_COMPLETE=true
LINK_PREVIEW_01_IMPLEMENTATION_COMPLETE=true
LINK_PREVIEW_01_COMPLETE=true
LP3_IMPLEMENTATION_READY=true
LP3_IMPLEMENTATION_STARTED=true
LP3_TECHNICAL_ROLLOUT_COMPLETE=true
LP3_COMPLETE=true
LINK_PREVIEW_01_STAGING_VALIDATION_COMPLETE=true
LINK_PREVIEW_01_OWNER_ACCEPTANCE_PENDING=false
LINK_PREVIEW_01_ACCEPTED=true
LINK_PREVIEW_01_FROZEN=true
LP_M_PASS_COUNT=22
LP_M_FAIL_COUNT=0
LP_M_OWNER_DEFERRED_COUNT=2
LP_M_ACTIVE_PENDING_COUNT=0
LP_M_TOTAL_COUNT=24
LP_M_ALL_24_PASS=false
LINK_PREVIEW_01_IMPLEMENTATION_BLOCKED=false
VOICE_CONNECTION_QUALITY_01_CLASSIFICATION=PROMOTE_BEFORE_RC
VOICE_CONNECTION_QUALITY_01_STATUS=NOT_STARTED
CAMERA_VIDEO_01_CLASSIFICATION=SEPARATE_PRODUCT_FEATURE
CAMERA_VIDEO_01_TARGET=AFTER_RC
CAMERA_VIDEO_01_STATUS=NOT_STARTED
STAGING_ROLLOUT_RUNBOOK_RECONCILIATION_PENDING=false
STAGING_ROLLOUT_RUNBOOK_RECONCILIATION_COMPLETE=true
IMAGE_PUBLISHED=true
STAGING_DEPLOYMENT_PERFORMED=true
USER_AVATAR_02_PREVIEW_REMEDIATION_COMPLETE=true
USER_AVATAR_02_MANUAL_RETEST_PENDING=false
USER_AVATAR_02_FINAL_STAGING_VALIDATION_PASS=true
USER_AVATAR_02_FINAL_MANUAL_ACCEPTANCE_PASS=true
USER_AVATAR_02_COMPLETE=true
USER_AVATAR_02_ACCEPTED=true
USER_AVATAR_02_FROZEN=true
USER_AVATAR_02_RUNTIME_SOURCE_MILESTONE=animated avatar preview milestone
PRE_RC_FORMAL_GATE_ORDER_CHANGED=false
THEME_ENGINE_01_RUNTIME_SOURCE=Node-compatible theme runtime milestone
THEME_ENGINE_01_API_DIGEST=sha256:48c10905c66c16341e75cac19e54e14ec180e92f172e6096b2126f26cec9ce36
THEME_ENGINE_01_WEB_DIGEST=sha256:d2953a3cb1e515c56806137a037f6f5b6b0fa95d500a3feae56f6c8aec7601e7
THEME_PREFERENCE_MIGRATION=20260907180000_add_theme_preference
WIN98_THEME_PREFERENCE_MIGRATION=20260907230000_expand_theme_preference_retro_98
CURRENT_SELECTABLE_THEME_COUNT=2
THEME_SELECTOR_IMPLEMENTED=true
THEME_SELECTOR_CONTROL=native_select
THEME_ENGINE_TE_M_PASS_COUNT=24
THEME_ENGINE_TE_M_NA_COUNT=0
THEME_ENGINE_TE_M_BLOCKED_COUNT=0
THEME_WIN98_01_RUNTIME_SOURCE=accepted Win98 theme candidate
THEME_WIN98_01_API_DIGEST=sha256:d9794c98feef9b47adde3da0e037d4adc83035eb2b3561773db2b7ce19afa739
THEME_WIN98_01_WEB_DIGEST=sha256:7d0911646ca32f64277cb1f623dc5b7370de6dedbd1aa68755de4f258d7f1aa0
NEXT_OFFICIAL_PRODUCT_STAGE=VOICE_AUDIO_SETTINGS_01
VOICE_AUDIO_SETTINGS_01_PREFLIGHT_COMPLETE=true
VOICE_AUDIO_SETTINGS_01_CONTRACT_ACCEPTED=false
VOICE_AUDIO_SETTINGS_01_CONTRACT_ACCEPTANCE=PARTIAL_VA1_VA2_VA3A_SCOPED
VOICE_AUDIO_SETTINGS_01_IMPLEMENTATION_STARTED=true
VOICE_AUDIO_SETTINGS_01_VA2_IMPLEMENTATION_COMPLETE=true
VOICE_AUDIO_SETTINGS_01_VA2_AUTOMATED_AND_LOCAL_BROWSER_PASS=true
VOICE_AUDIO_SETTINGS_01_VA2_STAGING_VALIDATION_COMPLETE=true
VOICE_AUDIO_SETTINGS_01_VA2_MANUAL_MATRIX_PASS_COUNT=20
VOICE_AUDIO_SETTINGS_01_VA2_OWNER_CHECK_COUNT=16
VOICE_AUDIO_SETTINGS_01_VA2_AGENT_CHECK_COUNT=4
VOICE_AUDIO_SETTINGS_01_VA2_OWNER_ACCEPTANCE_PENDING=false
VOICE_AUDIO_SETTINGS_01_VA2_ACCEPTED=true
VOICE_AUDIO_SETTINGS_01_VA2_COMPLETE=true
VA3_IMPLEMENTATION_STARTED=true
VA3A_IMPLEMENTATION_COMPLETE=true
VA3A_AUTOMATED_VALIDATION_PASS=true
VA3A_LOCAL_BROWSER_REVIEW_COMPLETE=true
VA3A_LOCAL_BROWSER_RESULT=PASS_WITH_ENVIRONMENT_LIMITATION
VA3A_LOCAL_BROWSER_LIMITATION=PHYSICAL_MIC_SWITCH_NOT_VALIDATED
PHYSICAL_MIC_SWITCH_RESULT=NOT_VALIDATED_ENVIRONMENT_LIMITATION
MIC_SWITCH_TRANSACTION_RESULT=AUTOMATED_PASS_PHYSICAL_NOT_RUN
VA3B_IMPLEMENTATION_STARTED=true
VA3B_IMPLEMENTATION_COMPLETE=true
VA3B_ADOPTION_RESULT=PASS_MEMORY_A2_AUTOMATED_AND_LOCAL_REVIEW
VA3B_AUTOMATED_VALIDATION_PASS=true
VA3B_LOCAL_BROWSER_RESULT=PASS
VA3_COMPLETE=true
VA4_STARTED=true
VA4_COMPLETE=true
VA4_ACCEPTED=true
VOICE_AUDIO_SETTINGS_01_IMPLEMENTATION_COMPLETE=true
VOICE_AUDIO_SETTINGS_01_COMPLETE=true
VOICE_AUDIO_SETTINGS_01_ACCEPTED=true
VOICE_AUDIO_SETTINGS_01_CONTRACT_FROZEN=true
MIC_SENSITIVITY_SEMANTICS=VOICE_ACTIVATION_THRESHOLD
MIC_SENSITIVITY_SEMANTICS_PENDING=false
VOICE_CONNECTION_QUALITY_01_NOT_STARTED=true
BOUNDED_FEASIBILITY_SPIKE_EXECUTED=true
SPIKE_LATENCY_CONTINUATION_EXECUTED=true
SPIKE_EVIDENCE_STATUS=MANUAL_ROUTE_COMPLETE_LIMITS_REMAIN
VOICE_CONNECTION_QUALITY_01_STATUS=NOT_STARTED
VOICE_CONNECTION_QUALITY_01_DEFERRED_BY_OWNER_PRIORITY=true
SCREEN_SHARE_UX_01_PREFLIGHT_COMPLETE=true
SCREEN_SHARE_UX_01_CONTRACT_ACCEPTED=true
SCREEN_SHARE_UX_01_IMPLEMENTATION_STARTED=true
NEXT_OFFICIAL_PRODUCT_STAGE=SCREEN_SHARE_UX_01
NEXT_STAGE_AFTER_SCREEN_SHARE_UX_01=VOICE_CONNECTION_QUALITY_01
```

Ordem pós-VI registrada, sem autorização implícita de implementação:

`DECISION_ACCEPTED — 2026-09-11`: Media Controls de Screen Share têm prioridade
de produto do owner. `SCREEN_SHARE_UX_01` passa a ser o próximo stage oficial.
O [preflight dedicado](./screen-share-ux.md) está completo, com contrato aceito/congelado
e nenhuma decisão SSUX pendente; SSUX.1 + SSUX.2 implementados/validados. SSUX.3 teve [validação integrada e publicação Web aprovadas](./screen-share-ux.md#21-ssux3-technical-release-candidate-and-operator-handoff--2026-09-11), incluindo a remediação de áudio aceita; candidato de áudio genérico 64 kbps publicado; matriz manual pausada até rollout e R01 (§23).
`SCREEN_SHARE_STEREO_01` fica `DEFER_AFTER_RC`, sem virar stage ou bloqueador de SSUX.3;
o total permanece 15 stages. Próximo passo: operador executa PREPARE -> DEPLOY -> VERIFY e SCREEN_AUDIO_64K_R01 conforme o [novo candidato publicado](./screen-share-ux.md#23-generic-64-kbps-release-candidate-and-operator-handoff);
Staging mantém o candidato anterior até o rollout manual. Voice Connection Quality
permanece `PROMOTE_BEFORE_RC / NOT_STARTED`, adiado por prioridade até o fechamento
de Screen Share UX. É somente mudança de ordem, sem cancelamento ou fusão de
escopo. O ponteiro de próximo stage no fechamento datado de Voice & Audio fica
supersedido por esta decisão; source e evidências congeladas permanecem intactos.
Screen Share Capture Quality não foi comissionado.

```text
USER_SETTINGS_01
  -> USER_AVATAR_01
  -> USER_AVATAR_02
     -> AV2.1 Crop & Position
     -> AV2.2 Animated GIF/WebP
  -> ACCOUNT_SECURITY_01
  -> THEME_ENGINE_01 -> THEME_WIN98_01
  -> MEDIA_DELIVERY_FOUNDATION_01 MDF.1 (aceito; não é stage)
     -> MEDIA_VIEWER_01
  -> LINK_PREVIEW_01
  -> VOICE_AUDIO_SETTINGS_01
  -> SCREEN_SHARE_UX_01
  -> VOICE_CONNECTION_QUALITY_01
  -> SCREEN_SHARE_CAPTURE_QUALITY_01
  -> CORE_UI_POLISH_01
  -> I18N_01
```

`THEME_WINXP_01` permanece no inventário de **15 stages** como
`PROMOTE_BEFORE_RC / DEFERRED_BY_USER / NOT_STARTED`, fora da sequência ativa
até recomissionamento explícito do usuário. O adiamento não o cancela, remove
ou supersede, nem decide se sua execução futura ocorrerá antes ou depois do
primeiro RC; continuam obrigatórios preflight dedicado, aceite de naming,
assets/licença e visual.

São **15 stages** no plano pós-VI atual. `ACCOUNT_SECURITY_01` está completo,
aceito e congelado conforme seu [contrato dedicado](./account-security.md).
`THEME_ENGINE_01` está completo, aceito e congelado após TE.3. Seu conjunto
multi-theme herdado também foi concluído por W98.3 sem reabrir o stage.
`THEME_WIN98_01` está completo, aceito e congelado após publicação API/Web do
mesmo source, migration controlada, `PREPARE -> DEPLOY -> VERIFY` e aceitação
integrada em Staging, incluindo TE-M03/04/05/06/10, zoom real, acessibilidade,
Voice e Screen Share. O [contrato dedicado](./theme-win98.md) preserva os refs e
a matriz final. `THEME_WINXP_01` permanece não iniciado e adiado por decisão do
usuário. `MEDIA_VIEWER_01` está completo, aceito e congelado após MV.3,
mantendo `PROMOTE_BEFORE_RC` como sua classificação. O
[contrato dedicado](./media-viewer.md) registra source discovery, owners,
segurança, testes e publicação; `MV-D01` foi aceito como parada nos extremos e
`MV-D02` como Fit mínimo dinâmico, máximo de 400% e fator 1,25. O preflight
somente leitura de
[`MEDIA_DELIVERY_FOUNDATION_01`](./media-delivery-foundation.md) está concluído:
recomenda manter API/R2 (Opção A) para 100–500 usuários e preservar Avatars.
O pré-requisito MDF.1 — a política delimitada de cache da resposta da aplicação
para Attachments — está satisfeito e aceito em Staging. MV.1 implementou o
owner único no ChatArea, MIME exato, portal, shell loading/error, carrossel
same-Message stop-at-ends, Original/Download, foco/teclado e lifecycle básico;
o [registro MV.1](./media-viewer.md#25-mv1-viewer-foundation--implemented-2026-09-08)
preserva sua evidência histórica. MV.2 implementou Fit/100%/zoom delimitado,
pan nativo, ResizeObserver, fullscreen capability/fallback e o hardening
contratado; seu
[registro local](./media-viewer.md#26-mv2-transforms-and-hardening--implemented-2026-09-08)
contém a evidência final. MV.3 publicou somente o Web, completou o rollout
Staging e a aceitação final: 24 PASS, 0 FAIL, duas disposições aceitas do owner
e uma validação não-target adiada. Otimizações posteriores de entrega ficam no
owner técnico.
Essa fundação não é um 16º stage e não reabre o contrato do Viewer. A
implementação e a aceitação final estão completas. `LINK_PREVIEW_01` permanece
completo, aceito e congelado. Seu
[contrato dedicado](./link-preview.md) está finalizado, aceito e congelado: a
arquitetura segura de fetch server-side limitado usa resolução e conexão
vinculadas, Redis TTL assíncrono no processo da API e não tem thumbnail V1.
LP.1 e LP.2 estão implementados e automaticamente validados; a prova e seus
limites estão no contrato dedicado. Lifecycle Message, projeção cache-only,
convergência realtime e comportamento Web seguro existem na fonte. LP.3
publicou, passou o rollout técnico/Staging e encerrou o aceite do proprietário
com 22 PASS, 0 FAIL, duas validações runtime deferidas e zero pendências ativas.
O stage oficial `VOICE_AUDIO_SETTINGS_01` tem VA.1 concluída e aceita e VA.2
concluída e aceita:
[aceite final de efeitos em Staging](./voice-audio-settings.md#154-final-owner-staging-acceptance-and-rollout-reconciliation),
com automação, revisão visual local, rollout técnico e seis checks manuais do
proprietário aprovados. O default global permanece 70%; 75% é preferência pessoal
salva do proprietário. O problema de baixa audibilidade foi aceito como corrigido
no runtime observado, sem afirmar equivalência acústica universal. O contrato
completo permanece não congelado.
O [recorte VA.3A](./voice-audio-settings.md#18-va3a-scoped-capture-acceptance--2026-09-10)
implementa captura nativa configurável, AGC independente, ganho, ativação,
teste local silencioso e transações de senders CALL. Principal/Avançado
de saída, dispositivos e master 0–200 pertencem ao recorte VA.2 implementado
abaixo; defaults e arquitetura da captura VA.3A estão aceitos em §18. O
[spike local explicitamente comissionado](./voice-audio-settings.md#16-bounded-local-feasibility-spike--2026-09-09)
tem provas automáticas e uma [comparação de latência/onset](./voice-audio-settings.md#166-latencypre-roll-continuation--2026-09-09):
o candidato de escuta com pre-roll de 5 ms mede 34,854 ms e ainda reprova o alvo
proposto de 30 ms. A [escuta local e separação CALL/Screen foram confirmadas pelo proprietário](./voice-audio-settings.md#168-backgroundoutput-diagnosis-and-owner-listening-evidence--2026-09-09).
O proprietário concluiu as ações de background real e escolha física de saída
no escopo relatado: o primeiro é `PASS_OBSERVED_SCOPE`, e a escolha física é
`PASS` em mais de dois dispositivos, com liberação confirmada. Isso não é prova
de áudio humano em segundo plano, CPU, ausência universal de interrupções ou
acústica entre computadores. O candidato histórico de 5 ms permanece rejeitado.
A disposição posterior em §19.4 aceita somente o candidato fixo de 10 ms sob
budget RNNoise de 40 ms; o caminho Native mantém seu limite de 30 ms.
O [recorte VA.2 aceito](./voice-audio-settings.md#173-va2-final-integrated-staging-acceptance--recorded-2026-09-10)
entrega o master autenticado CALL + Screen 0–200/default100, reprodução recebida
Web Audio classificada, uma escolha local de saída para CALL/Screen/SFX,
reconciliação SFX tardia, controles avançados reais quando expostos e limitador
de pico delimitado. Suítes focada/completa, API/PostgreSQL, builds, revisão local,
publicação same-source, migration controlada, `PREPARE -> DEPLOY -> VERIFY` e matriz
integrada M01–M20 passaram; o owner preserva números, origens e limites. A ponte por
elemento permanece condicional, não habilitada. VA.3 começou pela VA.3A, agora
concluída com validação automatizada e revisão local
`PASS_WITH_ENVIRONMENT_LIMITATION`, sem publicação/deploy naquele checkpoint. A
troca física de entrada não foi executada nessa revisão, mas a VA.4 posterior a
fecha como PASS_OWNER. O servidor descartável foi removido pelo fluxo normal,
com zero registros restantes. O stage agora está completo, aceito e congelado
após a matriz final em §20.13. A [comissão VA.3B e seu proof](./voice-audio-settings.md#19-va3b-rnnoise-adoption-proof-and-call-transport-commission--2026-09-10)
preservam a reprovação histórica do gate baseado no frame e a persistência local
por conta/origin dos controles CALL. A nova candidata fixa de 10 ms passou em
latência/onset, CPU surrogate, continuidade de 60 s, prontidão e dez ciclos de
limpeza. Após a clarificação da métrica pelo proprietário (§19.6), a prova V2
mediu um pico válido de working set privado atribuível acima de 64 MiB nos ciclos
repetidos. O [hard stop observado em §19.7](./voice-audio-settings.md#197-paired-memory-v2-result-and-measured-hard-fail--2026-09-10)
impediu packaging e integração produtiva. O resultado anterior `not_measured`
permanece histórico. RNNoise/suppression mode e transporte não estavam
implementados naquele stop. O proprietário informou carga pesada simultânea e comissionou a
[reconciliação controlada em §19.8](./voice-audio-settings.md#198-controlled-idle-memory-reconciliation--2026-09-10),
preservando os dados anteriores. Após idle confirmado, o crossover Native/RNNoise
reproduziu a falha no limite de memória e crescimento progressivo específico.
A comissão anterior de [investigação de platô em §19.9](./voice-audio-settings.md#199-memory-plateau-investigation-and-conditional-budget-disposition--2026-09-10)
condiciona a revisão do budget e a continuação de VA.3B à classificação A.
A investigação terminou na classificação C: crescimento específico nos ciclos
finais e pico acima de 128 MiB. O proprietário aceitou a classe C e autorizou a
[remediação de lifecycle em §19.10](./voice-audio-settings.md#1910-rnnoise-lifecycle-memory-remediation--2026-09-10).
A prova final do V1 passou como A2 e ativou o teto condicional já autorizado em
§19.10. O source produtivo, empacotamento e transporte CALL agora têm validação
automatizada e prova sintética standalone. A [remediação em §19.12](./voice-audio-settings.md#1912-capture-preparation-remediation-and-va3b-completion--2026-09-10)
corrigiu a aquisição nativa e concluiu a revisão local SYSTEM_DEFAULT, Default,
Retro98 e CALL sintética. VA.3B/VA.3 estão completos. A [VA.4 comissionada em §20](./voice-audio-settings.md#20-va4-release-publication-and-operator-handoff--2026-09-10)
publicou e verificou localmente os candidatos imutáveis API/Web do mesmo source.
O operador informa PREPARE r2/backup e DEPLOY r7 PASS (§20.10). As duas migrations
foram aplicadas, API/Web estão saudáveis no source publicado e a infraestrutura
foi preservada. O recibo do servidor e a leitura autenticada das preferências
completam o VERIFY técnico (§20.12). A [aceitação final em §20.13](./voice-audio-settings.md#2013-va4-final-integrated-acceptance-and-voice_audio_settings_01-freeze--2026-09-11)
registra T01 e M01–M17 PASS, preserva as origens agent/owner e fecha a troca
física e a escuta integrada no escopo observado; Native mantém 30 ms. Voice &
Audio está completo, aceito e congelado.
`VOICE_CONNECTION_QUALITY_01` fica depois de `SCREEN_SHARE_UX_01` por prioridade
explícita do owner, permanece NOT_STARTED e é um
dono separado: qualidade deve vir de evidência WebRTC real e seu modelo/fórmulas/
thresholds ainda não estão congelados. O resumo de contrato e os limites exatos
de qualidade pertencem ao [contrato pós-VI](./post-vi-product-ux.md#6-stage-contracts);
os detalhes de Voice & Audio pertencem ao novo owner dedicado. A ordem pre-RC
e o inventário de 15 stages permanecem inalterados; F6 e Link Preview continuam
aceitos/congelados.

`CORE_UI_POLISH_01` inclui, sem criar stages independentes:

- `COMPOSER_SEND_BUTTON_POLISH`: substituir a apresentação textual por ícone SVG
  próprio do Likecord à direita do Composer, preservando o submit, Enter,
  Shift+Enter, anexos, permissões, elegibilidade desabilitada, a preferência Show
  Send Button e a acessibilidade existentes;
- `REMOVE_WS_DEBUG_FROM_PRODUCT_UI`: remover `WS:... ID:... CH:...` da UI normal
  sem remover WebSocket, semântica de conexão ou diagnósticos internos úteis.

`CAMERA_VIDEO_01` mantém o comportamento atual `Coming Soon` e fica planejado
somente em alto nível para depois do RC: captura de câmera, sender/lifecycle,
enable/disable, dispositivo, multi-peer, tiles/layout, banda/resolução/FPS,
permissões, perda de dispositivo e coexistência com Screen Share. Não há contrato
ou implementação autorizados agora.

`VISUAL_IDENTITY_01` permanece completo, aceito e congelado. F5/F6/F7 não foram
reabertos; `PRESENCE-01` continua `confirmed_before_rc_separate_owner`.

O trabalho de produto pós-VI é planejado antes do hardening final/gates de RC,
sem mudar a cadeia
formal da seção 24.2 nem concluir TEST-HARDEN/QA/security/RC por associação.
PRESENCE-01, dívidas messaging/Voice, operações e responsividade conservam seus
donos e prioridades independentes. O artefato VI.3R publicado de
`shell depth and layout milestone` permanece evidência histórica
imutável: não foi implantado nem usado em staging e foi supersedido visualmente
por VI.3R2 e VI.3R3. O aceite posterior do artefato VI.3R2 está registrado acima;
a evidência local de VI.3R3 não conclui staging, o aceite V01–V10 ou gates de runtime/RC.

## Pre-RC

- [ ] `UI-MSG-SENDER-FLICKER-01` — dívida retida fora de F7; reproduzida e não corrigida, sob o dono existente de messaging/API/realtime.
- [ ] Mute/Deafen bug.
- [ ] Username/UUID bug.
- [ ] `VOICE_STALE_STATE_AFTER_API_RESTART_01` — `FUNCTIONAL_DEBT / BEFORE_RC`; ocupação Voice stale confirmada após recriação da API, recuperação seletiva comprovada, correção não selecionada (`FIXED=false`) e sem limpeza Redis automática aceita.
- [ ] `SCREEN_SHARE_STALE_STATE_AFTER_API_RESTART_01` — `FUNCTIONAL_DEBT / BEFORE_RC`; recuperação seletiva comprovada, mas `FIXED=false`.
- [ ] UX blocker sweep.
- [ ] Backup/restore.
- [ ] `TEST-HARDEN-01` + `QA-GATE-01`.
- [ ] `SEC-APP-AUDIT-01` + remediações exigidas + `SEC-DAST-01`.
- [ ] `RC-STABILIZATION` + `RC-SECURITY-GATE`.
- [ ] Release Candidate / Beta Gate.

---

# 20. UI Wireframes / Interaction Reference

> Referência low-fidelity. O objetivo é fixar hierarquia, fluxo e comportamento — não dimensões finais, cores ou pixel-perfect.

## 20.1 `/channels/@me` — Home

Este wireframe é subordinado ao [contrato F7.2](./f7-core-user-ux.md#5-f72--channelsme-home-ux):
Continue mostra um destino salvo válido, não um histórico de atividade. A indicação
ilustrativa de recência abaixo não exige tracking nem timestamp na UI. Sem destino
válido, não há ação Continue. Os estados e o layout F7.2 estão implementados;
o núcleo visual e a entrada Home F7.2R passaram no staging informado pelo usuário
(aceite final na seção 18 do contrato F7). O wireframe é apenas ilustrativo.

```text
┌──────┬─────────────────────────────────────────────────────────────────────┐
│      │ Likecord                                                            │
│ SRV  │                                                                     │
│ RAIL │ Welcome back, User A                                                │
│      │                                                                     │
│ ●    │ Continue where you left off                                         │
│ ●    │ ┌───────────────────────────────────────────────────────────────┐   │
│ ●    │ │ BHR                                                   →      │   │
│      │ │ # general                                                     │   │
│  +   │ │ Last visited recently                                         │   │
│      │ └───────────────────────────────────────────────────────────────┘   │
│      │                                                                     │
│      │ Your Servers                                                        │
│      │                                                                     │
│      │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │
│      │ │     BHR      │ │   Projeto    │ │    Testes    │                 │
│      │ │    [icon]    │ │    [icon]    │ │    [icon]    │                 │
│      │ │   Open  →    │ │   Open  →    │ │   Open  →    │                 │
│      │ └──────────────┘ └──────────────┘ └──────────────┘                 │
│      │                                                                     │
│      │                         + Add a Server                              │
└──────┴─────────────────────────────────────────────────────────────────────┘
```

### Acceptance
- [x] Login normal cai em `/channels/@me`.
- [x] Home não seleciona servidor arbitrariamente — validação automatizada F7.2.
- [x] `Continue where you left off` usa preferência PostgreSQL via leitura agregada autenticada limitada, conforme F7.2 — validação automatizada.
- [x] CTA `Add a Server` é evidente.
- [x] Empty state implementado quando não há servidores — validação automatizada F7.2.
- [x] Núcleo F7.2 em staging, incluindo layout/zoom e uso entre browsers — evidência fornecida pelo usuário no registro F7.2R.
- [x] Smoke da entrada Home no Web corrigido e aceite manual final F7.2 — 16/16 PASS fornecido pelo usuário.

---

## 20.2 `Add a Server`

```text
                    ┌──────────────────────────────┐
                    │ Add a Server             ✕  │
                    │                              │
                    │ What would you like to do?  │
                    │                              │
                    │ ┌──────────────────────────┐ │
                    │ │        Create            │ │
                    │ │       a Server           │ │
                    │ │                          │ │
                    │ │ Start a new community  → │ │
                    │ └──────────────────────────┘ │
                    │                              │
                    │ ┌──────────────────────────┐ │
                    │ │         Join             │ │
                    │ │       a Server           │ │
                    │ │                          │ │
                    │ │ Use an invite link     → │ │
                    │ └──────────────────────────┘ │
                    └──────────────────────────────┘
```

### Acceptance
- [x] Clique no `+` do Server Rail abre este modal.
- [x] `Create a Server` e `Join a Server` são ações distintas.
- [x] Fecha por `X`, `Esc` e clique fora, se consistente com a biblioteca de modal.
- [x] Não joga o usuário diretamente em formulário sem escolha prévia.

---

## 20.3 `Join a Server`

```text
                 ┌────────────────────────────────────┐
                 │ Join a Server                  ✕   │
                 │                                    │
                 │ Enter an invite                    │
                 │                                    │
                 │ ┌────────────────────────────────┐ │
                 │ │ https://likecord.../invite/... │ │
                 │ └────────────────────────────────┘ │
                 │                                    │
                 │ You can paste:                     │
                 │ • a full invite URL                │
                 │ • /invite/code                     │
                 │ • just the invite code             │
                 │                                    │
                 │          Cancel       Continue     │
                 └────────────────────────────────────┘
```

Preview:

```text
                 ┌────────────────────────────────────┐
                 │ Join this server?                  │
                 │                                    │
                 │              [ BHR ]               │
                 │                                    │
                 │ BHR                                │
                 │                                    │
                 │          Back       Join Server    │
                 └────────────────────────────────────┘
```

### Acceptance
- [x] Aceita código puro.
- [x] Aceita `/invite/{code}`.
- [x] Aceita URL completa same-origin.
- [x] Normaliza tudo para `inviteCode`.
- [x] Mostra preview antes de criar membership.
- [x] Após sucesso, navega por `/channels/{serverId}` e reutiliza o resolver canônico.

---

## 20.4 Página `/invite/{code}`

Não autenticado:

```text
┌──────────────────────────────────────────────────────────────────┐
│                            Likecord                              │
│                                                                  │
│                 You've been invited to join                      │
│                                                                  │
│                         [ BHR ]                                  │
│                           BHR                                    │
│                                                                  │
│              ┌──────────────────────────┐                        │
│              │         Log in           │                        │
│              └──────────────────────────┘                        │
│                                                                  │
│                     Create Account                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Já membro:

```text
┌───────────────────────────────┐
│            BHR                │
│                               │
│ You're already a member.      │
│                               │
│         Open Server           │
└───────────────────────────────┘
```

### Acceptance
- [ ] `/invite/{code}` é a entrada canônica.
- [ ] Login/Register preserva `returnTo`.
- [ ] Após autenticar, volta para o invite.
- [ ] Aceite continua explícito.
- [ ] Já membro recebe `Open Server`.
- [ ] Invite inválido/expirado tem estado amigável e seguro.

---

## 20.5 Modal `Invite People`

```text
┌───────────────────────────────────────────────┐
│ Invite People to BHR                     ✕   │
│                                               │
│ Invite link                                   │
│                                               │
│ ┌───────────────────────────────┬───────────┐ │
│ │ likecord.../invite/abc123     │   Copy    │ │
│ └───────────────────────────────┴───────────┘ │
│                                               │
│                     Copied ✓                  │
└───────────────────────────────────────────────┘
```

O preview público/F.5.2 permanece mínimo: nome seguro do servidor, sem contagem de membros, canal de destino, ícone, `serverId` público ou campos administrativos. Expiração, limite de usos e Manage Invites pertencem à F.5.4 implementada; não fazem parte do modal canônico de F.5.3.

### Acceptance
- [x] URL canônica `/invite/{code}`.
- [x] Copy + feedback `Copied ✓`.
- [x] Mostra a identidade do servidor; não existe Channel de destino no contrato/schema atual.
- [x] Administração avançada foi implementada na F.5.4 e permanece fora do modal canônico de F.5.3.

---

## 20.6 Header/Menu do servidor + Channel Sidebar

```text
┌─────────────────────────┐
│ BHR                  ˅  │
├─────────────────────────┤
│ TEXT CHANNELS        +  │
│ # general               │
│ # teste                 │
│                         │
│ VOICE CHANNELS       +  │
│ 🔊 Sala Geral           │
│    User A               │
│    User B               │
└─────────────────────────┘
```

Menu do servidor:

```text
┌────────────────────────────┐
│ Invite People              │
│ Create Channel             │
│ Create Category            │
│                            │
│ Server Settings            │
├────────────────────────────┤
│ Leave Server               │
└────────────────────────────┘
```

### Acceptance
- [x] Nome/chevron do servidor abre menu.
- [x] Ações respeitam permissões.
- [x] `+` próximo de TEXT/VOICE cria canal no contexto correto.
- [x] `+` no header da Category abre o mesmo fluxo com a Category pré-selecionada.
- [x] Seções/Categories vazias seguem `MANAGE_CHANNELS` sobre o conjunto permission-filtered, sem revelar estrutura privada.
- [x] Botão direito no Server Rail oferece o mesmo Leave canônico somente para non-owner.
- [x] Tooltip de criação escapa visualmente do overflow da Channel Sidebar.
- [x] Não depender de botões textuais `+Invite` / `+Ch` como solução final.
- [x] Ícones/SVG próprios do Likecord.

---

## 20.7 Modal `Create Channel`

```text
┌──────────────────────────────────┐
│ Create Channel               ✕  │
│                                  │
│ Channel Type                     │
│                                  │
│ ◉ Text Channel                   │
│ ○ Voice Channel                  │
│                                  │
│ Channel Name                     │
│ ┌──────────────────────────────┐ │
│ │ projeto                      │ │
│ └──────────────────────────────┘ │
│                                  │
│ Private Channel       [future]   │
│                                  │
│       Cancel     Create Channel  │
└──────────────────────────────────┘
```

### Acceptance
- [x] `+` de TEXT pré-seleciona Text.
- [x] `+` de VOICE pré-seleciona Voice.
- [x] Criar não força observers para o canal.
- [x] Canal aparece realtime para clientes elegíveis pelo mecanismo F.3 concluído.

---

## 20.8 Voice Presence no Channel Sidebar

```text
┌─────────────────────────────┐
│ BHR                      ˅  │
├─────────────────────────────┤
│ TEXT CHANNELS            +  │
│ # general                   │
│ # desenvolvimento           │
│ # random                    │
│                             │
│ VOICE CHANNELS           +  │
│                             │
│ 🔊 Sala Geral               │
│    ◉ User A                 │
│    ◉ User B                 │
│                             │
│ 🔊 Reunião                  │
│    ◉ User C                 │
│                             │
├─────────────────────────────┤
│ [avatar] User A             │
│          🎙   🎧   ⚙        │
└─────────────────────────────┘
```

### Acceptance
- [x] Presence é visível mesmo fora da call.
- [x] Observer fora da call não cria WebRTC/ICE/TURN.
- [x] Observer fora da call não recebe áudio nem speaking analysis.
- [x] Entrar/sair da voice atualiza presence em realtime.

Estes itens passaram na cobertura automatizada e no staging C1/C2; evidência
imutável no [contrato F.6](./f6-voice-ux.md#accepted-c2-staging-evidence--2026-09-02).

---

## 20.9 Speaking Indicator

Conceito:

```text
🔊 Sala Geral

   ╭────────╮
   │ User A │    ← ring enquanto fala
   ╰────────╯

     User B
```

### Acceptance
- [x] Só participantes da mesma call têm speaking detection.
- [x] Analisa apenas MIC/CALL audio.
- [x] `selfMute` nunca aparece como speaking.
- [x] Hysteresis de 300 ms evita flicker.
- [x] Analysis path não cria sink de áudio extra.

Estes itens passaram na cobertura automatizada e no staging C2/C2P; evidência
imutável no [contrato F.6](./f6-voice-ux.md#accepted-c2-staging-evidence--2026-09-02).

---

## 20.10 Context menu do usuário no Voice

O wireframe abaixo é referência histórica do personal mix de F6, não o menu
completo atual nem autorização para View Profile. A
[convergência Member/Voice](./member-voice-context-menu-convergence.md) é a
autoridade atual: Roles, Voice, ações de servidor e utilidade aparecem apenas
quando aplicáveis ao participante remoto; self Voice mantém apenas identidade.

```text
                  ┌─────────────────────────────┐
                  │ User B                      │
                  │                             │
                  │ User Volume                 │
                  │                             │
                  │ ────────●──────────  40%    │
                  │                             │
                  │ ☐ Mute locally              │
                  │                             │
                  ├─────────────────────────────┤
                  │ View Profile       [future] │
                  └─────────────────────────────┘
```

Escala contratual:

```text
0%                         100%
|-------------●-------------|
              50%
```

### Acceptance
- [x] Volume é local ao listener.
- [x] `A → B` não altera `C → B`.
- [x] Local mute é separado do slider.
- [x] Desmutar restaura volume anterior.
- [x] Persistência no PostgreSQL por `listenerUserId + targetUserId`.
- [x] Atua somente em CALL/MIC audio.
- [x] Screen Share audio permanece independente.

C2 playback and C3 durability/media staging passed. The final C4 popover
has no explicit Reset button; its Web-only smoke passed, as recorded in the
[F.6 closure](./f6-voice-ux.md#final-accepted-f6-runtime-and-c4-staging-smoke--2026-09-02).
The later Member/Voice convergence is also complete/frozen; neither historical
acceptance is rerun by visual discovery.

---

## 20.11 Delete Message

```text
Delete (normal click)
   ↓
┌──────────────────────────────────────────┐
│ Delete Message                       ✕  │
│                                          │
│ Are you sure you want to delete this    │
│ message?                                 │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ User A                               │ │
│ │ Essa é a mensagem que será apagada… │ │
│ └──────────────────────────────────────┘ │
│                                          │
│              Cancel      Delete          │
└──────────────────────────────────────────┘

Shift+click Delete
   ↓
same protected delete operation (modal bypass only)
```

### Acceptance
- [x] Clique normal em Delete exige confirmação; Shift+click é um bypass explícito apenas do modal e preserva a mesma autorização/lifecycle — automatizado.
- [x] Após sucesso, mensagem desaparece da timeline — automatizado.
- [x] Não deixa tombstone permanente por padrão — automatizado.
- [x] Remoção sincroniza realtime — automatizado.
- [x] Attachment DB/storage cleanup é tratado com segurança — automatizado.
- [x] Critérios manuais e staging do contrato F.4.

---

## 20.12 Screen Share — polish futuro

Referência histórica de interação, subordinada ao [owner SCREEN_SHARE_UX_01](./screen-share-ux.md).
Os itens abaixo foram promovidos ao escopo pré-RC; os antigos rótulos
FUTURO/OPCIONAL não definem mais a classificação atual. O contrato está aceito/congelado; os controles de SSUX.1 estão
implementados/validados. A máquina de estados de SSUX.2 também está implementada;
a evidência corrente e o limite de aceitação pertencem ao owner dedicado.

```text
┌───────────────────────────────────────────────────────┐
│ User B — Screen                                      │
│                                                       │
│                                                       │
│                     SCREEN                            │
│                                                       │
│                                                       │
│                         🔊 ───●──── 75%   ⛶   ⋯       │
└───────────────────────────────────────────────────────┘
```

Possíveis controles:

- [ ] **FUTURO / OPCIONAL** volume por stream e mute local por share.
- [ ] **FUTURO / OPCIONAL** fullscreen e feedback de `Stop Sharing`.
- [ ] **FUTURO / OPCIONAL** detach/reattach com drag/move, resize e bounds/snap.
- [ ] **FUTURO / OPCIONAL** preview próprio compacto/oculto apenas como apresentação, sem alterar `HIDDEN` de transporte.
- [ ] **FUTURO / OPCIONAL** duplo clique no preview próprio promove para `CENTRAL`/`FOCUS`.
- [ ] **FUTURO / OPCIONAL** foco remoto colapsa o preview próprio para tile compacto.
- [ ] **FUTURO / OPCIONAL** estado `MINIMIZED` preserva transporte e áudio; `Restore` retorna ao estado principal/anterior.
- [ ] **FUTURO / OPCIONAL** minimizar disponível de `CENTRAL`/Grid/Focus/DETACHED onde suportado.

## 20.13 Media Viewer / Lightbox

**HISTORICAL / LOW-FIDELITY REFERENCE:** this wireframe and checklist are
superseded by the complete, accepted and frozen
[`MEDIA_VIEWER_01` final acceptance](./media-viewer.md#27-mv3-final-acceptance-and-feature-freeze--2026-09-08).
They do not define current pending work.

```text
┌────────────────────────────────────────────────────────┐
│ Media Viewer                                      ✕   │
│                                                        │
│                  [ image / fit ]                       │
│                                                        │
│       ‹       −   100%   +       ⛶   Open original    │
│                                                        │
│                         Download                       │
└────────────────────────────────────────────────────────┘
```

### Acceptance

- [x] Imagem abre em viewer maior dentro da aplicação.
- [x] Zoom, pan quando ampliado, fit-to-screen e reset/100% preservam a proporção.
- [x] Escape fecha; fullscreen, `Open original` e download permanecem disponíveis quando apropriado.
- [x] Carousel previous/next funciona quando há múltiplas imagens.
- [x] GIF faz parte do V1 aceito e passou validação runtime nativa.
- [ ] **FORA DO V1 / DIFERIDO:** vídeo e PDF permanecem fora do escopo; não foram implementados.

---

# 21. Padrão recomendado para cada nova UI

Cada stage de UI/UX deve manter três blocos no documento:

```markdown
## Feature

### Checklist
- [ ] O que precisa existir

### Wireframe
```text
hierarquia visual low-fidelity
```

### Acceptance Criteria
- [ ] Como provar que terminou
```

Evitar especificações prematuras de:

- largura exata;
- padding exato;
- radius exato;
- tamanho de fonte pixel-perfect;
- cores definitivas;

salvo quando o stage já for especificamente de design system/polish visual.

O Markdown deve fixar principalmente:

- hierarquia;
- localização;
- ações;
- estados;
- navegação;
- comportamento;
- critérios de aceite.

---

# 22. Permissions, Roles & Channel Management

As regras de autorização canônicas estão em [permissions-model.md](./permissions-model.md). Esta seção descreve somente interação, estados e wireframes; não redefine segurança.

## Sequência de produto

- [x] **F.3.5A — backend permission foundation (concluído):** permissões efetivas de servidor, `@everyone`, múltiplas roles, Owner, Administrator, hierarquia e proteção contra escalada.
- [x] **F.3.5A-R — Role Management & validation enablement:** propagação realtime, Settings capability-aware, reordenação segura, permissões binárias, hoist, agrupamento e assignment pela Member List.
- [x] **F.3.5B.1 — Channel Permission Engine & Category Model:** persistência, resolução autoritativa, sync/unsync, filtragem e invalidação segura.
- [x] **F.3.5B.2 — Channel / Category Permissions UX (CLOSED):** implementação e validações automatizada, manual local e integrada de staging concluídas; editor visual, controles tri-state, sync/unsync confirmados, Private Channel atômico, composer/anexos permission-aware e revogação ativa.
- [x] **F.5.4 — Server Settings & Invite Administration — COMPLETE:** foundation compartilhada e administração de invites aceitas manualmente no runtime corretivo imutável.
- [x] **F.5.5 — Channel & Category Management UX — COMPLETE:** implementação e smoke visual final aceitos em staging; estado e runtime atuais em [f5-channel-category-management.md](./f5-channel-category-management.md).

## Shared Settings Layer — `IMPLEMENTED / F.5 COMPLETE`

Server Settings, Channel Settings e Category Settings devem convergir em uma Settings Layer full-page/page-layer própria do Likecord. Esta é uma decisão de apresentação e navegação: não redefine APIs, permissões canônicas, persistência de Channel/Category, autorização realtime nem semântica de Roles, Members ou Invites.

Estrutura conceitual compartilhada:

```text
SETTINGS LAYER
┌─────────────────────────────────────────────────────────────┐
│ contextual navigation │ current settings content           │
│ grouped sections      │                                    │
│                       │                                    │
│ destructive action    │                              X     │
│                       │                             ESC    │
└─────────────────────────────────────────────────────────────┘
```

- navegação contextual à esquerda e conteúdo central, em vez de pequeno modal centralizado;
- navegação permanece visível em desktop e o conteúdo rola de forma independente/apropriada;
- seções são agrupadas e ações destrutivas ficam visualmente separadas;
- há fechamento explícito e Escape fecha quando seguro/consistente;
- seções sem permissão não são oferecidas como navegação utilizável, sem substituir checks autoritativos do backend;
- padrões familiares podem inspirar hierarquia/interação, mas a identidade e os primitives do Likecord permanecem autoritativos; não copiar visualmente o Discord;
- este contrato não fixa largura, cor, padding, tipografia, URL final nem arquitetura mobile/responsiva.

Alocação aceita:

- **F.5.4 / Server Settings:** introduz a foundation da shell e reutiliza Overview e Roles. Invite Administration usa inventário autoritativo newest-first, estados `ACTIVE / EXPIRED / EXHAUSTED / REVOKED`, presets de expiração e `maxUses`, Copy e Revoke confirmado. Políticas existentes não são editadas in-place; cria-se novo Invite e opcionalmente revoga-se o anterior. O contrato exato está em [f5-server-settings-invite-admin.md](./f5-server-settings-invite-admin.md).
- **F.5.5 / Channel Settings:** reapresenta `Overview`, rename, move para Category/No Category, `Permissions`, sync/unsync relacionado e `Delete Channel` na shell compartilhada. Não adiciona slowmode, NSFW, video quality, invite destination, integrations ou outras opções não suportadas.
- **F.5.5 / Category Settings:** reapresenta `Overview`, persistência/rename, `Permissions` e `Delete Category` na mesma shell. Preserva o editor e a segurança realtime existentes.

F.5.4.1 passou o aceite manual final no runtime imutável registrado em seu contrato. F.5.5 passou o aceite manual final e o smoke visual de seu polish na mesma shell, conforme [seu contrato dedicado](./f5-channel-category-management.md), sem alterar contratos realtime. F.5 está completo e congelado; reutilizar esta shell em trabalho futuro não reabre o milestone por si só.

`DEFERRED / LOW / BEFORE-RC UX SWEEP`: `UI-INVITE-UNAVAILABLE-COPY-01` registra que o bloqueio funcional de Invite esgotado está correto, mas a cópia pública ainda é genérica. Um polish futuro pode distinguir expired/exhausted/revoked/invalid quando isso for seguro; não bloqueou F.5.4 e não integra F.5.5.

O recorte [F7.3 W4](./f7-core-user-ux.md#19-f73-bounded-sweep-implementation-and-triage)
implementou somente a cópia genérica compatível com o payload atual, com testes
automatizados aprovados e staging aceito no fechamento F7. Distinguir motivos privados continua
diferido e não autoriza mudar o contrato congelado de Invite.

## PRESENCE-01 — `DEFERRED / BEFORE-RC`

**HISTORICAL:** uma observação intermitente no aceite final de F.5.3 mostrou membership correta e imediata, mas estado Offline divergente entre clientes até uma mudança explícita de presença; aquela repetição não reproduziu. Há também observação anterior de inconsistência após inatividade/restauração. Esse registro não invalida os aceites congelados de F5/F6.

**Evidência nova fornecida pelo usuário em VI.0, 2026-09-03:** a divergência
continua observável entre clientes conectados; inatividade/browser em segundo
plano ou minimizado pode deixar usuários Offline; interação normal pode não
restaurar Online consistente, enquanto recarregar a página (F5) ou mudar status
manualmente pode reconciliar. Não houve reprodução nem investigação de runtime
em VI.0. Estado: **confirmed_before_rc_separate_owner**, sem correção afirmada.

**DECISION_ACCEPTED / DEFERRED:** Presence final autoritativa no servidor,
reconciliação Online/Away/Offline, múltiplas sessões/abas/browsers,
heartbeat/reconnect, inatividade, restauração, estado inicial após Join e
atividade Voice pertencem ao trabalho próprio de produto/realtime BEFORE-RC.
Do Not Disturb/Busy existente também deve ser reconciliado nesse contrato futuro.
Membros não Offline permanecem nos grupos normais de role/hoist; Offline aparece
uma vez em seção dedicada ao final. Inatividade com sessão válida deve normalmente
significar Away/Idle. Timeouts e mecânicas permanecem por definir.

Direção futura aceita para a política de idle Voice: desconexão automática
configurável após X de inatividade contínua; fala/atividade Voice significativa
e interação significativa com Likecord reiniciam o idle. Desconectar Voice por
idle **não** implica Offline. O possível significado de `0/null` como desativado
é **PROPOSED**, sujeito ao futuro contrato Presence; valor de X, configuração,
ownership de sessão e mecanismo ainda não foram definidos.

`VISUAL_IDENTITY_01` não adota nem implementa PRESENCE-01/idle Voice, não altera
backend/realtime e não encerra essa dívida. Ausência de reprodução em uso comum
não significa FIXED; F5/F6/F7 e Member/Voice continuam completos/congelados.

## Gate de entrega antes de F.4

- [x] **F.3.5B:** CLOSED.
- [x] **Dependency / Runtime / Security Audit — Phase A:** COMPLETE.
- [x] **Dependency / Runtime / Security Audit — Phase B:** COMPLETE; plano autoritativo em `docs/security/pre-f4-runtime-upgrade-plan-2026-08-27.md`.
- [x] **Remediação pré-F.4 concluída:** `SEC-BUILD-01`, `SEC-WS-01`, alinhamento runtime suplementar de `SEC-WS-01`, `SEC-TURN-01`, `RUNTIME-NODE-01` e `WEB-NEXT-01`.
- [x] **Preparação de `SEC-PREF4-GATE`:** baseline de staging PASS, readiness R2 de staging PASS e pacote de rollback PASS.
- [x] **`APPLICATION_READINESS_RACE`:** CORRECTED.
- [x] **`SEC-PREF4-GATE`:** PASS no candidato runtime `accepted pre-F.4 security candidate`; Candidate-B2-A/B2-B/B2-C PASS e zero blocker corrente. Registro consolidado em `docs/security/sec-pref4-final-acceptance-2026-08-30.md`.
- [x] **F.4:** COMPLETE; implementação, validação automatizada e aceite manual/staging final concluídos.

## UI/UX polish preservado para etapa posterior

### Chat message layout

- [ ] mensagens próprias alinhadas à direita;
- [ ] mensagens de outras pessoas alinhadas à esquerda;
- [ ] largura máxima responsiva e adequada para desktop;
- [ ] preservar replies, attachments, markdown, reactions, timestamps e actions.

### Permission-aware controls

- [ ] CONNECT negado: estado visual disabled/unavailable e tooltip/feedback explicativo;
- [x] SPEAK negado: preservar o comportamento já implementado de disabled/unavailable com tooltip/feedback explicativo;
- [ ] STREAM negado: o controle de Screen Share espelha o comportamento de SPEAK, fica disabled, usa `aria-disabled` quando apropriado e exibe tooltip específico da permissão;
- [ ] restauração realtime da permissão STREAM devolve a ação de Screen Share.

### Screen Share presentation

Escopo agora pertencente ao [SCREEN_SHARE_UX_01](./screen-share-ux.md), próximo
stage oficial com contrato aceito/congelado e SSUX.1 + SSUX.2 implementados/validados. SSUX.3 teve [validação técnica/publicação Web aprovadas](./screen-share-ux.md#21-ssux3-technical-release-candidate-and-operator-handoff--2026-09-11); candidato de áudio genérico 64 kbps publicado; matriz manual pausada até rollout e R01 (§23). Estéreo permanece adiado em `SCREEN_SHARE_STEREO_01`, fora desta comissão. Esta lista é
referência de escopo; estados, decisões e aceite pertencem ao contrato dedicado.
`HIDDEN` é apresentação com guarda de áudio, não um estado de transporte.

- [ ] DETACHED com drag/move, resize e limites de viewport/snap;
- [ ] fullscreen, volume por stream e polish de detach/reattach;
- [ ] feedback explícito de `Stop Sharing`;
- [ ] preview próprio pode ser colapsado/ocultado localmente sem afetar a transmissão;
- [ ] preview próprio oculto/compacto é apenas apresentação e não reutiliza nem altera a semântica de transporte `HIDDEN` do viewer;
- [ ] duplo clique no preview próprio pode promovê-lo para `CENTRAL`/`FOCUS`;
- [ ] focar uma Live remota pode colapsar o preview próprio para um tile compacto;
- [ ] introduzir um verdadeiro estado de apresentação `MINIMIZED` para a Live;
- [ ] `MINIMIZED` não significa `Leave Stream` e preserva o transporte ativo;
- [ ] `MINIMIZED` preserva o áudio de Screen Share, salvo mute separado pelo usuário;
- [ ] `Restore` retorna a Live a um estado de apresentação principal/anterior apropriado;
- [ ] disponibilizar minimizar de forma consistente em `CENTRAL`/Grid/Focus/DETACHED onde a UX final suportar.

### Media Viewer / Lightbox

**HISTORICAL BACKLOG SUPERSEDED:** `MEDIA_VIEWER_01` consumed and completed the
implemented V1 items below. Current authoritative status and evidence belong to
the [dedicated Media Viewer contract](./media-viewer.md#27-mv3-final-acceptance-and-feature-freeze--2026-09-08).

- [x] clicar em uma imagem abre um Media Viewer / Lightbox maior dentro da aplicação;
- [x] zoom in e zoom out;
- [x] pan por mouse/toque quando ampliado;
- [x] fit-to-screen e 100%/reset;
- [x] fullscreen quando apropriado;
- [x] Escape fecha;
- [x] carousel/previous/next quando houver múltiplas imagens;
- [x] abrir original;
- [x] manter a ação de download existente;
- [x] preservar a proporção da imagem;
- [x] GIF pertence ao V1 aceito e validado em runtime nativo;
- [ ] **FORA DO V1 / DIFERIDO:** vídeo, PDF e media expandida permanecem trabalho futuro.

Esses itens são backlog de apresentação e não alteram o transporte/state machine de Screen Share nem a remediação de runtime.

## F.3.5B.1 — backend/data concluído

- [x] Category persistente e relação opcional `Channel -> Category`
- [x] estado backend `permissionsSynced`
- [x] overwrites `ROLE` / `MEMBER` com bitsets `allow` / `deny`
- [x] resolução canônica `DENY / NEUTRAL / ALLOW`
- [x] listagem e acesso direto protegidos por `VIEW_CHANNEL` efetivo
- [x] APIs de Category, overwrite e transições sync/unsync para a futura UI
- [x] autorização efetiva em mensagens, anexos, Voice e Screen Share
- [x] invalidação realtime e revogação ativa sem payload de metadados privados
- [x] separação backend entre estrutura (`MANAGE_CHANNELS`) e administração de overwrites/sync (`MANAGE_ROLES`), com hierarquia e teto de concessão

F.3.5B.1 estabeleceu a base autoritativa. F.3.5B.2 conclui abaixo a UX efetivamente implementada; as validações automatizada, manual local e integrada de staging estão concluídas e o milestone está CLOSED. Itens opcionais ou de polish posterior permanecem desmarcados.

## Role Management UI

- [x] Roles page in Server Settings, visível por `MANAGE_ROLES`
- [x] ordered role list
- [x] create role
- [x] rename role
- [x] delete eligible role
- [x] drag/reorder role hierarchy, com controles acessíveis ↑/↓
- [ ] role color/icon only if later supported
- [x] binary ON/OFF permission toggles grouped by General / Server, Text, and Voice
- [x] member role assignment through the persistent Member List context menu
- [x] prevent UI from offering roles above actor hierarchy
- [x] clear warning for Administrator permission
- [x] durable `Display members separately` (`isHoisted`) control
- [x] Member List grouping under the highest explicitly assigned hoisted role
- [x] ordinary role named `Owner` may group multiple members; crown remains exclusive to `Server.ownerId`
- [x] realtime `permissions:changed` refresh without duplicate listeners

The persistent Member List is the primary assignment surface in F.3.5A-R. A future role-centric `Manage Members` surface may be added later, but must reuse the same hierarchy-safe APIs rather than duplicate authorization logic.

### Estrutura planejada de Server Settings

```text
Server Settings
├── Overview
├── Roles
├── Members
├── Invites
└── [future moderation sections]
```

```text
┌────────────────────────────────────────────────────────────┐
│ Server Settings                                            │
├──────────────────┬─────────────────────────────────────────┤
│ Overview         │ Roles                                   │
│ Roles          → │                                         │
│ Members          │ ┌──────────────────┐                    │
│ Invites          │ │ Admin            │ ↑                  │
│                  │ │ Moderator        │ │ hierarchy        │
│                  │ │ Staff            │ │                  │
│                  │ │ Member           │ ↓                  │
│                  │ │ @everyone        │                    │
│                  │ └──────────────────┘                    │
│                  │                                         │
│                  │ Permissions                             │
│                  │ Server                                  │
│                  │ [ ] Manage Server                       │
│                  │ [ ] Manage Roles                        │
│                  │                                         │
│                  │ Text                                    │
│                  │ [ ] View Channel                        │
│                  │ [ ] Send Messages                       │
└──────────────────┴─────────────────────────────────────────┘
```

### Acceptance concluída para F.3.5A-R

- [x] Roles iguais ou acima do ator aparecem protegidas e não acionáveis.
- [x] `@everyone` fica fixada na base e não oferece rename/delete/reorder/hoist.
- [x] Mudanças de permissão mostram erro autoritativo do backend quando houver corrida ou perda de acesso.
- [x] Administrator exibe aviso de alto risco antes de salvar.
- [x] A role do servidor usa somente ON/OFF; OFF é ausência de grant, nunca deny/herança posicional.
- [x] A seção `Roles` funciona para moderador com apenas `MANAGE_ROLES`, sem liberar General/Audit.
- [x] Assignment/remoção, edição, exclusão e reordenação propagam a autorização para clientes abertos.

## Channel Management UI

- [x] Create Channel with Text/Voice and visible Category selection.
- [x] Edit Channel overview.
- [x] Rename Channel.
- [x] Move Channel to a visible Category or No Category.
- [x] Delete Channel.
- [x] Delete confirmation modal.
- [x] Read-only SYNCED / UNSYNCED / INDEPENDENT presentation.
- [x] Permission-aware Channel context management.
- [x] Channel Permissions tab
- [x] role permission overrides
- [x] member-specific permission overrides
- [x] tri-state controls: neutral / allow / deny
- [x] Remove Override without deleting the Role, Member, or assignment.
- [x] Hierarchy-aware Role/Member target selection with backend authority retained.
- [x] Private Channel shortcut/preset com criação transacional, `@everyone VIEW_CHANNEL = DENY` e ALLOWs explícitos para Roles/Members selecionados.
- [x] permission-aware action visibility

```text
┌────────────────────────────────────────────────────┐
│ Edit Channel — #admin                              │
├────────────────┬───────────────────────────────────┤
│ Overview       │ Permissions                       │
│ Permissions  → │                                   │
│ Delete Channel │ Roles / Members                   │
│                │                                   │
│                │ @everyone                         │
│                │ View Channel   [ / ] [✓] [✕]     │
│                │ Send Messages  [ / ] [✓] [✕]     │
│                │                                   │
│                │ Admin                             │
│                │ View Channel   [ / ] [✓] [✕]     │
└────────────────┴───────────────────────────────────┘

/ = NEUTRAL    ✓ = ALLOW    ✕ = DENY
```

### Acceptance concluída localmente

- [x] O preset Private Channel explica que somente Roles/Members selecionados poderão ver o Channel e envia o conjunto completo em uma criação atômica.
- [x] Ação de delete usa confirmação com nome/contexto do canal.
- [x] Rename/delete/move acompanham `MANAGE_CHANNELS` efetivo; aba Permissions, overwrites e sync/unsync acompanham `MANAGE_ROLES` mais `VIEW_CHANNEL`, sem tratar gating visual como segurança.
- [x] Roles/members iguais, superiores, o próprio ator e o owner real aparecem protegidos e não acionáveis; uma Role comum chamada `Owner` não recebe tratamento especial.
- [x] `@everyone` segue a regra segura de hierarquia e controles `ALLOW` acima do teto de concessão não são oferecidos.
- [x] Falha autoritativa do backend mantém o formulário, refaz a leitura autoritativa e explica perda de acesso/hierarquia.

## Category UI

- [x] Sidebar Category grouping with local collapse state.
- [x] Create Category.
- [x] Edit Category overview / rename.
- [x] Delete Category with confirmation that children survive.
- [x] Create Channel inside Category from the Category context menu.
- [x] Permission-aware Category context management.
- [x] Category Permissions tab and raw overwrite editor.
- [x] channel permission sync state (read-only)
- [x] Sync Permissions action com confirmação destrutiva e refetch autoritativo.
- [x] Unsync action com confirmação e cópia exclusivamente backend da fonte de Category.
- [x] clear SYNCED / UNSYNCED / INDEPENDENT indication

```text
┌────────────────────────────────────────────────────┐
│ Category — STAFF                                   │
├────────────────────────────────────────────────────┤
│ # staff-chat                         SYNCED         │
│ # admin                              UNSYNCED       │
│ 🔊 Voice Staff                       SYNCED         │
│                                                    │
│                          [ Sync Permissions ]      │
└────────────────────────────────────────────────────┘
```

### Acceptance concluída localmente

- [x] Estado SYNCED significa uso integral e exclusivo dos overrides da Category.
- [x] Unsync explícito converte o Channel para fonte local com confirmação clara e preserva o estado efetivo imediato.
- [x] Sync Permissions mostra que overrides locais serão substituídos.
- [x] Edição estrutural de Category acompanha `MANAGE_CHANNELS`; editor de overwrites acompanha `MANAGE_ROLES`.
- [x] Move de um Channel SYNCED entre Categories explica a troca da fonte efetiva e trata rejeições de hierarquia/teto do backend.
- [x] Category sem filhos visíveis não aparece para membro comum, mas permanece disponível aos administradores estruturais/de permissões autorizados.

## F.3.5B.2 — runtime permission lifecycle concluído localmente

- [x] Composer desabilita submissão normal sem `SEND_MESSAGES` e reabilita após reconciliação realtime.
- [x] Botão/file picker/paste de anexos exigem `SEND_MESSAGES + ATTACH_FILES`; os bits continuam independentes e texto permanece disponível quando apenas `ATTACH_FILES` é negado.
- [x] Backend continua sendo a fronteira de segurança e mantém `403` para requests forjados de mensagem/anexo.
- [x] Perda de `READ_MESSAGE_HISTORY` limpa histórico antigo e ignora resposta de histórico em corrida.
- [x] Perda de `VIEW_CHANNEL` fecha settings/histórico e usa fallback canônico F.2 sem reload completo.
- [x] Perda de `CONNECT` remove Voice/Redis/signaling, limpa WebRTC local sem loop e bloqueia nova tentativa antes de adquirir microfone enquanto CONNECT continuar negado.
- [x] Perda de `SPEAK` mantém `CONNECT`, força mute, bloqueia Unmute normal/forjado e exige Unmute deliberado depois da restauração.
- [x] Perda de `STREAM` encerra Screen Share uma vez e preserva Voice quando `CONNECT` continua permitido.
- [x] Private Channel categorizado inicia `UNSYNCED`, preservando Category assignment e usando somente a fonte local privada.
- [x] Mutação tri-state mantém o editor montado durante refetch autoritativo, sem blank/loading flash.
- [ ] **Intermittent Voice ICE auth 401:** dívida de confiabilidade pré-RC registrada; não reproduzida e sem mudança ICE/auth nesta etapa.
- [ ] **Private Category preset (opcional):** deferred; o Category Permissions editor já oferece a configuração equivalente manual.
- [x] **F.3.5B manual end-to-end validation:** concluída localmente e aceita na regressão integrada de staging do `SEC-PREF4-GATE`.

---

# 23. WEB-NEXT-01 — validação de UI/UX e backlog responsivo

## Validação concluída

- [x] **WEB-NEXT-01:** concluído com Next.js `16.3.3`, React `19.2.8` e React DOM `19.2.8`.
- [x] Regressão manual de navegador aprovada para `AUTH`, `NAVIGATION`, `MESSAGING`, `ATTACHMENTS`, `REALTIME`, `VOICE`, `SCREEN_SHARE` e `BROWSER_CONSOLE`.
- [x] Nenhuma regressão observada em hydration, comportamento de runtime do Next/React, navegação autenticada, mensagens, realtime, Voice ou Screen Share.

## UX-RESPONSIVE-01 — navegação em viewport estreito

- [ ] **MEDIUM — FUTURO / OPCIONAL:** adaptar a navegação principal para viewports estreitos.
- **Classificação:** `PREEXISTING_PRODUCT_LIMITATION`.
- **Origem:** regressão manual do `WEB-NEXT-01`.

Em aproximadamente `390x844`, o layout atual, orientado a desktop, não é responsivo. A comparação com o baseline anterior ao Next 16 / React 19 confirmou que:

- o Server Rail permanece visível, com aproximadamente `72px`;
- a Channel Sidebar permanece visível, com aproximadamente `240px`;
- as duas superfícies de navegação não encolhem;
- o conteúdo principal fica comprimido ou cortado;
- não há comportamento mobile atual que recolha essas superfícies;
- as regras CSS existentes para larguras estreitas não resolvem a navegação principal da aplicação.

Esse comportamento antecede o `WEB-NEXT-01` e **não é uma regressão do upgrade**.

## Direção futura

### Abaixo de aproximadamente 768px

- reservar o viewport utilizável para o conteúdo principal;
- transformar a navegação de servidores em drawer, overlay ou navegação mobile equivalente;
- transformar a navegação de canais em drawer, overlay ou navegação mobile equivalente;
- evitar Server Rail, Channel Sidebar e conteúdo principal permanentemente visíveis ao mesmo tempo.

### Aproximadamente 768px–1024px

- suportar sidebars adaptativas ou recolhíveis adequadas para tablets.

### Desktop

- preservar a experiência atual orientada a desktop, salvo decisão posterior de UX.

## Escopo

- `UX-RESPONSIVE-01` não foi implementado durante o `WEB-NEXT-01`.
- É trabalho futuro de UI/UX.
- Não bloqueia a conclusão do `WEB-NEXT-01`.
- Deve ser agendado pelo processo normal de priorização deste roadmap.

---

# 24. Quality, Security & Release Candidate Gates

Esta seção é a fonte de alto nível para milestones, ordem e status cross-cutting de qualidade, segurança e release. Planos detalhados de implementação ou auditoria podem viver futuramente em documentos dedicados; esses documentos devem ser referenciados aqui, sem copiar integralmente seu conteúdo para este roadmap.

## 24.1 Gate concluído — SEC-PREF4-GATE

### Concluído

- [x] `SEC-BUILD-01`.
- [x] `SEC-WS-01`.
- [x] Alinhamento runtime suplementar de `SEC-WS-01`.
- [x] `SEC-TURN-01`.
- [x] `RUNTIME-NODE-01`.
- [x] `WEB-NEXT-01`.
- [x] Baseline de staging: PASS.
- [x] Readiness R2 de staging: PASS.
- [x] Pacote de rollback: PASS.
- [x] `APPLICATION_READINESS_RACE=CORRECTED`.
- [x] Candidate-B2-A: PASS.
- [x] Candidate-B2-B: PASS.
- [x] Candidate-B2-C: PASS.
- [x] `CURRENT_PREF4_BLOCKERS=0`.
- [x] `SEC_PREF4_FINAL_GATE_PASS=true`.

### Estado formal

```text
APPLICATION_READINESS_RACE=CORRECTED
SEC-BUILD-01=COMPLETE
SEC-WS-01=COMPLETE
SEC-TURN-01=COMPLETE
RUNTIME-NODE-01=COMPLETE
WEB-NEXT-01=COMPLETE
SEC-PREF4-GATE=PASS
Candidate-B2-A=PASS
Candidate-B2-B=PASS
Candidate-B2-C=PASS
CURRENT_PREF4_BLOCKERS=0
SEC_PREF4_FINAL_GATE_PASS=true
RUNTIME_CANDIDATE_MILESTONE=accepted pre-F.4 security candidate
F4_IMPLEMENTATION=COMPLETE
F4_STAGING_DEPLOYMENT_PASS=true
F4_WEB_DELTA_STAGING_DEPLOYMENT_PASS=true
F4_MANUAL_ACCEPTANCE_PASS=true
F4_COMPLETE=true
SEC_PREF4_REOPEN_REQUIRED=false
NEXT_ACTION=IMPLEMENT_F5_1_CANONICAL_INVITE_ENTRY
```

### Aceite final

- O candidato runtime aceito permanece `accepted pre-F.4 security candidate`.
- A API emite `ws:ready` somente após autenticação e inicialização das application rooms; a reconciliação Web usa esse marco application-ready.
- O pacote API/Web imutável correspondente foi aceito no staging com health público 200, rollback retido e infraestrutura preservada.
- TURN UDP autenticado e candidatos relay observados em redes distintas: PASS.
- O par ICE selecionado direto host ↔ host não é falha; selected relay não é requisito do gate vigente.
- TURN TCP permanece fallback condicional e já possui evidência funcional no `SEC-TURN-01`.
- `TURN-TLS-01` formaliza TURNS/5349 como trabalho diferido fora de `SEC-PREF4`; funcionalidade TURNS atual não é afirmada.
- Registro consolidado: `docs/security/sec-pref4-final-acceptance-2026-08-30.md`.
- O aceite posterior de F.4 pertence ao contrato F.4 e não é reclassificado como evidência histórica de `SEC-PREF4` nem altera o `RUNTIME_CANDIDATE_SHA` deste gate.

### Dívida preservada fora do gate

- `UI-MSG-SENDER-FLICKER-01`: LOW, flicker transitório apenas no sender, sem perda, duplicação, impacto no receiver ou erro relevante de console; dívida UX BEFORE-RC e não bloqueante.
- `UI-F4-DELETE-MODAL-SIZING-01`: LOW, conteúdo grande pode tornar o modal excessivo em relação ao viewport apesar da contenção correta de nomes longos; dívida UX BEFORE-RC e não bloqueante.
- `UX-RESPONSIVE-01`: limitação preexistente de viewport estreito; não bloqueante e preservada para o sweep UX pre-RC.
- R-10: closure/pruning das dependências de produção da API; BEFORE-RC e não bloqueia F.4.
- R-11: usuários runtime não-root para API/Web; BEFORE-RC e não bloqueia F.4.
- Voice ICE auth 401 intermitente: dívida de confiabilidade BEFORE-RC, não reproduzida no candidato aceito e não reaberta.

Atualização posterior, sem reabrir o gate: o
[registro F7.3](./f7-core-user-ux.md#19-f73-bounded-sweep-implementation-and-triage)
supersede o estado de implementação das duas primeiras dívidas acima. W2 foi
corrigido e aceito em staging no [fechamento F7](./f7-core-user-ux.md#20-final-f7-staging-acceptance-and-milestone-closure--2026-09-03).
W3 reproduziu transições de nome
e duas linhas transitórias em WS→REST, com convergência final/receiver estável;
foi escalado ao dono de messaging/API/realtime de `UI-MSG-SENDER-FLICKER-01` por
falta de correlação do envio otimista no payload atual. Sem evidência nova de
duplicação persistida ou regressão sistêmica Username→UUID. A descrição acima
permanece evidência histórica do gate, não prova de correção atual de W3.

As subdivisões Candidate-B2-A/B2-B/B2-C/B2-D foram checkpoints operacionais; o novo registro consolidado fecha a lacuna de documentação versionada. O commit documental posterior não altera a identidade do candidato runtime, não exige rebuild/redeploy e não reabre `SEC-PREF4`.

## 24.2 Ordem de produto e release

Depois de `SEC-PREF4 PASS`:

```text
F.4
  -> F.5
  -> F.6 / demais stages funcionais e de produto planejados
```

Antes do primeiro Release Candidate:

```text
TEST-HARDEN-01
  -> adoção de QA-GATE-01
  -> SEC-APP-AUDIT-01
  -> remediação de segurança conforme exigida
  -> SEC-DAST-01
  -> RC-STABILIZATION
  -> RC-SECURITY-GATE
  -> Release Candidate / Beta Gate
```

`TEST-HARDEN-01` e os gates de auditoria/RC não eram requisitos de entrada em `F.4` e não são requisitos de entrada em `F.5`; são obrigatórios antes do primeiro RC. Itens opcionais de polish visual não se tornam automaticamente requisitos de RC. `UX-RESPONSIVE-01` mantém sua priorização independente como **MEDIUM — FUTURO / OPCIONAL — `PREEXISTING_PRODUCT_LIMITATION`** e não bloqueia `SEC-PREF4` nem o stage funcional atual.

## 24.3 TEST-HARDEN-01 — Full Test Suite Reliability & Hardening

- [ ] **Prioridade:** HIGH.
- [ ] **Target:** obrigatório antes do primeiro Release Candidate.

O objetivo não é apenas aumentar coverage, mas provar que todas as suítes existentes são determinísticas, isoladas e confiáveis como gates de regressão.

### Escopo

- Unit tests, API integration tests, API E2E e Web tests.
- Authentication, authorization/permissions, messaging, realtime/WebSocket e reconnect.
- Interações com Redis e PostgreSQL.
- Voice, Screen Share, attachments e R2/storage.
- Prisma e testes sensíveis a runtime/infraestrutura.

### Auditoria de confiabilidade

- Fixed sleeps, premissas arbitrárias de timing, race conditions e event ordering.
- Confusão entre transport-connected e application-ready, usando a já corrigida `APPLICATION_READINESS_RACE` como exemplo histórico motivador.
- Sucesso dependente de retry, estado compartilhado e dependência da ordem de execução.
- Resíduo em PostgreSQL ou Redis.
- Sockets, timers ou servers deixados abertos e cleanup incompleto após falhas.
- Assertions fracas e ausência de assertions de negative path.
- Premissas específicas de ambiente e diferenças de timing entre Windows, Linux e containers.

Se `TEST-HARDEN-01` revelar um defeito real de produto, o defeito deve ser classificado e tratado separadamente; não pode ser ocultado por mudança no teste.

## 24.4 QA-GATE-01 — Permanent Test Reliability Policy

- [ ] **Política permanente:** adotar durante `TEST-HARDEN-01` e aplicar a testes novos ou modificados depois dele.

- Retry-until-green não é mecanismo de correção.
- Fixed sleeps exigem justificativa explícita; preferir condições observáveis e determinísticas de readiness.
- Conexão de transporte não implica automaticamente readiness da aplicação.
- Recursos criados por testes exigem cleanup determinístico, inclusive após falha.
- Testes não podem depender da ordem de execução.
- Negative-path tests devem verificar a ausência de efeitos colaterais não autorizados.
- Falhas não podem ser “corrigidas” apenas aumentando timeouts sem evidência.
- Durante estabilização de RC, suítes críticas podem ser executadas repetidamente de forma intencional para validar determinismo, mas nunca retried until green.

## 24.5 SEC-APP-AUDIT-01 — Comprehensive Application Security Audit

- [ ] **Prioridade:** HIGH.
- [ ] **Target:** obrigatório antes do primeiro Release Candidate.
- [ ] **Primeira fase — FINDINGS-ONLY:** descobrir e registrar achados sem remediá-los durante a descoberta; discovery e remediation permanecem fases separadas.

Usar **OWASP Top 10:2025** como taxonomia de risco e **OWASP ASVS 5.0** como referência detalhada de verificação/controles quando aplicável.

### Escopo, quando aplicável

- Autorização backend, enforcement de regras de negócio, BOLA/IDOR e acesso cross-server/cross-channel.
- Autenticação, sessões, JWT, lifecycle de refresh token, cookies, CSRF e CORS.
- Autenticação e autorização WebSocket, Cross-Site WebSocket Hijacking, roles, bypass de permissões e privilege escalation.
- Boundaries/exposição de PostgreSQL e Redis.
- Input validation, caminhos de SQL/injection, raw queries inseguras e mass assignment.
- XSS stored/reflected, segurança de markdown/rendering, path traversal e SSRF quando aplicável.
- Validação de upload, autorização de attachments, ownership/isolamento R2 e presigned URLs.
- Exposição de secrets em source/build/container, rate limiting/abuse prevention, vazamento de informação em erros e security logging.
- Segurança de credenciais TURN, abuso de relay TURN/WebRTC, configuração Docker/runtime e exposição de dependências/supply chain.

### Registro mínimo por finding

- Finding ID, severity, confidence e category.
- Mapping OWASP e mapping ASVS quando aplicável.
- Arquivo e linhas exatas, entry point afetado e resource/asset afetado.
- Evidence, attack scenario, controle existente e controle ausente/fraco.
- Necessidade de validação humana e método/tool de validação recomendado.
- Remediation status.

Este milestone não representa “AI corrigindo segurança automaticamente”. Findings exigem validação, triagem e uma fase de remediação separada.

## 24.6 Métodos de quality/security

As ferramentas abaixo são métodos dentro dos trabalhos de qualidade e segurança, não milestones independentes de produto:

- **Gitleaks:** secret scanning do estado atual e histórico.
- **Opengrep:** SAST e padrões estruturais de segurança.
- **Dependency audit:** vulnerabilidades de dependências.
- **Container/image scanning:** vulnerabilidades de candidate images e runtime images.
- **OWASP ZAP:** DAST de staging, passivo e active scanning autenticado controlado.
- **Validação adversarial manual:** autorização, BOLA/IDOR, roles, permissões, regras de negócio, isolamento WebSocket e cenários TURN/WebRTC.

## 24.7 SEC-DAST-01 — Authenticated Staging DAST & Manual Security Validation

- [ ] **Prioridade:** HIGH.
- [ ] **Target:** obrigatório antes do primeiro Release Candidate.

### Escopo

- Testes autenticados em staging com contas dedicadas e diferentes níveis de roles/permissões.
- Cobertura de rotas de API e cenários de autorização/regras de negócio.
- DAST passivo e DAST ativo autenticado controlado.
- Revisão de exposição no navegador e validação adversarial WebSocket quando apropriada.
- Checks de isolamento cross-user e cross-server.

Não executar DAST ativo destrutivo contra produção. Validação manual de segurança continua obrigatória onde ferramentas automatizadas não provam adequadamente o resultado, especialmente autorização e regras de negócio.

## 24.8 RC-STABILIZATION — estabilização antes do primeiro RC

Este gate expande, sem substituir ou duplicar, o milestone existente **Release Candidate / Beta Gate**.

- [ ] `TEST-HARDEN-01` concluído e `QA-GATE-01` adotado, com suítes críticas determinísticas.
- [ ] `SEC-APP-AUDIT-01` e `SEC-DAST-01` concluídos; findings identificados triados e remediados conforme exigido.
- [ ] Realtime/reconnect estáveis.
- [ ] Lifecycle de Voice estável, incluindo o bug preservado de Mute/Deafen.
- [ ] Lifecycle de Screen Share estável.
- [ ] Lifecycle de attachments/R2 estável.
- [ ] Regressão de authentication/session aceita.
- [ ] Dependency security e candidate image security aceitas.
- [ ] Regressão de browser console/hydration aceita.
- [ ] Regressão de Username -> UUID corrigida/aceita.
- [ ] Sweep geral de bugs/UX blockers concluído.
- [ ] Regressão de staging aceita.
- [ ] Stage 1/D — Backup / Restore / VPS Operations pronto.

## 24.9 RC-SECURITY-GATE — política de aceite de segurança

Antes do primeiro RC:

- [ ] Nenhum finding Critical permanece aberto.
- [ ] Nenhum finding High alcançável e não aceito permanece aberto.
- [ ] Todo finding High foi remediado ou explicitamente revisado e aceito com justificativa documentada.
- [ ] Isolamento de autorização foi validado.
- [ ] Secret scanning foi aceito.
- [ ] Findings de dependências e containers foram triados.
- [ ] Validação de segurança autenticada em staging foi aceita.

Findings Critical ou High claramente exploráveis descobertos antes do estágio pre-RC interrompem o trabalho normal do roadmap e são tratados imediatamente. “Auditoria de segurança pre-RC” não autoriza manter vulnerabilidades severas conhecidas até o RC.
