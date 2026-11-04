# Agenda Clínica — contrato de integração do frontend imutável

O frontend, incluindo seus 98 arquivos sob `frontend/src`, foi copiado byte a byte da última Aula 03.
**Nenhum componente, CSS, hook, layout, asset ou tela foi modificado.** O único ponto de configuração é o arquivo local `.env` com a base da API. O aplicativo usa `fetch` com `credentials:'include'`; o backend mantém cookie de sessão.

## Endpoints

- Auth: `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/me`
- Admin: `GET /api/v1/dashboard`
- Profissionais: `GET/POST /api/v1/professionals`, `GET/PUT /api/v1/professionals/:id`, `GET/POST /api/v1/professionals/:id/account`
- Procedimentos: `GET /api/v1/procedure-categories`, `GET/POST /api/v1/procedures`, `GET/PUT /api/v1/procedures/:id`, `PATCH /api/v1/procedures/:id/active`, `POST /api/v1/procedures/:id/images`, `GET/PUT /api/v1/procedures/:id/materials`
- Clientes: `GET/POST /api/v1/customers`, `GET/PUT /api/v1/customers/:id`, `GET/POST /api/v1/customers/:id/notes`, `PUT/DELETE /api/v1/customers/:id/notes/:noteId`, `GET/POST /api/v1/customers/:id/documents`, `GET/POST /api/v1/customers/:id/photos`
- Agenda: `GET/POST /api/v1/agenda`, `GET /api/v1/agenda/week`, `GET /api/v1/agenda/month`, `PATCH /api/v1/agenda/:id/status`, `GET/POST /api/v1/agenda/blocks`, `DELETE /api/v1/agenda/blocks/:id`
- Financeiro interno (ADMIN): `GET /api/v1/finance/summary`, `GET /api/v1/finance/evolution`, `GET /api/v1/finance/composition`, `GET /api/v1/finance/pendencias`, `GET/POST /api/v1/finance/sales`, `GET /api/v1/finance/sales/:id`, `POST /api/v1/finance/sales/:id/payments`, `POST /api/v1/finance/sales/:id/cancel`, `GET /api/v1/customers/:id/sales`, `GET/POST /api/v1/finance/expenses`, `GET /api/v1/finance/expenses/:id`, `POST /api/v1/finance/expenses/:id/pay`
- Estoque: `GET/POST /api/v1/stock/items`, `GET/PUT /api/v1/stock/items/:id`, `POST /api/v1/stock/items/:id/movements`
- Público: `GET /api/v1/public/catalog`, `POST /api/v1/public/leads`, `GET /api/v1/public/booking/slots`, `POST /api/v1/public/booking/free`
- Leads internos: `GET /api/v1/leads`, `PATCH /api/v1/leads/:id/status`
- Anexos: `GET /uploads/procedure/:filename` aberto; `GET /uploads/document/:filename` e `/uploads/photo/:filename` exigem sessão.

## Restrições
- Autenticação por sessão; 7 dias; logout revoga sessão do banco.
- Financeiro, contas e configurações ficam restritos ao ADMIN.
- Campos financeiros são valores em reais com 2 casas; quantidades de estoque usam 3 casas.
- `startsAt/endsAt` seguem ISO UTC; o frontend envia `Date.toISOString()` para horários da clínica.
- A API aplica fuso da clínica `America/Maceio` (UTC-3) em chaves de calendário.
- Foto clínica e anamnese são dados sensíveis: proteger backups e acesso em produção.
