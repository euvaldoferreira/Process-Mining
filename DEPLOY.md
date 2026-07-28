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

## Distribuição self-hosted da extensão (Firefox)

Como a extensão é instalada fora da AMO (via política interna, não pela loja pública), o Firefox precisa de um `update_url` próprio para checar novas versões — `browser_specific_settings.gecko.update_url` no `manifest.json` aponta para `https://process-mining.liseu.workers.dev/updates.json`, servido pelo próprio worker a partir do bucket R2 `extension-releases` (binding `RELEASES_BUCKET`).

A cada nova versão:
1. Suba o pacote como **submissão não listada (self-distribution)** na AMO — a Mozilla ainda precisa assinar o `.xpi`, mesmo fora da loja pública.
2. Baixe o `.xpi` assinado e calcule o hash: `shasum -a 256 process-mining-collector-X.Y.Z.xpi`.
3. Publique o arquivo e o manifesto de atualização no R2:
   ```bash
   cd worker
   npx wrangler r2 object put extension-releases/releases/process-mining-collector-X.Y.Z.xpi --file process-mining-collector-X.Y.Z.xpi --remote
   npx wrangler r2 object put extension-releases/updates.json --file updates.json --remote
   ```
4. `updates.json` segue o formato em [worker/releases/updates.example.json](worker/releases/updates.example.json), com `version`, `update_link` (apontando para `/releases/<arquivo>.xpi`) e `update_hash` (`sha256:<hash calculado>`).

Publicar um novo `updates.json` no R2 não exige reimplantar o worker — as rotas `GET /updates.json` e `GET /releases/<arquivo>` já servem o conteúdo atual do bucket.

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
