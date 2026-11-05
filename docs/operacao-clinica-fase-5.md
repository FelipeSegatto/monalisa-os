# Operação clínica: habilitações, agenda, atendimentos e ledgers

## Decisões

- Habilitações são configuradas na página de cada profissional, nunca inferidas de nomes, cargo ou login.
- Atribuição inicial por prioridade no mesmo intervalo: primeiro a profissional com menor número; se indisponível ou não habilitada, a próxima. Prioridade vazia exclui da atribuição automática. Não existe nome de proprietária fixado no código.
- Também existe atribuição manual. Esta desativa a reserva pública automática; não distribui atendimentos.
- **Próxima etapa, a pedido do usuário:** oferecer distribuição equilibrada como alternativa configurável à prioridade. Não implementar agora. Ela deverá considerar disponibilidade e habilitações. Antes da implementação, decidir se equilíbrio significa quantidade de atendimentos, minutos reservados ou outro critério e qual período de comparação. As duas profissionais autorizadas poderão optar pela política conforme as permissões administrativas do sistema.
- A configuração atual é por instalação do sistema. Não foi introduzido um modelo multiunidade.
- O procedimento fornece duração padrão; o agendamento preserva sua duração reservada. A confirmação permite ajustar o intervalo, sempre verificando conflitos. Início e conclusão do atendimento registram tempo realizado.
- Gel, espátula e outros materiais exigem resposta por execução: `USED`, `SMALL` ou `NOT_USED`. Não há resposta pré-selecionada, nem estimativa de gramas. Todo material previsto deve receber resposta, e materiais adicionais podem ser incluídos.
- Uso na sessão não baixa estoque. Embalagem consumida, reposição e ajuste físico geram movimentos separados. A unidade operacional é cadastrada pela clínica (por exemplo, pote, pacote ou refil); não há conversão automática de embalagens.

## Estrutura

| Contexto | Domínio | Aplicação e persistência |
| --- | --- | --- |
| Profissionais | `ProcedureQualifications` | Serviço de capacidades; habilitações, prioridade, jornada e auditoria de mudanças de habilitação |
| Agenda | `ProfessionalAssignmentPolicy`, `PriorityAssignmentPolicy`, `ManualAssignmentPolicy`, `WorkingCalendar` | `BookingService` e porta `SchedulingRepository`; consulta, reserva, confirmação e reatribuição |
| Atendimentos | `Attendance`, `ProcedureExecution` | Serviço e porta próprios; início, conclusão e cancelamento justificado |
| Disparos | `ShotCounter` | Serviço e porta de ledger; adapter compartilhado na transação de conclusão |
| Estoque | `StockBalance` | Serviço e porta de inventário; movimentos e estornos |
| Métricas | Consultas de leitura | Projeção mensal sobre execuções e respectivos lançamentos |

Os módulos existentes de equipamentos e procedimentos continuam responsáveis por cadastro, componentes, compatibilidade e materiais previstos. Controllers antigos da agenda e estoque delegam os novos casos de uso; as consultas legadas não foram todas refatoradas nesta entrega.

## Consistência

- Agenda interna e pública usam a mesma reserva transacional. Seleção manual também exige profissional ativo, habilitação, jornada e intervalo livre.
- Procedimento que exige equipamento reserva um aparelho ativo e compatível, sem sobreposição. Reservas antigas sem aparelho explícito bloqueiam conservadoramente os aparelhos compatíveis daquele procedimento; revisar essas reservas é importante.
- Reservas externas podem exigir confirmação ou ser confirmadas automaticamente. Reservas provisórias expiram pelo menor prazo entre configuração e início reservado. Após expirar, deixam de ocupar horário e não podem ser confirmadas. Permanecem visíveis como históricas; não há job apagando registros.
- Retirar habilitação não cancela reservas silenciosamente. A página do profissional aponta reservas futuras afetadas; a administradora pode reatribuir na agenda, com nova validação.
- Conclusão da agenda pelo antigo `status=COMPLETED` foi bloqueada. A conclusão ocorre pelo atendimento, com confirmação dos materiais e disparos.
- Atendimento concluído não é reaberto nem sobrescrito. Um atendimento iniciado por engano pode ser cancelado com motivo, cancelando também sua reserva e preservando o registro. Não há baixa de materiais para desfazer.
- Cada execução preserva identidade e nomes do procedimento, opção e materiais. O profissional executor pertence à execução; o atendimento também guarda quem o iniciou, concluiu ou cancelou.
- HIFU exige aparelho com contagem por componente. Todo consumo exige contador correto, componente do aparelho informado e estado operacional ativo. Lasers não podem executar com contagem `NONE`.
- Contador inicial é explícito, inclusive zero. Não presumimos que um equipamento antigo começou sem uso. Componentes não inicializados aparecem como não inicializados, com saldo desconhecido.
- Consumo não ultrapassa capacidade conhecida nem produz total negativo. Depois de haver lançamentos, o modo de contagem do aparelho não pode ser trocado. Capacidade não pode ser removida ou reduzida abaixo do consumo registrado.
- Correção de disparos de uma execução gera estorno e lançamento substituto na mesma transação, ambos vinculados ao histórico da execução. Ajustes gerais não são atribuídos arbitrariamente a um procedimento.
- Estoque usa a precisão do `DECIMAL(12,3)`, sem aritmética imprecisa de saldo em ponto flutuante. Movimento sem saldo é rejeitado.
- Conclusão, execuções, respostas de materiais, disparos e status da reserva são gravados juntos. Falha reverte a transação. Uso de materiais não cria `StockMovement`.
- Chaves de idempotência protegem conclusão e movimentos contra repetição; mesma chave com conteúdo diferente gera conflito.
- Transações relevantes usam `READ COMMITTED` com locks explícitos. A ordem compartilhada é profissionais por ID, procedimentos por ID, reserva/atendimento, equipamentos por ID e materiais por ID. Isto evita validar habilitação ou disponibilidade a partir de um snapshot anterior à espera pelo lock.
- Chaves estrangeiras dos registros imutáveis restringem alterações em cascata de identificadores. Triggers SQL impedem `UPDATE` e `DELETE` de movimentos de estoque/disparos, execuções, respostas de materiais e auditoria de habilitações. Correções são novos registros. Usuário de aplicação não deve ter privilégios de DDL para remover essas proteções.

## Telas e APIs

- Profissionais: procedimentos habilitados, prioridade, períodos semanais e aviso de reservas afetadas.
- Agenda: regras de atribuição/confirmação, duração reservada, profissionais elegíveis, reatribuição e painel de atendimento.
- Atendimento: iniciar, confirmar cada material, informar opção/aparelho/disparos e concluir; cancelamento justificado antes de concluir.
- Equipamentos: contadores e cartuchos, inicialização, ajustes, histórico, estornos e correção de consumo.
- Estoque: entrada, embalagem consumida, ajuste e histórico. Estorno justificado no histórico.
- Dashboard: execuções e disparos por procedimento, comparação com mês anterior, áreas/opções realizadas e frequência das respostas de materiais.

Rotas novas principais:

```text
GET/PUT /api/v1/professionals/:id/capabilities
GET/PUT /api/v1/scheduling/settings
GET     /api/v1/scheduling/available-professionals
PATCH   /api/v1/scheduling/appointments/:id/confirmation
PATCH   /api/v1/scheduling/appointments/:id/assignment
POST    /api/v1/agenda/:id/attendance
GET     /api/v1/attendances/:id
POST    /api/v1/attendances/:id/completion
POST    /api/v1/attendances/:id/cancellation
GET     /api/v1/equipment/:id/shot-counters
GET/POST /api/v1/equipment/:id/shot-ledger
POST    /api/v1/shot-ledger/:id/reversal
POST    /api/v1/shot-ledger/:id/correction
POST    /api/v1/stock/movements/:id/reversal
GET     /api/v1/procedure-metrics?month=YYYY-MM
```

A reserva pública mantém as rotas anteriores e aceita `procedureId` opcional. Sem ele, usa a avaliação gratuita já configurada no catálogo. A consulta pública oferece intervalos de 30 minutos dentro das jornadas cadastradas, sem limite fixo de 9h–17h. O horizonte continua sendo 30 dias. Cadastro de cliente e reserva são gravados na mesma transação. A política pública não aceita profissional, duração ou status arbitrários enviados pelo cliente.

Configuração de habilitações/políticas e correções de ledger exigem administrador. Funcionários só agendam, confirmam e executam para si próprios. Distribuição equilibrada e novas permissões de gerenciamento ficam para uma próxima entrega.

## Comercial e métricas

Execuções e opções têm IDs persistentes; o comercial poderá vincular sessões vendidas às execuções sem controlar equipamentos ou estoque. Esta entrega não altera vendas/pacotes/pagamentos.

As métricas operacionais usam atendimentos concluídos pelo novo fluxo e data de conclusão, no calendário de São Paulo. Histórico legado de agendamentos concluídos não é convertido em execução fictícia. Correções de disparos vinculadas à execução recompõem seu período original. A classificação de material indica frequência por execução, sem custo ou quantidade física presumida. Nomes nas execuções são históricos; rótulos de procedimentos/opções no dashboard usam o catálogo atual.

A interface inicial de atendimento registra o procedimento agendado; a API e o modelo aceitam múltiplas execuções e responsáveis. Uma interface mais ampla de composição de atendimento pode ser acrescentada sem mudar o ledger. Custos por sessão, margem, vendas de combos e conciliação comercial continuam para as próximas etapas.

## Migration e preparação

Nova migration: `20261106000000_clinical_execution_ledgers`.

- Não habilita todos os profissionais, não inventa jornadas, prioridade ou contadores e não altera saldos antigos.
- `StockMovement.actorId` e a chave de idempotência são opcionais no schema para preservar movimentos históricos cuja autoria é desconhecida; os novos movimentos registram autoria.
- A antiga quantidade de `ProcedureMaterial` é preservada por compatibilidade. Não gera baixa e não representa consumo real; a tela passa a configurar os materiais cuja utilização deve ser confirmada.
- Antes de usar a agenda: configurar habilitações e jornada, definir prioridades/regras, revisar recursos dos procedimentos e inicializar contadores reais.
- SQL validado desde base vazia em MySQL 8.4.13 isolado, incluindo todas as quatro migrations, triggers, estornos e duas conexões concorrendo pelo mesmo saldo. Nenhum banco da clínica ou dev do usuário foi acessado.
- O teste local usa SQL diretamente: `npm run test:mysql:clinical --prefix backend`. Requer Docker e cria/remove apenas seu próprio container sem rede ou portas publicadas, com dados sintéticos. Não usa credenciais da clínica.
- O download dos engines Prisma continua recebendo HTTP 403 neste ambiente. O client foi gerado sem engine para compilar; aplicação pelo Prisma Migrate e funcionamento com o banco dev do usuário precisam ser validados no ambiente local. Não foi executado seed real nem `db push`.

## Atualização — Fase 7

A opção de distribuição equilibrada já está implementada; o critério escolhido é carga em minutos reservados no dia, com rodízio nos empates. Ver `distribuicao-equilibrada-fase-7.md`. A decisão anterior de mantê-la como próxima etapa está preservada acima como histórico.
