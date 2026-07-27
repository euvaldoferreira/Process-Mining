# Process Mining Browser Collector

## Visão geral
Esta extensão foi criada para coletar eventos de interação em navegadores para fins de Process Mining, principalmente para sistemas como o SEI. Ela envia logs para uma API aberta hospedada na Cloudflare, que salva os registros em armazenamento da Cloudflare.

## Requisitos de privacidade e segurança
- Nunca captura login, senha, tokens, cookies, CPF, CNPJ, cartões ou dados de autenticação.
- Captura apenas valores não sensíveis, com truncamento de payloads para reduzir risco.
- O usuário decide quais sites podem ser observados.
- A observação pode ser desativada a qualquer momento.
- O fluxo é otimizado para não prejudicar a navegação, com batching e flush assíncrono.

## Arquitetura
- Extensão para Chrome/Firefox/Edge com manifest V3.
- Content script coleta eventos de input, click, erro e visibilidade.
- Background service worker coleta e envia eventos em lote para a API configurada.
- Worker Cloudflare recebe os eventos e salva em R2.

## Estrutura do projeto
- manifest.json: definição da extensão.
- extension/: código da extensão.
- worker/src/index.js: worker Cloudflare.
- tests/: testes de sanitização e privacidade.

## Configuração da API
A URL da API é um parâmetro configurável pela extensão via popup/opções.

## Fluxo de deploy
- `main` → deploy de produção.
- branch de feature → validação por preview.
- workflow manual `deploy-preview.yml` para publicar ambiente de preview.

## Publicação nas lojas
### Firefox
1. Crie um pacote em formato ZIP com os arquivos da extensão.
2. Acesse addons.mozilla.org.
3. Envie a extensão para revisão.
4. Informe que a coleta é opcional e que não captura dados sensíveis.

### Chrome Web Store
1. Prepare o pacote com manifest.json e arquivos da extensão.
2. Publique via Google Developer Dashboard.
3. Inclua na descrição: uso opcional, coleta limitada, sem captura de senhas.

### Microsoft Edge Add-ons
1. Submeta o pacote no Partner Center.
2. Descreva a finalidade de monitoramento de uso com foco em análise de processo.
3. Garanta que a extensão não capture credenciais.

## Deploy do worker Cloudflare
1. Crie um bucket R2.
2. Configure um worker com o código de [worker/src/index.js](worker/src/index.js).
3. Defina a binding de ambiente chamado LOGS_BUCKET.
4. Publique o worker e use a URL como configuração da extensão.

## Testes
Execute:
```bash
npm test
```
