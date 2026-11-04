# Inventário inicial de telas e integração

## Principais rotas visíveis em `frontend/src/App.tsx`

- `/catalogo`: catálogo público e modal de agendamento.
- `/login`: autenticação administrativa.
- `/dashboard`: indicadores internos.
- `/agenda`: calendário dos atendimentos.
- `/clientes`, `/clientes/novo`, `/clientes/:id`: cadastro e perfis.
- `/procedimentos`, `/procedimentos/novo`, `/procedimentos/:id`: serviços.
- `/profissionais`, `/profissionais/novo`, `/profissionais/:id`: equipe.
- `/financeiro`: **registro interno**, sem checkout no site.
- `/estoque`: materiais e movimentações.
- `/leads`: contatos.

## Fontes de verdade

- `frontend/src/App.tsx`: rotas visuais.
- `frontend/src/lib/api.ts`: formas atuais das respostas e chamadas HTTP.
- `frontend/src/pages/`: telas e hooks que consomem a API.
- `frontend/src/config/clinic.ts`: informações públicas para a clínica/WhatsApp.

## Exercício da primeira aula

Para cada tela responda: (1) quais dados precisa? (2) quem pode ver? (3) quais operações modifica? (4) quais validações e erros? (5) como testar?

A API agora possui **somente dois endpoints iniciais**: GET /health e GET /api/v1/info. O backend de login, clientes, agendamento e demais módulos ainda não foi implementado. Não confundir interface existente com funcionalidades de negócio integradas.
