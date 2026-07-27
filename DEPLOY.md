# Deploy seguro para Cloudflare

## Fluxo recomendado
1. Trabalhe em branches de desenvolvimento, como `develop`.
2. Valide com `npm test`.
3. Faça merge para `main` somente quando a versão estiver pronta.
4. O workflow em `.github/workflows/deploy.yml` publica o worker somente após a validação.

## Variáveis de ambiente necessárias
No GitHub Actions, configure:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Observações
- Nunca armazene segredos no repositório.
- Mantenha o worker e a extensão separados em branches/ambientes conforme necessário.
- Use rollback simples com revert de commit ou re-deploy manual.
