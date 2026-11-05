# Comercial — ofertas, contratos e direitos às sessões

## Entrega

O menu **Comercial** contém ofertas e vendas. As ofertas têm páginas de detalhe e versões publicadas. Vendas têm condições contratadas, descontos auditados, pagamentos, vencimentos, utilizações de sessões e histórico. Procedimentos mostram ofertas relacionadas; clientes mostram pacotes e saldos. A agenda pode reservar uma sessão adquirida, e o atendimento registra sua utilização na transação de conclusão.

Distribuição equilibrada, documentos e dashboard com novos insights continuam como entregas posteriores. A decisão de permitir escolher distribuição equilibrada em vez de prioridade permanece registrada em `operacao-clinica-fase-5.md`.

## Modelagem

- `CommercialOffer`: identidade permanente, nome atual, estado e autoria do cadastro. O agregado publica versões e controla alterações de estado.
- `CommercialOfferVersion` / `CommercialOfferItem`: nome, período de comercialização, composição, referências de preço, preço contratado da oferta, condições, prazo de utilização e autoria. Versões publicadas são imutáveis.
- `Sale` / `SaleItem`: contrato confirmado. Itens preservam procedimento, opção/área, descrição, sessões, referência, benefício promocional, desconto negociado alocado e valor líquido.
- `SaleOfferPurchase`: identifica qual versão da oferta originou o grupo de itens e quantos pacotes foram adquiridos.
- `SaleDiscount`: tipo, valor informado, base, valor efetivo, escopo, motivo, responsável e data. Condições promocionais e negociações adicionais são classificadas separadamente.
- `SessionEntitlement`: quantidade de sessões adquiridas para um procedimento e opção específicos, com validade contratada quando existir. Em combos, cada área tem seu próprio saldo.
- `SessionReservation`: compromisso de uma sessão com um agendamento; projeção com estados ativo, liberado e utilizado.
- `SessionRedemption`: utilizações e estornos imutáveis, vinculados à execução original. Estornar uma utilização devolve crédito sem apagar o atendimento clínico.
- `SalePayment` / `PaymentReversal`: recebimentos e estornos integrais preservando o pagamento original.
- `ReceivableInstallment` / `PaymentAllocation`: vencimentos combinados com a clínica e alocações de pagamentos. Não representam parcelas devidas pela operadora do cartão.
- `CommercialEvent`: auditoria de publicação, pausa/retomada, confirmação, recebimentos, estornos, cancelamentos e reservas/liberações de sessões.

Domínio em `backend/src/commercial/domain`; casos de uso/porta em `application`; adapters Prisma em `infrastructure`; validação HTTP e controllers em `presentation`. `Money`, `Discount`, `Payment`, `ReceivableSchedule`, `Sale`, `CommercialOffer` e `SessionEntitlement` concentram regras sem depender de NestJS ou Prisma.

## Regras importantes

1. Publicar nova versão não altera contratos anteriores. Versão futura não substitui a vigente antes da data inicial. Ao encerrar a versão que a substituiu, uma condição antiga não volta automaticamente a valer. Pausar a oferta impede novas vendas sem invalidar os pacotes vendidos.
2. Período de venda e prazo de utilização são distintos. O prazo de utilização é opcional, em dias de 24 horas após a contratação, preservado em cada direito. O fim da campanha não encerra direitos já adquiridos.
3. Preços de referência vêm do catálogo no momento da publicação/venda avulsa; a confirmação de uma oferta preserva as referências da versão vendida. IDs de área/opção são mantidos. Procedimentos e opções precisam estar ativos para novas contratações.
4. Valores são calculados em centavos; percentuais usam aritmética inteira. Distribuição proporcional usa maiores restos com desempate estável e fecha os centavos exatamente. O valor líquido alocado também alimenta as consultas financeiras existentes, evitando um novo rateio impreciso.
5. Exemplo: referência de R$ 1.000, oferta de R$ 850 e negociação adicional de R$ 50 resultam em R$ 800. Os R$ 150 promocionais são separados dos R$ 50 negociados. Negociações exigem motivo; autoria é determinada pela sessão autenticada.
6. Não há edição genérica de contratos confirmados. Cancelamento exige motivo, ausência de recebimentos líquidos, utilizações líquidas e reservas ativas. Pagamentos e utilizações são corrigidos por estorno, não por exclusão.
7. Saldo de sessões exige correspondência de cliente, procedimento e área, prazo válido, venda não cancelada e política de pagamento satisfeita. Funcionários podem vender/receber para seu próprio vínculo profissional; só administradores gerenciam ofertas, autorizam uso antes da quitação, cancelam e estornam.
8. A política padrão das novas vendas exige quitação para usar sessões. A administradora pode autorizar uso anterior explicitamente naquela contratação. Parcelamento com a clínica não concede essa autorização automaticamente.
9. Entrada e plano de recebíveis precisam fechar o total exato. Sem plano personalizado, o saldo restante recebe um vencimento inicial na data da contratação. Recebimentos posteriores são alocados aos vencimentos mais antigos. Estorno de uma entrada sem alocação recria o valor devido, sem editar o plano original.
10. Reserva de agenda não consome definitivamente uma sessão. Cancelamento, não comparecimento e expiração de reserva provisória deixam de comprometê-la. Conclusão converte o compromisso em utilização na mesma transação da execução, disparos e respostas de materiais.
11. Um agendamento reserva uma área/sessão. O painel atual conclui o procedimento agendado; o modelo/API de atendimento admite outras execuções com vínculos explícitos. Uma reserva existente não é cobrada automaticamente duas vezes se houver duas execuções do mesmo procedimento.
12. Agendamentos e atendimentos podem existir sem venda, por exemplo avaliação e orçamento. As regras clínicas continuam independentes do comercial: possuir sessões não concede habilitação ao profissional nem dispensa equipamento.
13. Operações financeiras e utilizações usam chaves de idempotência; repetir com conteúdo alterado gera conflito. Transações usam `READ COMMITTED` e locks de venda antes dos direitos às sessões, após os recursos clínicos quando aplicável.
14. Triggers SQL impedem alteração/exclusão de versões, composição, itens contratados, descontos, direitos, utilizações, recebimentos, estornos, vencimentos, alocações e eventos. Identificadores referenciados por esses registros não sofrem atualização em cascata.

## Histórico e métricas

Vendas antigas continuam identificadas como `LEGACY`. Não inferimos áreas descartadas pela implementação anterior, autoria de descontos, autorização de uso antes de quitar ou direitos de sessão inexistentes. Esses dados permanecem desconhecidos. As novas vendas usam `V1` e registram as informações explicitamente, inclusive quando iniciadas pela tela financeira anterior.

As fontes já permitem consultar vendas por oferta/versão, valores promocionais versus negociados, motivos e responsáveis por descontos, recebimentos, recebíveis, sessões vendidas/reservadas/utilizadas e saldos. Taxa de conversão de propostas exige registrar propostas/apresentações ao cliente; não é deduzida de vendas. Margem e custo por sessão não são inventados. O dashboard avançado virá depois.

## Validação e migration

Migration nova: `20261107000000_commercial_contracts`.

- Preserva saldos e vendas existentes; campos novos de histórico são opcionais para dados legados. Não executa seed ou backfill especulativo.
- SQL validado em MySQL 8.4.13 isolado desde base vazia com as cinco migrations, imutabilidade, estornos e duas conexões disputando a última sessão.
- Teste reproduzível: `npm run test:mysql:clinical --prefix backend`. Cria e remove somente seu próprio container Docker, sem rede ou portas publicadas, com dados sintéticos.
- Testes Nest/HTTP usam persistência simulada e também rodam sobre o código compilado. Casos de domínio e integração cobrem descontos/rateio, versões, parcelas, autorização, repetição, rollback e vínculo com atendimento.
- Fluxo no Chromium conferido com API simulada: publicar oferta/área, vender pacote, informar desconto/entrada/cartão/vencimento, receber saldo, liberar sessões e preservar a venda após publicar outra versão da oferta.
- Nenhum banco do usuário foi acessado. O download dos engines Prisma continua bloqueado neste ambiente; o client foi gerado sem engine para compilar. Prisma Migrate e a execução da aplicação com o banco dev devem ser conferidos no ambiente local antes de utilizar os novos fluxos.

A autenticação não foi alterada. O projeto não distribui senha padrão: o bootstrap usa `ADMIN_EMAIL` e `ADMIN_PASSWORD` configurados localmente e não redefine contas existentes.
