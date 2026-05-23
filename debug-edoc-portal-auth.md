# Debug Session: edoc-portal-auth

Status: [OPEN]

## Symptom
- Admin/operator salva usuario e senha do Questor Zen no Meu Perfil.
- Ao abrir detalhe do e-Doc, o Vision informa que a autenticacao falhou e sugere usuario/senha incorretos.
- O usuario informa que as credenciais estao corretas.

## Scope
- Fluxo de detalhe do e-Doc enriquecido por portal autenticado.
- Credenciais usadas a partir do Meu Perfil do usuario logado.

## Hypotheses
- H1: O endpoint/fluxo de login do portal mudou e o POST atual nao replica mais o formulario real.
- H2: O portal exige cookies, hidden fields ou redirecionamentos adicionais antes da autenticacao ser considerada valida.
- H3: O valor salvo/lido de usuario ou senha diverge do valor digitado no Meu Perfil.
- H4: O portal autentica, mas a verificacao atual em `/cliente/painel` interpreta a resposta de forma incorreta.
- H5: O portal responde com tela intermediaria, captcha ou outro bloqueio e o Vision classifica isso genericamente como credencial invalida.

## Evidence Plan
- Instrumentar leitura de credenciais sem expor segredo.
- Instrumentar GET/POST do login e validacao final.
- Coletar status HTTP, location, presenca de login HTML, tamanho/assinatura do HTML e URL final.
- Reproduzir com credenciais salvas no Meu Perfil do admin/operator.

## Fix Gate
- Nenhuma mudanca de regra de negocio antes de evidencias de runtime.
