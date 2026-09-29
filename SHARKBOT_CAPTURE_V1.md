# SharkBot capture v1

Objetivo: receber o webhook real do SharkBot no Tiotrack sem assumir o formato do payload.

Endpoint:

`POST /api/integrations/sharkbot?wid=<WORKSPACE_ID>&token=<SHARKBOT_WEBHOOK_SECRET>`

- grava payload bruto + JSON normalizado em `integration_webhook_events`
- aceita JSON e `application/x-www-form-urlencoded`
- não depende de assinatura customizada do SharkBot; autentica pela URL secreta
- `SHARKBOT_RELAY_URL` é opcional para encaminhar o mesmo POST ao tracker anterior durante a migração
- GET no mesmo endpoint, com `wid` e `token`, retorna os últimos eventos para debug

Depois que um payload real chegar, mapear status, order id, valor, contato e tracking (`sck`, `xcod`, `click_id`, `ttclid`, UTMs) para `orders` + `tracking_events`.
