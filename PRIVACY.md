# Política de privacidade e segurança

Esta extensão coleta eventos de interação do navegador para análise de processo, com foco em uso do sistema SEI e similares.

## Dados capturados
- Eventos de clique, digitação não sensível, navegação e erros.
- Metadados de contexto do elemento, como tag, id, nome e rótulos, sem expor valores de autenticação.
- URL da página atual e timestamps.

## Dados não capturados
- Senhas, tokens, cookies, chaves de API, CPF, CNPJ, cartões e dados de login.
- Conteúdo de campos cujo nome sugira informação sensível.

## Medidas de segurança
- Sanitização e truncamento de valores.
- Envios em lote com flush assíncrono para evitar impacto na navegação.
- O serviço de coleta valida o formato dos dados recebidos, limita volume por origem (rate limiting) e pode exigir uma chave de acesso, para reduzir o risco de uso indevido do endpoint.

## Controle do usuário
- O usuário escolhe quais sites observados.
- A observação pode ser desativada a qualquer momento.
- A instalação deve ser explícita e o uso opcional.
