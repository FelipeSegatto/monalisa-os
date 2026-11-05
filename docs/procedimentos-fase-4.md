# Fase 4 — domínio de procedimentos

## Estrutura e escopo

`src/procedures` tem domínio, aplicação, infraestrutura, apresentação e ProceduresModule. Substitui o CatalogController legado; categorias, catálogo público, detalhes, ativação e materiais mantêm as rotas. Upload de imagens permanece no módulo legado, mas usa ProcedureService para devolver o mesmo DTO de detalhe.

Procedure é raiz do agregado. TreatmentOption tem identidade própria; MaterialRequirement é valor imutável de consumo previsto. Categorias permanecem um cadastro de referência existente, sem criar abstrações de escrita para um CRUD inexistente.

Atendimentos, ledger, ofertas e combos não foram implementados nesta entrega. O controle de uso físico e os disparos serão exigidos na etapa de atendimento; o endpoint legado de status de agendamento não foi convertido em atendimento por esta refatoração.

## Equipamento obrigatório

ProcedureTechnology identifica GENERAL, HIFU, LASER_HAIR_REMOVAL e TATTOO_REMOVAL. requiresEquipment é independente do nome do procedimento. As três tecnologias específicas sempre exigem equipamento, com proteção no domínio e CHECK no banco. Classificação específica não pode ser removida pela edição comum; corrigir um cadastro classificado incorretamente exige revisão administrativa dos dados, não renomeação para contornar a regra.

Um procedimento GENERAL também pode exigir aparelho por configuração explícita. GENERAL não significa garantia técnica de que o tratamento dispense aparelho: o inventário deve ser conferido pela gerente. Novos registros sem classificação explícita seguem GENERAL para compatibilidade com o payload anterior; não há classificação automática pelo nome no código de execução.

Cadastro incompleto pode ser salvo inativo. Criar um HIFU ativo sem compatibilidade revisada é recusado; crie inativo, configure equipamentos pela API existente e então ative. Em uma transição de ativação (ou PATCH explícito de ativação), equipamento obrigatório exige revisão e aparelho compatível ACTIVE. A infraestrutura bloqueia Procedure e os aparelhos por ID crescente na mesma transação, na ordem já usada pelo módulo de equipamentos.

Uma manutenção posterior não desativa o catálogo silenciosamente. Metadados de procedimento já ativo podem continuar sendo editados. GET resource-policy informa disponibilidade atual; essa consulta é momentânea, não reserva equipamento. A exigência do aparelho/cartucho realmente usado será parte de atendimentos, não do catálogo.

A compatibilidade é declarada pela gerente. Esta etapa não certifica automaticamente que um modelo físico seja tecnicamente adequado ao procedimento.

## Áreas, tamanhos e identidade

ProcedureVariation foi preservada e ganhou kind=AREA/SIZE/OTHER. Nome, grupo, referência, preço, ordem e situação continuam configuráveis. Tamanhos são referências textuais, sem limite numérico ou classificador automático.

PUT preserva opções por ID e valida seu pertencimento ao procedimento. IDs desconhecidos/duplicados são recusados. Opções omitidas são desativadas, não excluídas; voltam no DTO como inativas, preservando referências e permitindo reativação pelo cadastro. Opções novas recebem ID do banco.

O frontend já guardava o ID mas não o enviava. Com autorização do usuário, acrescentou-se somente esse campo ao payload e ao tipo de entrada, sem alterar design ou controles. Clientes legados sem ID têm compatibilidade por correspondência exata de nome/grupo/referência; renomear sem ID cria nova opção e arquiva a anterior, sem presumir que o histórico deva mudar. Clientes que precisem renomear mantendo identidade devem enviar ID.

Alterar preço/opções não atualiza SaleItem existente. Agendamentos legados ainda exibem nomes atuais pelas relações já existentes; snapshots de execução pertencem à futura modelagem de atendimentos. Não é prometido um histórico clínico imutável que o schema atual ainda não suporta.

## Materiais e revisão

ProcedureMaterial continua sendo previsão, não uma movimentação de estoque. O agregado recusa insumo duplicado, quantidade não positiva ou com mais de três casas decimais. O repository valida existência das referências e atualiza links/revisão em transação. Lista vazia revisada significa não utiliza; revisão ausente significa cadastro ainda não conferido. Não há bloqueio de estoque pela edição do cadastro.

## Contrato

Rotas anteriores preservadas. DTOs acrescentam technology, requiresEquipment e variations[].kind; os campos anteriores mantêm formatos e nomes. Novas rotas autenticadas:

- GET /api/v1/procedures/:id/resource-policy: tecnologia, exigência, revisão, aparelho ativo compatível e condição operacional.
- PATCH /api/v1/procedures/:id/resource-policy (ADMIN): {technology,requiresEquipment}.

PUT/POST de procedimento também aceitam esses dois campos opcionais; quando omitidos na edição, os valores existentes são preservados. Todas as escritas continuam ADMIN. Não foram acrescentados controles de tecnologia/kind na interface nesta entrega: a configuração nova pode ser feita pela API; a evolução visual será combinada separadamente.

## Migration e dados antigos

Nova migration: `20261105000000_procedure_resources`.

- Adiciona tecnologia/exigência em Procedure e kind em ProcedureVariation, sem excluir registros ou trocar IDs.
- Faz mapeamento pontual dos nomes canônicos do seed: Ultrassom Microfocado, Depilação a Laser, Remoção de Tatuagem. Isso é backfill revisável, não regra de identificação em runtime.
- Marca como AREA somente os grupos Face/Corpo da depilação conhecida, e SIZE somente Tamanho da remoção conhecida. Botox com “1 área” continua OTHER; não é uma região anatômica identificada.
- Registros renomeados ou categorias diferentes precisam de conferência por ID antes da aplicação. Não presume que todas as variações sejam áreas ou que todo tratamento GENERAL dispense equipamento.
- Preserva situação ativa, revisões e preços dos registros antigos. Procedimentos obrigatórios já ativos sem aparelho configurado devem ser conferidos; GET resource-policy identifica a pendência. Não há desativação em massa presumida.
- O seed demo foi atualizado para criar as três tecnologias obrigatórias como rascunhos inativos, sem inventar aparelhos/compatibilidades. Registros existentes não são sobrescritos pelo seed. Opções novas do seed recebem kinds explícitos.

Aplicar somente após revisar em banco isolado. Banco com as duas migrations anteriores precisa apenas desta evolução; não executar de novo o SQL de `prisma/changes`. No ambiente desta entrega, o Prisma Client foi gerado sem engine para compilar os tipos (download de binário indisponível); isso não constitui execução ou validação MySQL da migration.

## Validação

Testes de domínio, aplicação, repository e HTTP com persistência simulada cobrem identidade das opções, arquivamento, falta de equipamento, ativação revisada, política obrigatória, quantidades e rollback. Contratos legados e novos são repetidos sobre dist. O schema e o SQL precisam de aplicação/validação MySQL pelo ambiente local antes de usar esta versão com dados reais.
