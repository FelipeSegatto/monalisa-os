# Organização dos domínios

A refatoração parte do merge de integração `93d128b` e fica na branch `refactor/domain-ownership`. Não altera o schema, migrations, dados ou contratos HTTP.

## Redistribuição

| Origem | Responsabilidade atual |
| --- | --- |
| `domain/appointment-policy.ts` | `scheduling/domain/appointment-policy.ts`: intervalos, sobreposição e transições |
| `domain/sale-policy.ts` | `commercial/domain/sale-policy.ts`: cálculo e validação compatíveis com vendas anteriores |
| `modules/agenda.controller.ts` | `scheduling/presentation/agenda.controller.ts` |
| `modules/scheduling.service.ts` | `scheduling/infrastructure/prisma-agenda-availability.ts`: locks e consultas de conflito |
| `modules/stock.controller.ts` | `inventory/presentation/stock.controller.ts` |
| `modules/finance.controller.ts` | `finance/presentation/finance.controller.ts` |
| `modules/dashboard.controller.ts` | `dashboard-metrics/presentation/dashboard.controller.ts` |
| `modules/leads-booking.controller.ts` | Leads em `leads/presentation`; reserva pública em `scheduling/presentation` |
| `modules/uploads.controller.ts` | Documentos/fotos em `customers/presentation`; imagens em `procedures/presentation`; armazenamento e leitura técnica em `shared` |

## Composição

- Cada módulo Nest registra seus próprios controllers e providers.
- `AppModule` importa os módulos e registra o filtro global.
- `SchedulingModule` usa `CommercialModule` para os direitos de sessões, sem duplicar providers.
- `FinanceModule` compõe `CommercialModule` e `FinanceReadModule`.
- Clientes e procedimentos importam o mesmo `MediaModule`. Ele exporta `FileStorage`; não conhece regras clínicas nem associações de documentos.
- `PrismaModule` continua oferecendo uma única identidade de provider para os consumidores.
- Os prefixos e métodos HTTP, decorators de autorização, assinatura de arquivo, limite de upload e cache privado permanecem equivalentes.

## Limite desta etapa

A mudança resolve a propriedade dos arquivos e separa controllers que misturavam domínios. Algumas rotas anteriores ainda consultam Prisma diretamente. Extrair todos os seus casos de uso, consultas e portas é uma etapa adicional; não foi escondida em uma mudança estrutural para evitar alterações de comportamento e acoplamentos novos.

`PrismaAgendaAvailability` ficou na infraestrutura porque recebe a transação Prisma e executa locks, em vez de permanecer como um serviço de aplicação genérico. As regras puras continuam no domínio de agendamento. As funções financeiras compatíveis com vendas antigas foram preservadas; não se unificaram cálculos com semânticas diferentes durante a movimentação.

## Verificação

Rodar `npm run verify` na raiz. Os contratos executam contra TypeScript e contra JavaScript compilado, verificando a composição real do Nest com persistência simulada. A cobertura de mídia também exercita multipart, assinatura, permissões e leitura autenticada de um arquivo sintético, removido no fim do teste.

Verificação desta entrega: `npm run verify` passou com 6 testes de scripts, 166 testes backend e 23 contratos compilados. A comparação das declarações de rotas antes/depois confirmou os mesmos 36 pares de método e caminho redistribuídos entre os módulos.
