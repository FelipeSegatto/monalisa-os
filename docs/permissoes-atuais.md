# Matriz de acesso — comportamento atual, não nova política de negócio

Esta matriz caracteriza o código existente para proteger a refatoração. Não amplia nem restringe permissões nesta fase. `SessionGuard` exige sessão por padrão; `@Public` libera rotas indicadas e `@Admin` restringe operações administrativas. Filtros por profissional são regras adicionais dos controllers.

| Operação | Público | ADMIN | FUNCIONARIO | Observação atual |
|---|---|---|---|---|
| Login | Sim | Sim | Sim | Rate limit local em memória |
| Logout / me | Não | Sim | Sim | Sessão obrigatória |
| Catálogo / imagem de procedimento | Sim | Sim | Sim | Imagens públicas são exceção explícita no guard |
| Lead público / slots / avaliação | Sim | Sim | Sim | Avaliação tem regras fixas atuais |
| Clientes / notas / anexos privados | Não | Sim | Sim | Sem escopo por profissional; política clínica a confirmar |
| Profissionais (consulta) | Não | Sim | Sim | Sidebar não determina a autorização da API |
| Profissionais e suas contas (escrita) | Não | Sim | Não | @Admin |
| Procedimentos / materiais (consulta) | Não | Sim | Sim | @Admin nas escritas |
| Equipamentos (consulta) | Não | Sim | Sim | Todas as escritas @Admin |
| Estoque (consulta) | Não | Sim | Sim | Escritas @Admin, apesar de item escondido na sidebar do funcionário |
| Agenda diária / bloqueios (consulta) | Não | Sim | Sim | Filtro próprio quando funcionário tem professionalId |
| Agenda semanal/mensal | Não | Sim | Sim | Contagens atuais não aplicam o mesmo filtro da diária |
| Criar agendamento | Não | Sim | Sim | Profissional do payload; regra de delegação ainda pendente |
| Alterar status / excluir bloqueio | Não | Sim | Limitado | Verificações próprias por profissional; algumas recusas retornam 400 |
| Vendas / recebimentos | Não | Sim | Limitado | Escopo por profissional; criação força vínculo do funcionário |
| Cancelar venda / escrever despesas | Não | Sim | Não | @Admin |
| Consultar despesas | Não | Sim | Lista vazia | Detalhe de despesa é @Admin |
| Leads internos | Não | Sim | Sim | Sidebar oculta para funcionário, mas API não exige ADMIN |
| Dashboard | Não | Sim | Sim | Projeções diferentes por papel |

Decisões pendentes para a próxima fase: acesso aos dados clínicos, delegação na agenda, funcionários sem vínculo profissional e alinhamento entre resumos/consultas. Não transformar divergências em novas proibições sem decisão da clínica.

Testes HTTP em `backend/test/contracts/` usam controllers/guard reais com persistência simulada; não comprovam isolamento de dados ou concorrência em MySQL real.

## Fase 2

A política da tabela foi preservada. AuthModule fornece o guard global e a autenticação passa por services/repositories. Erros são tratados pelo ApiExceptionFilter global. Testes HTTP caracterizam acesso e ausência de escalada de papel pelo body; detalhes em [autenticacao-fase-2.md](autenticacao-fase-2.md).
