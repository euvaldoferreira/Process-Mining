# Process Mining Browser Collector

Extensão de navegador que ajuda organizações a entender como seus sistemas web são realmente utilizados no dia a dia, transformando a interação dos usuários em dados estruturados para análise de processos (Process Mining).

## Objetivo

Sistemas internos e de atendimento costumam ter fluxos complexos, com etapas manuais, retrabalho e gargalos difíceis de enxergar apenas olhando a documentação. Esta extensão observa a navegação em sites escolhidos pelo próprio usuário e envia os eventos coletados para um serviço central, permitindo reconstruir o processo real percorrido e identificar oportunidades de melhoria.

## Privacidade por padrão

- Nunca captura senhas, tokens, cookies, CPF, CNPJ, cartões ou qualquer dado de autenticação.
- Coleta apenas informações não sensíveis, com truncamento para reduzir exposição de dados.
- O usuário decide quais sites podem ser observados.
- A observação pode ser desativada a qualquer momento.
- Leia a [política de privacidade completa](PRIVACY.md).

## Como funciona

1. O usuário instala a extensão e escolhe os sites que deseja observar.
2. A extensão registra interações relevantes (cliques, preenchimentos, erros) enquanto o usuário navega normalmente.
3. Os eventos são enviados de forma segura e assíncrona para um serviço de coleta, sem impactar a navegação.
4. Os dados coletados podem ser analisados com ferramentas de Process Mining para revelar como os processos realmente acontecem.

## Documentação adicional

- [Deploy e operação](DEPLOY.md)
- [Publicação nas lojas de extensões](STORE_SUBMISSION_GUIDE.md)
- [Política de privacidade](PRIVACY.md)
