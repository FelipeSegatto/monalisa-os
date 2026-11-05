# Distribuição equilibrada — configuração da agenda

O administrador escolhe **Agenda → Regras da agenda → Atribuição de profissional → Distribuição equilibrada**. As opções prioridade e escolha manual continuam disponíveis. Trocar a política não reatribui agendamentos existentes. Funcionários não podem alterar essa configuração.

## Critério

1. Primeiro separam-se profissionais ativos, habilitados e com jornada, horário e recursos disponíveis.
2. No modo equilibrado, não é necessário ter número de prioridade. A prioridade cadastrada não interfere na classificação.
3. Prefere-se quem tem menos **minutos de agendamentos reservados no dia do horário solicitado**, usando o calendário de São Paulo e todos os procedimentos daquele profissional.
4. Contam agendamentos aguardando confirmação ainda válidos, confirmados e concluídos. Não contam cancelamentos, não comparecimentos nem reservas provisórias expiradas. Intervalos que atravessam a meia-noite são limitados à parte dentro desse dia.
5. Bloqueios de agenda eliminam horários indisponíveis, mas não são tratados como minutos de atendimento realizado/reservado.
6. Empates seguem rodízio por IDs estáveis dos candidatos, começando após o último profissional escolhido automaticamente pelo modo equilibrado. O marcador é por instalação da agenda, não por procedimento ou dia. Ele permanece ao alternar políticas.
7. Seleção explícita continua sendo manual, respeita as mesmas validações e não avança o rodízio.
8. A reatribuição automática usa o mesmo critério, excluindo a própria reserva do cálculo de carga. Não ocorre reatribuição em massa.

A política distribui carga reservada, não garante o mesmo número de atendimentos: procedimentos têm durações diferentes e nem todos os profissionais podem executar todos os procedimentos. A consulta pública de horários também considera profissionais sem prioridade numérica quando esse modo estiver selecionado.

## Implementação e consistência

`BalancedAssignmentPolicy` implementa a porta de domínio já usada pelas outras estratégias. O adapter Prisma calcula a carga dentro da transação, após os locks dos profissionais, e bloqueia também a linha das configurações para serializar o desempate. O marcador só é atualizado junto com a reserva/reatribuição bem-sucedida; falhas revertem a operação. A gravação de configurações não permite que o cliente envie um marcador arbitrário.

A seleção do administrador fica persistida em `SchedulingSettings.assignmentPolicy`. A migration `20261108000000_balanced_assignment` permite `BALANCED` no CHECK existente e adiciona o marcador interno opcional. Não altera a política já configurada nem o padrão `PRIORITY`.

## Validação

Testes de domínio, repository e HTTP cobrem carga por minutos, rodízio, profissionais sem prioridade, habilitação/disponibilidade, seleção manual, exclusão de cancelamentos/expirações/outros dias, meia-noite de São Paulo, reatribuição e proteção administrativa. O teste SQL isolado aplica as seis migrations e verifica a configuração, duas conexões disputando o marcador e rollback.

O banco local do usuário não foi acessado. Aplicar a migration pendente, regenerar o Prisma Client e então selecionar o modo no navegador. A aplicação por Prisma Migrate continua sendo validada no ambiente local, pois o download dos engines permanece bloqueado neste ambiente.
