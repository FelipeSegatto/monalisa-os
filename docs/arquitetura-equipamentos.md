# Arquitetura do domínio de equipamentos

A refatoração trabalha sobre o conteúdo de `feat/equipment-operations`. Ela não altera schema, migrations, URLs ou payloads do frontend. Os outros domínios serão reorganizados progressivamente.

```text
backend/src/equipments/
  domain/
    equipment.ts                 raiz do agregado e comportamento
    equipment-component.ts       entidade subordinada, com identidade
    civil-date.ts                objeto de valor imutável para data civil
    maintenance-schedule.ts      objeto de valor imutável para manutenção
    equipment-event.ts           fatos produzidos pelo agregado
    equipment.types.ts           tipos e validações do domínio
    equipment-error.ts           erros independentes de HTTP
    equipment.repository.ts      contrato de escrita atômica
  application/
    equipment.service.ts         coordenação dos casos de uso
    equipment.queries.ts         contrato/projeções de leitura
    equipment-clock.ts           porta para a data atual
  infrastructure/
    prisma-equipment.repository.ts
    prisma-equipment.queries.ts
    equipment.mapper.ts
    system-equipment-clock.ts
  presentation/
    equipment.controller.ts
    equipment.schemas.ts
  equipments.module.ts
```

## Responsabilidades e dependências

O domínio não importa NestJS, Prisma, Zod ou camadas superiores. É executável e testável como TypeScript puro. O service de aplicação depende dos contratos de repository, consultas e relógio, sem executar SQL ou conhecer tipos Prisma. O módulo Nest associa esses contratos às implementações concretas.

O `AppModule` importa `EquipmentsModule` e o módulo Prisma compartilhado. A implementação de Prisma passou para `shared/infrastructure/prisma`; `common/prisma.service.ts` é um reexport de compatibilidade, não outro provider. Equipamentos, guard e controllers antigos recebem a mesma instância.

O controller valida o formato HTTP e exige as permissões já existentes. A entidade também valida os valores; chamar um caso de uso fora de HTTP não contorna as invariantes. EquipmentError especializa ApplicationError (contrato puro compartilhado). O filtro global ApiExceptionFilter traduz as categorias para `{error,statusCode}` com 400/404/409, preservando as respostas do módulo.

A injeção dos providers novos e do guard usa tokens explícitos, compatíveis tanto com o build `tsc` quanto com o executor `tsx` de desenvolvimento.

## Comportamento do agregado

`Equipment` encapsula estado e componentes. Expõe snapshots copiados, não referências mutáveis. Exemplos:

```ts
const equipment = Equipment.create(code, data);
equipment.addComponent(componentCode, componentData);
equipment.updateComponent(componentId, componentData);
equipment.changeStatus('MAINTENANCE', reason);
equipment.retire(reason);
equipment.scheduleMaintenance(CivilDate.from('2027-11-01'), reason);
equipment.recordMaintenance(performedDate, today, reason, nextDate);
```

Reconstituição de dados persistidos não produz eventos de cadastro. Componentes só são alterados pelo agregado carregado; não existe método de transferência. Aposentadoria é definitiva, e o agregado aposentado impede alterações em seus componentes. Desassociar um aparelho aposentado de um procedimento continua permitido para corrigir sua configuração.

`EquipmentComponent` valida identificação, capacidade opcional e transições próprias. `MaintenanceSchedule` controla intervalo, ordem das datas, data futura, repetição e cálculo por meses de calendário. Mudar o intervalo preserva a próxima manutenção já acordada.

`CivilDate` é imutável e não depende do fuso do servidor. A data atual vem de `EquipmentClock`, cuja implementação usa o padrão UTC−03 já adotado pelo sistema; testes podem fornecer data fixa.

## Persistência e concorrência

`EquipmentRepository.updateLocked` abre uma transação, bloqueia a linha do aparelho, carrega seus componentes e reconstitui o agregado. Só então executa o comportamento solicitado. Persiste estado e eventos na mesma transação. A chave gerada de um novo componente é associada ao evento pela identidade de código interno.

Na revisão de compatibilidades, bloqueia primeiro o procedimento e depois todos os aparelhos afetados por ID crescente, inclusive vínculos removidos. A validação de aposentadoria acontece após adquirir os bloqueios. Desativa vínculos anteriores sem apagar histórico e registra data/autor da revisão.

Consultas usam projeções (`EquipmentQueries`) sem montar um agregado de escrita ou carregar todo o histórico. O mapper preserva os formatos de resposta, a paginação por ID e o cálculo dos lembretes.

Os eventos são fatos imutáveis para os consumidores do domínio; seus dados são copiados. O repository acrescenta o usuário da sessão e a data de persistência do banco. Ainda não são o ledger de disparos nem proteção contra alterações feitas diretamente por um administrador SQL.

## Testes

`backend/test/equipments/` separa testes de domínio, aplicação, repository, apresentação, composição Nest, HTTP e seed. `npm test` inclui essa pasta e os testes existentes dos demais domínios.

- Domínio: comportamento e invariantes sem mocks de ORM.
- Aplicação: coordenação com portas em memória e relógio fixo.
- Repository: bloqueios, persistência conjunta, associação de IDs e rollback com transação simulada.
- HTTP: servidor Nest real, guard e filtro reais, persistência/sessões simuladas; verifica 401/403/400/404/409 e autoria.
- Composição: providers reais e instância única de Prisma, sem conectar ao banco.

Esses testes não substituem a validação concorrente em MySQL. A refatoração não aplicou migrations nem alterou o banco da clínica.

## Próximos domínios

A integração de compatibilidade com `Procedure` permanece neste módulo enquanto procedimentos ainda usa a organização antiga. Não foi criado um segundo modelo de procedimento dentro de equipamentos. Ao extrair `procedures`, definiremos essa colaboração por contratos de aplicação.

Atendimentos e ledger serão construídos com a mesma direção de dependências, respeitando suas próprias entidades, invariantes e limites transacionais.
