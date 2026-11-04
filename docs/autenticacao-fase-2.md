# Fase 2 — autenticação, autorização e erros

## Escopo

A autenticação ganhou módulo próprio e separação entre domínio, aplicação, infraestrutura e apresentação. As tabelas User/Session e todos os contratos de sucesso foram preservados. Não há JWT, nova biblioteca, migration ou alteração de frontend nesta etapa.

```text
src/auth/
  domain/
    auth-user.ts                 identidade e perfil público
    auth-session.ts              validade temporal e ator autorizado
    session-token.ts             credencial opaca, sem serialização do segredo
    authorization-policy.ts      exigência de ADMIN
    login-attempt-window.ts      janela de tentativas
    auth.repositories.ts         contratos de usuário e sessão
    actor.ts / auth-error.ts
  application/
    auth.service.ts               login e coordenação
    session.service.ts            emissão, autenticação e revogação
    auth.ports.ts                 relógio, hash, token e limitador
  infrastructure/
    prisma-auth.repositories.ts   persistência
    scrypt-password-hasher.ts     compatibilidade de hashes
    crypto-session-tokens.ts      aleatoriedade e SHA-256
    memory-login-attempt-limiter.ts
    system-auth-clock.ts
  presentation/
    auth.controller.ts
    session.guard.ts
    auth.decorators.ts
    session-cookie.ts
    auth.configuration.ts
  auth.module.ts
```

`auth.guard.ts` e `security.ts` na raiz de auth são somente reexports de compatibilidade para os domínios/seeds ainda antigos. Não mantêm outra implementação de guard, sessão ou criptografia.

## Fluxos e invariantes

- Login valida o formato, consulta o usuário e verifica a senha por uma porta de criptografia. Email é normalizado para minúsculas como antes; senha nunca é normalizada.
- Hash mantém o formato gerado pelo projeto: `scrypt:<salt de 32 hex>:<hash de 128 hex>`. As funções síncronas usadas por cadastros/seeds existentes continuam disponíveis; login usa a derivação assíncrona do Node para não bloquear o event loop.
- Usuário inexistente e senha errada retornam o mesmo 401. Ambos executam derivação de senha. Hash corrompido não autentica.
- Token de sessão tem 32 bytes aleatórios. Só o SHA-256 vai ao banco; plaintext é entregue exclusivamente pelo cookie. JSON/string do objeto de valor não revelam o token.
- Sessão dura sete dias; expiração é recusada inclusive no instante exato. Autenticação consulta o usuário atual, não papéis enviados no body.
- Logout revoga somente o token apresentado e limpa o cookie. Continua exigindo sessão válida, como antes. Sessão expirada ou revogada retorna 401; não foi criado um novo fluxo público de logout.
- Guard autentica e aplica a exigência ADMIN. Escopos por profissional continuam nos seus controllers, sem mudança de política de acesso nesta fase.
- Cookie mantém nome clinic_session, HttpOnly, SameSite=Lax, path=/ e Secure conforme ambiente. Sem domínio global, token no localStorage ou credencial no JSON de login.
- Limitador mantém dez falhas por IP por quinze minutos. Sucesso limpa a janela. Janela vencida é eliminada e há teto de 10 mil chaves. Continua local por processo, sem proteção distribuída; usa eviction da chave mais antiga ao atingir o teto. O código de bloqueio permanece 401 para preservar o contrato anterior.

## Origens, produção e configuração

AuthConfiguration valida NODE_ENV, COOKIE_SECURE e origens HTTP(S) sem caminhos ou wildcard. Desenvolvimento/teste mantém origem padrão localhost:5199 e COOKIE_SECURE=false quando ausente. Produção exige origens HTTPS explícitas e COOKIE_SECURE=true.

A verificação de origem em mutações foi preservada, inclusive em rotas públicas. Requisições sem Origin continuam aceitas conforme o comportamento anterior. Não equivale a implementar uma nova estratégia completa de CSRF. Nenhuma configuração de trust proxy foi acrescentada: o limitador usa req.ip do Express. A topologia de proxy e a integração cross-site com o e-commerce precisam de decisão própria.

O entry point valida PORT e DATABASE_URL antes de subir a API e habilita desligamento gracioso. Mensagens de configuração citam nomes de campos, sem imprimir seus valores. Testes de composição sem banco podem montar AppModule sem executar esse entry point.

## Filtro global

ApiExceptionFilter é provider APP_FILTER e substitui o filtro anônimo antes instalado somente em main.ts. Assim, testes e aplicação usam o mesmo tratamento. ApplicationError é um contrato de falha compartilhado e independente de HTTP; AuthError e EquipmentError o especializam. O filtro específico de equipamentos foi removido para evitar duas políticas de resposta.

Formato base preservado: `{error: string, statusCode: number}`. Validação Zod via parse() acrescenta `details: {fieldErrors, formErrors}` com as mensagens; não inclui corpo da requisição. Erros Prisma conhecidos são traduzidos sem devolver SQL, metadados ou valores: P2000=400, P2002/P2003/P2034=409, P2025=404, P2024=503. Erro de inicialização Prisma=503; falhas desconhecidas=500 genérico. Erros 5xx são registrados sem mensagem original, stack, URL, body, cookie ou credenciais.

Não foram alteradas as regras de negócio de agenda, estoque ou financeiro identificadas na auditoria. O filtro apenas melhora as respostas de falhas existentes.

## Permissões e limites

A matriz de `permissoes-atuais.md` permanece vigente como descrição do código. Em particular, funcionário ainda pode consultar clientes, estoque e leads; essas rotas não viraram ADMIN apenas porque a sidebar as esconde. Escritas administrativas e escopo de venda de outro profissional são testados. Acesso clínico, delegação de agenda e funcionários sem vínculo ainda precisam de decisão da clínica.

Não foram implementados MFA, recuperação de senha, revogação de todas as sessões, cadastro público, validação de telefone/email externo ou assinatura de documentos.

## Validação

Testes de domínio/aplicação em `backend/test/auth/` usam relógio e repositories substituíveis. Testes de criptografia usam scrypt real. Testes HTTP em `backend/test/contracts/auth-session.test.ts` usam Nest, guard e serviços reais, com persistência simulada: login→cookie→me→logout, duas sessões independentes, expiração, tentativa de elevar papel via body, matriz de acessos, origem inválida e erros globais. São repetidos no JavaScript compilado.

`npm run verify` cobre tipos, builds, testes e contratos compilados. Não executa SQL, seed ou migration. A integração com MySQL real continua para validação local; o schema e o histórico de migrations não foram alterados.
