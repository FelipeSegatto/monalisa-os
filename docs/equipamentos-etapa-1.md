# Equipamentos — etapa 1

## Escopo e arquitetura

`Equipment` é a raiz do agregado. Seus componentes têm identidade própria, pertencem a um aparelho e não podem ser transferidos. Não há instalação, posição ou reserva de equipamento nesta etapa. As relações com procedimentos são opcionais e muitos-para-muitos. Insumos continuam em `ProcedureMaterial`.

O controller adapta HTTP/valida Zod, `EquipmentService` coordena os casos de uso e acessa o Prisma (como o serviço de agendamento existente); regras puras de calendário e lembretes ficam em `domain/equipment-policy.ts`. O AppModule registra controller/service sem refatorar os domínios antigos. A extração de persistência específica pode ocorrer conforme os casos de uso crescerem; não foi criado repositório genérico.

Não há registro de disparos, saldo calculado, manutenção automática de cartuchos, faturamento ou alocação na agenda. `shotTracking` apenas declara onde o futuro contador será vinculado: nenhum/aparelho/componente. `nominalCapacity` é capacidade de referência, nunca saldo. O ledger será implementado junto do registro de uso nos atendimentos.

## Regras

- Códigos gerados no servidor, únicos no banco, sem alteração por endpoint.
- Série, fabricante, modelo, capacidade e datas desconhecidas permanecem nulos. Não se presume saldo inicial zero.
- `ACTIVE`, `MAINTENANCE`, `RETIRED`: aposentadoria definitiva nesta etapa. Não há endpoints de exclusão. A aposentadoria do aparelho torna todos seus componentes indisponíveis para uso futuro, independentemente de seu status individual; não altera seus históricos.
- Editar o aparelho, componente, situação e manutenção usa transação e bloqueio `FOR UPDATE` no aparelho, sempre antes de escrever. Isso serializa operações concorrentes do agregado. Um componente não pode ser editado por uma rota de outro equipamento.
- Escritas são exclusivas de ADMIN; consultas exigem sessão. Autor vem da sessão. Status/manutenção exigem justificativa. Eventos são incluídos atomicamente com a alteração, sem endpoints de edição/exclusão. Não é proteção contra administrador SQL; permissões de banco para auditoria devem ser tratadas no deploy.
- Próxima manutenção é sugerida por meses de calendário, ajustando fins de mês e anos bissextos. Intervalo inicial 12 meses (1–120). Manutenção realizada não pode estar no futuro nem retroceder/sobrepor a última data registrada. Próxima data deve ser posterior à última realização.
- Alterar intervalo não muda uma data programada silenciosamente. Reprogramar exige justificativa; pode registrar data vencida para não ocultar atraso conhecido. Realização não muda automaticamente a situação operacional do aparelho.
- Lembretes por data civil da clínica (UTC−03, padrão já usado no sistema): atrasada se anterior a hoje, próxima entre hoje e +30 dias, sem data se desconhecida. Aposentados não geram lembrete. São avisos internos no dashboard, sem email/WhatsApp/job agendado.
- Compatibilidades são desativadas, não apagadas. Alterações bloqueiam procedimento e aparelhos afetados em ordem estável. Recursos aposentados não podem ser adicionados/mantidos numa nova revisão; vínculos anteriores continuam visíveis até revisão. Não é exclusão retroativa do histórico.
- Configuração de equipamentos revisada e vazia significa “não utiliza”; revisão nula significa “não conferido”. Autor e data da última revisão são preservados no procedimento. Materiais têm revisão independente, marcada quando seu cadastro é salvo.

## Banco: aplicação deliberadamente separada

O repositório original não possui histórico de migrations. `backend/prisma/changes/20261104_equipment.sql` é uma alteração SQL aditiva revisável para o schema anterior, **não executada automaticamente**, não uma baseline de produção validada. Não rode `db push` no banco da clínica para aplicar esta entrega.

Antes de aplicar em dados reais:
1. Backup e conferência de `prisma migrate status`, schema real e migrations eventualmente existentes fora deste repositório.
2. Estabelecer a baseline do schema anterior conforme a documentação de baselining do Prisma; para banco existente, marcar somente a baseline correspondente como aplicada. Não marcar esta mudança nova como aplicada antes de executá-la.
3. Gerar/verificar o diff com Prisma e incorporar esta mudança ao histórico correto; preservar os CHECKs MySQL de intervalo, ordem de datas e capacidade positiva.
4. Executar a migration em uma cópia MySQL 8.4. Conferir preservação de cadastros e ausência inicial de equipamentos fictícios, e só depois promover.
5. Executar `npm run db:generate` e reiniciar a API.

Em banco descartável novo para desenvolvimento, o fluxo original `db:push` cria a estrutura do schema, mas não adiciona os CHECKs definidos no SQL. Isso não substitui a migração revisada de produção.

## Seed sem sobrescrita

O seed geral existente permanece intacto. `equipment.example.json` é um EXEMPLO baseado nos quatro nomes discutidos; não comprova que existam essas unidades, componentes ou modos de contagem na clínica. Não é executado pelo seed geral.

Copie para um arquivo próprio, revise nomes/códigos/configuração de disparos e remova qualquer aparelho não confirmado. Componentes são opcionais; exemplo:

```json
{"equipment":[{"code":"EQ-004","name":"Ultramed Hifu","shotTracking":"COMPONENT","components":[{"code":"COMP-001","name":"Cartucho identificado pela clínica","nominalCapacity":null}]}]}
```

Após configurar o banco e ADMIN_EMAIL de um administrador existente, execute em `backend`:

```sh
npm run db:seed:equipment -- prisma/equipment-confirmado.json --confirm
```

Identificação do seed é por código estável. Executar novamente não atualiza dados, situação, datas ou eventos existentes. Um componente com código já vinculado a outro aparelho rejeita a transação inteira. O seed não registra capacidade restante, consumo ou manutenções presumidas. Não inclua arquivos com dados privados no repositório público.

## Contrato HTTP

Todas as rotas abaixo têm prefixo `/api/v1`; erros seguem o contrato existente `{error,statusCode}`.

| Método / rota | Acesso | Uso |
|---|---|---|
| GET /equipment | Sessão | Listagem, componentes e estado da manutenção |
| GET /equipment/:id | Sessão | Detalhe, compatibilidades e 100 eventos recentes |
| GET /equipment/:id/events?before=ID | Sessão | Histórico paginado por ID decrescente |
| POST /equipment | ADMIN | Cadastro, código gerado e intervalo padrão 12 |
| PUT /equipment/:id | ADMIN | Dados do aparelho; datas/situação em rotas específicas |
| POST /equipment/:id/components | ADMIN | Criar componente no aparelho |
| PUT /equipment/:id/components/:componentId | ADMIN | Atualizar componente, sem transferência |
| PATCH /equipment/:id/status | ADMIN | `{status,reason}` |
| PATCH /equipment/:id/components/:componentId/status | ADMIN | `{status,reason}` |
| POST /equipment/:id/maintenance/schedule | ADMIN | `{nextDate,reason}` |
| POST /equipment/:id/maintenance | ADMIN | `{performedOn,nextDate?,reason}` |
| GET /procedures/:id/equipment | Sessão | Recursos e estado de revisão |
| PUT /procedures/:id/equipment | ADMIN | `{equipmentIds:[]}` marca revisão, inclusive vazia |

Datas são AAAA-MM-DD. Situação é ACTIVE/MAINTENANCE/RETIRED. As APIs de dados do aparelho/componente são de substituição dos campos editáveis; clientes devem enviar seu formulário completo (o frontend implementado faz isso). Serial/modelo/fabricante podem ser nulos. Eventos incluem detalhes anteriores/novos, autor e data de registro; manutenções também incluem data de realização.

## Validação e limites

Testes automatizados de calendário, lembretes, validação, autorização, serviços e seed em `backend/test/equipment.test.ts`. As fixtures de serviço verificam coordenação e rejeições; não substituem teste concorrente real em MySQL.

Antes de uso real, exercitar em banco descartável: duas atualizações concorrentes do mesmo aparelho, aposentadoria concorrente com criação de componente (sem escrita posterior à aposentadoria), compatibilidade concorrente com aposentadoria, execução repetida do seed, falha de evento com rollback, datas nas fronteiras e sessões ADMIN/FUNCIONARIO/ausente. Não foi executada uma migration no banco da clínica.
