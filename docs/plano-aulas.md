# Plano didático — Curso Agenda Clínica NestJS

Este plano foi elaborado para ensinar a reconstruir o backend do ZERO, após o aluno explorar a aplicação completa, sem mexer no frontend.

1. Ambiente Node, TS, npm, Nest CLI, Docker, MySQL 8.4 e Prisma; comandos e papel de cada ferramenta.
2. Estrutura NestJS: Module, Controller, Provider/Service, Decorators, DI, interface e token.
3. Modelagem relacional: 20 tabelas Prisma, constraints, enums, índices, migrations, dados de teste.
4. Autenticação: hash scrypt com salt, cookie HttpOnly, sessão armazenada por hash, guards, roles e fluxos de segurança.
5. Clientes: validação Zod, persistência Prisma, CRUD, filtros, relacionamentos e tratamento de erros.
6. Profissionais: CRUD, acesso de funcionários, bloqueios de agenda e relações 1:1 / 1:N.
7. Procedimentos: categorias, variações de preço, upload, materiais de consumo.
8. Agenda: datas UTC/local, cálculo de intervalo, conflito, locks `FOR UPDATE`, transações e concorrência.
9. Catálogo público, leads e reserva gratuita sem autenticação; diferença entre rota pública e protegida.
10. Financeiro: modelos de venda, itens, descontos, pagamento interno, despesas e relatórios.
11. Estoque: movimentação, ajuste, nível mínimo, consumo na conclusão do atendimento, atomicidade.
12. Documentos e fotos: armazenamento, validação de conteúdo, controle de acesso e privacidade.
13. Dashboard: agregações, filtros, indicadores, diferenças de permissões.
14. POO/SOLID com exemplos reais: responsabilidades, extensibilidade, substituição, contratos, DI e testes.
15. Testes: unitários de regra pura, integração HTTP, concorrência, autenticação e autorização.
16. Deploy seguro: ambientes, secrets, migrations, backups, TLS, logs e LGPD.

**Atenção:** o frontend é deliberadamente congelado. As aulas focam em entender profundamente cada responsabilidade do backend, incluindo decisões que poderiam ser melhoradas em uma evolução posterior.
