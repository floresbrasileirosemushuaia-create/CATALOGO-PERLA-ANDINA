PERLA ANDINA B2B V2.4.8 PERLA ANDINA
======================================

OBJETIVO
- Eliminar o BAT do fluxo normal de atualização.
- Preservar o projeto Apps Script existente e a MESMA implantação Web App.
- Manter GitHub -> Vercel automático.
- Criar um caminho cloud auditável para Apps Script, com backup antes do push e comparação depois do deploy.

O QUE FOI ALTERADO
- Versão do backend Apps Script: 2.4.8.
- Versão da API Vercel: 2.4.8.
- Textos que mandavam executar o instalador V2.4.7 foram trocados por aviso de configuração cloud pendente.
- Foram adicionados workflows e scripts cloud para aplicar patches cirúrgicos sobre o Apps Script remoto sem publicar o backend completo no GitHub.

PRESERVADO
- Botões e onclick/onchange/oninput.
- Listeners.
- Abas e data-tab.
- IDs HTML/JS.
- google.script.run.
- api()/RPCs.
- boot/load inicial.
- Cache e service worker: lógica NÃO alterada nesta versão.
- Reservas, tarifas, fotos, Drive, login, salvar/editar produtos.

DEPLOY APPS SCRIPT
1. GitHub Action baixa o Apps Script remoto atual.
2. Faz backup completo ANTES de alterar.
3. Aplica apenas o patch autorizado.
4. Valida sintaxe e o Deployment ID existente.
5. Faz push no mesmo Script ID.
6. Atualiza o mesmo Deployment ID.
7. Faz novo pull remoto e comparação integral.

CREDENCIAL CLOUD
- CLASPRC_JSON: segredo GitHub com a autenticação clasp da conta Google autorizada.

Se o segredo não existir, o workflow não altera o Apps Script.

VERCEL
O repositório já está conectado ao projeto catalogo_perla_andina. Commits na main continuam gerando deploy Vercel automaticamente.

PUSH
/api/config ainda depende das variáveis privadas VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e PUSH_SERVER_TOKEN. Nenhuma chave privada é gravada no GitHub público.
