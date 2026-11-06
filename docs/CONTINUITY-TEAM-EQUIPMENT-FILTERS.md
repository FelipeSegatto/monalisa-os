# Continuidade: equipe, equipamentos e filtros

Base: `expense-attribution-continuation` em `3c00759`. Nenhuma migration nova nesta entrega.

## Equipe

O arquivamento reutiliza `Professional.active`: não cria um segundo estado em User. Desativa a disponibilidade, bloqueia autenticação e encerra sessões em transação. A emissão de sessão revalida a situação com lock; sessões existentes também verificam o profissional. Restaurar não recupera sessões apagadas. Trocar credenciais não libera conta arquivada. Contas ADMIN vinculadas não podem ser arquivadas pela gestão de funcionários.

A lista distingue ativos/arquivados e o detalhe oferece arquivar/restaurar. Histórico e agendamentos existentes são preservados; a interface pede revisão da agenda. Habilitações usam checkboxes em tom terroso com foco por teclado e suporte a alto contraste.

## Equipamentos

Lista com o padrão visual das demais páginas, filtros e datas de manutenção. O detalhe reaproveita os casos de uso auditáveis de cadastro, manutenção realizada/programada e retirada. O botão “Arquivar aparelho” usa RETIRED, que é **definitivo** segundo o domínio existente; a interface informa isso antes da confirmação. Não há exclusão física.

Histórico de disparos mostra autoria, componente, execução/procedimento/variação e referências de estorno/correção. Autoria retorna somente ID e nome, nunca credenciais. A consulta inclui a referência de estorno mesmo quando ele está em outra página. A paginação usa cursor e detecta fim da lista.

Seletores recebem a paleta neutra; navegadores com `appearance: base-select` permitem estilizar o popup e hover. Nos demais, o seletor mantém o comportamento nativo do navegador/SO; não foi introduzido um listbox JavaScript paralelo.

## Filtros financeiros

- Comercial → Vendas: busca global, categoria do procedimento, status e intervalo inclusivo de datas da venda em São Paulo.
- Financeiro → Despesas: busca, categoria, status, destinação e intervalo inclusivo de vencimentos. Links com procedureId continuam filtrando a revisão atual.
- Financeiro → visão geral: filtros nas listas de vendas/despesas, preservando os indicadores do período. A leitura antiga de despesas não trunca mais em 200 registros antes de filtrar.
- Pendências: tipo a receber/a pagar, busca, categoria de despesa quando se escolhe a pagar e intervalo próprio. Não há seletor redundante de status. Datas significam data da venda para a receber e vencimento para a pagar, explicado na tela. Sem intervalo próprio, todas as pendências permanecem visíveis.

Vendas e despesas dedicadas filtram no banco **antes** da paginação. O status comercial considera pagamentos não estornados e vendas gratuitas. A destinação de despesas usa a versão indicada por allocationRevision, evitando correspondência com revisões históricas. SQL utiliza parâmetros Prisma, inclusive na busca por texto.

Os filtros validam datas reais, ordem do intervalo, IDs, categorias e status. As listagens têm “Limpar filtros”, estados vazios e paginação que conserva os critérios. Filtros das listas não alteram os indicadores financeiros.

## Validação

- `npm run verify`: typecheck, builds, 6 testes dos scripts, 160 testes backend e 21 contratos compilados passaram.
- `npm run test:mysql:listings --prefix backend`: migrations existentes aplicadas exclusivamente em MySQL 8.4 descartável, sem rede. Testa status após estorno, venda gratuita, competência temporal da consulta, busca literal, escopo de funcionário, filtros da revisão atual, categoria além de 60 vendas recentes não correspondentes e SQL do lock de sessão com profissional inativo. O container é removido ao terminar.
- Navegador Chromium com API simulada: manutenção/arquivamento, histórico, arquivamento/restauração de profissional, filtros, datas inválidas, limpeza e paginação. Checkboxes verificados por mouse e teclado. Hover de seletor verificado na paleta neutra.
- Layout do dashboard verificado com dados sintéticos: procedimentos em largura total; despesas/clientes abaixo em duas colunas iguais. O nome de Top procedimentos usa o procedimento, conforme correção recebida do Claude.
- Banco local da clínica e contas reais não foram acessados nem alterados. Validação visual não substitui teste com os dados locais.

## Trabalho paralelo e pendências

Claude está encarregado da conta Bianca (`bianca.demo@clinica.local`, ADMIN) e da modelagem/migration/seed de validade dos insumos. Preserve os commits dele ao integrar; não crie outra migration de situação para profissionais sem necessidade.

A visão detalhada de métricas por procedimento/área continua como próxima entrega. Não foi implementada nesta rodada. A central completa de pendências, documentos versionados e integração externa de agendamentos continuam no planejamento, conforme estado real do repositório.
