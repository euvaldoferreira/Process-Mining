# Deploy seguro para Cloudflare

## Worker em produção
- URL: https://process-mining.liseu.workers.dev
- Configure essa URL no popup/opções da extensão (campo "apiUrl") para que os eventos sejam enviados para o worker correto.

## Fluxo atual de deploy
O deploy do worker é feito pela integração Git nativa do Cloudflare (Workers & Pages → Configurações → Build), não pelo workflow `.github/workflows/deploy.yml`:
- Repositório: `euvaldoferreira/Process-Mining`
- Diretório raiz do build: `worker`
- Comando de implantação: `npx wrangler deploy`
- Ramificação de produção: a branch configurada em "Controle da ramificação" no painel

Os workflows em `.github/workflows/` (`deploy.yml`, `deploy-preview.yml`) ficam disponíveis como alternativa via GitHub Actions, mas não estão ativos no momento — evite disparar os dois fluxos ao mesmo tempo para não gerar deploys duplicados/conflitantes.

## Proteção contra abuso do endpoint público
O worker valida o schema dos eventos e limita o tamanho do lote/payload. Também aplica rate limiting (60 req/60s, ver `[[ratelimits]]` em `worker/wrangler.toml`), usando como chave o `X-Client-Id` enviado pela extensão (um UUID gerado uma vez por instalação e guardado em `chrome.storage.local`) — isso garante que instalações diferentes atrás do mesmo IP/rede (ex.: proxy corporativo) não disputem a mesma cota. Se o header não vier ou não for um UUID válido, o worker cai de volta para o IP. Cada evento salvo no R2 também guarda esse `clientId`, útil para diferenciar instalações na análise dos dados.

Opcionalmente, defina uma chave de API para exigir que só a extensão configurada consiga enviar dados:

```bash
cd worker
npx wrangler secret put API_KEY
```

Depois, cole o mesmo valor no campo "Chave de API" do popup da extensão. Se o secret `API_KEY` não for definido, essa checagem fica desativada (mas a validação de schema e o rate limit continuam ativos).

## Fluxo recomendado
1. Trabalhe em branches de desenvolvimento, como `develop`.
2. Valide com `npm test`.
3. Faça merge para a branch de produção configurada no painel somente quando a versão estiver pronta.

## Variáveis de ambiente necessárias
No GitHub Actions, configure:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Observações
- Nunca armazene segredos no repositório.
- Mantenha o worker e a extensão separados em branches/ambientes conforme necessário.
- Use rollback simples com revert de commit ou re-deploy manual.
