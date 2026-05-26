# Debug Session: dismissal-required-fields

- Status: OPEN
- Symptom: a solicitacao de demissao continua retornando "Preencha todos os campos obrigatorios." mesmo com os campos visivelmente preenchidos.
- Scope: formulario de solicitacao de demissao no portal do cliente.

## Hypotheses

1. O `FormData` enviado pelo cliente chega na server action sem um dos campos controlados (`employee_id`, `notice_type`, `dismissal_cause`, `company_id` ou `dismissal_date`).
2. O estado React da tela exibe os valores corretamente, mas no clique de submit algum valor controlado ainda nao foi sincronizado a tempo para o payload final.
3. O `activeCompanyId` ou outro identificador de empresa esta visivel no contexto do usuario, mas chega vazio ou divergente na server action de demissao.
4. Existe diferenca entre o fluxo do cliente e o fluxo admin, e a falha ocorre apenas no caminho `/app/dismissals/new`.
5. A mensagem generica vem de uma validacao backend correta, mas sem detalhe suficiente para identificar qual campo esta faltando.

## Plan

1. Instrumentar somente o formulario e a server action da demissao.
2. Coletar logs de pre-submit e pre-validation.
3. Confirmar ou rejeitar as hipoteses com evidencias.
4. Aplicar a correcao minima apenas depois da confirmacao por logs.
