# Fase 3 — clientes, profissionais e contas

## Organização

`src/customers` e `src/professionals` têm domínio, aplicação, infraestrutura e apresentação próprios. AppModule importa CustomersModule e ProfessionalsModule; o controller antigo de clientes foi removido e CatalogController deixa de conter profissionais e contas. Procedimentos continuam no catálogo até a fase própria.

- Customer protege o perfil e cria notas para uma identidade persistida.
- CustomerNote mantém cliente e autoria, validando título/conteúdo nas revisões.
- BirthDate representa uma data civil. DATE do MySQL é lido por seu dia UTC, sem aplicar UTC−03. Não impõe idade mínima ou proibição de nascimento futuro: essa política não foi definida. O intervalo técnico de DATE começa no ano 1000.
- Professional valida cadastro e permite ativar/desativar. Isso não exclui agenda, vendas ou conta.
- ContactEmail é objeto de valor compartilhado: valida endereço e limite 190, preservando casing nos contatos. Email de login é normalizado separadamente.
- Services coordenam entidades e portas; repositories Prisma persistem; consultas preservam as projeções existentes.

## Comportamento preservado e correções

Rotas, status de sucesso, envelopes e campos do frontend foram preservados. Clientes continuam acessíveis por sessão; profissionais são consultáveis por sessão e editáveis por ADMIN. Notas continuam editáveis/excluíveis por usuários autenticados, sem nova política de autoria/posse. Autor original vem da sessão e não é substituído pela revisão. A nota é consultada/alterada/excluída sempre pelo par (cliente, nota).

Nascimento deixa de aparecer com um dia a menos ao ler um DATE à meia-noite UTC. Não houve UPDATE de datas existentes: datas já incorretas no banco por intervenção manual precisam de conferência, não de correção em massa presumida. Datas inexistentes e filtros de origem inválidos retornam 400. Limites de nome, telefone, email e cor foram alinhados às colunas reais.

Listagem mantém nome/ordenação, filtro de aquisição e janela atual de 60 agendamentos por cliente. Histórico completo permanece no detalhe. Critérios atuais de último/próximo agendamento e contagens mensais dos profissionais foram mantidos; sua semântica será revista na fase de agenda/métricas.

Não há exclusão de clientes/profissionais nesta API. Inativar profissional não desabilita automaticamente login; nome do login não é sincronizado silenciosamente quando o cadastro profissional muda. São decisões de negócio pendentes, preservadas nesta refatoração.

## Colaboração com autenticação

ProfessionalService usa a porta ProfessionalAccounts. O adaptador chama EmployeeAccountService do AuthModule; código de profissionais não escreve diretamente em User/Session. Auth fornece hash assíncrono e EmployeeCredentials, mantendo o mínimo anterior de dez caracteres para conta profissional (bootstrap administrativo segue sua regra própria).

A criação/troca de credenciais bloqueia a identidade profissional e, na mesma transação, atualiza o usuário existente e revoga suas sessões. Novo usuário recebe FUNCIONARIO; papel de conta existente não é alterado. Email duplicado reverte a operação e retorna 409. Senha/hash não entram na resposta.

Para proteger login simultâneo a essa troca, a emissão após verificação de senha bloqueia User e confere se o hash verificado ainda é atual antes de inserir Session. Se mudou, não emite sessão. Se o login terminou primeiro, a revogação posterior remove a sessão criada. Bloqueios/garantias devem ser confirmados também com concorrência em MySQL real; testes desta entrega usam persistência simulada.

## Banco, validação e limites

Nenhum model, campo, índice ou migration foi alterado. As novas classes mapeiam Customer (tabela customers), CustomerNote, Professional, User e Session existentes.

Testes em `test/customers`, `test/professionals` e contratos HTTP cobrem invariantes, datas, perfil, notas, vinculação, contas e rollback simulado. Os contratos são repetidos sobre dist. Não foi executada migration, seed ou consulta ao banco da clínica. O roteiro de validação local está em [roteiro-migrations-claude.md](roteiro-migrations-claude.md).

Frontend preservado. A ausência anterior de credentials:include na exclusão de notas cross-origin permanece uma pendência do cliente HTTP, não foi contornada relaxando autenticação no backend.
