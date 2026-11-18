# Auditorias Hauke

App de auditoria de instalações (Qualidade) da Hauke Engenharia, para celular.
Funciona offline, salva sozinho, aceita fotos por item, gera o relatório em PDF e envia as auditorias concluídas para uma planilha + pasta no Drive da Hauke.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | Tela e estilo do app |
| `app.js` | Lógica do app (senha, auditoria, PDF, localização, envio) |
| `modelo.js` | **Checklist** (setores e itens). Edite aqui para mudar perguntas |
| `config.js` | Endereço do Apps Script **criptografado** com a senha (gerado em `configurar.html`) |
| `configurar.html` | Ferramenta para gerar o `config.js` |
| `sw.js`, `manifest.webmanifest`, `icons/` | Funcionamento offline e instalação no celular |
| `vendor/jspdf.umd.min.js` | Gerador de PDF (local, para funcionar sem internet) |
| `apps-script/Codigo.gs` | Back-end (planilha + Drive). **Não precisa subir para o GitHub** |

## 1. Back-end no Google (uma vez)

1. Entre no Drive da Hauke e crie uma planilha, ex.: **Auditorias Hauke – Base**.
2. Na planilha: **Extensões > Apps Script**. Apague o que tiver e cole o conteúdo de `apps-script/Codigo.gs`.
3. Na função `configurarSenha`, troque `TROQUE-POR-UMA-SENHA-FORTE` pela senha da equipe (frase ou 12+ caracteres).
4. Selecione `configurarSenha` no menu de funções e clique **Executar**. Autorize o acesso.
5. Apague a senha do código (volte ao texto `TROQUE-…`) e salve. Ela fica guardada nas propriedades do script.
6. **Implantar > Nova implantação** > engrenagem > **App da Web**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
7. Copie o endereço que termina em **/exec**.

As abas `Auditorias` e `Respostas` e a pasta `Auditorias Hauke` são criadas no primeiro envio.

## 2. Gerar o config.js

1. Abra `configurar.html` no navegador do computador (duplo clique no arquivo já funciona).
2. Cole o endereço /exec, digite a senha duas vezes, clique **Testar conexão** e depois **Gerar config.js**.
3. Copie o resultado e substitua todo o conteúdo do `config.js`.

## 3. Publicar no GitHub Pages

1. Crie um repositório (ex.: `auditorias-hauke`) na conta da Hauke.
2. Suba todos os arquivos desta pasta (a pasta `apps-script/` pode ficar de fora).
3. **Settings > Pages** > Source: *Deploy from a branch* > branch `main`, pasta `/ (root)` > Save.
4. Em ~1 minuto o app fica em `https://<conta>.github.io/auditorias-hauke/`.

## 4. Instalar no celular

Abra o link uma vez **com internet**, digite a senha e:
- **Android (Chrome):** menu ⋮ > *Instalar app* / *Adicionar à tela inicial*.
- **iPhone (Safari):** botão compartilhar > *Adicionar à Tela de Início*.

A partir daí abre como app e funciona sem internet.

## Uso do dia a dia

- **Auditorias em aberto** ficam só no celular de quem está fazendo (salvam a cada toque).
- **Ao finalizar**, a auditoria é enviada: fotos e PDF vão para uma pasta própria no Drive, e a planilha recebe uma linha em `Auditorias` (nota final e % por setor) e uma linha por item em `Respostas`. Sem internet, fica na fila e sobe sozinha quando a conexão voltar (ou pelo menu ⋯ > *Sincronizar agora*).
- **Histórico** mostra as auditorias deste aparelho + todas as do Drive (de qualquer celular), com link para o PDF.
- **Reabrir** uma auditoria concluída e finalizar de novo substitui os dados e o PDF no Drive.
- Depois de enviada, dá para usar ⋯ > *Remover deste aparelho* para liberar espaço (continua no Drive).

## Trocar a senha (ex.: alguém saiu da equipe)

1. No Apps Script, rode `configurarSenha` com a senha nova (e apague-a do código depois).
2. Gere um novo `config.js` em `configurar.html` com a senha nova e suba para o GitHub.
3. Os celulares pedem a senha nova na próxima vez que tentarem enviar.

## Alterar o app

- **Perguntas/setores:** edite `modelo.js`. Auditorias antigas não mudam (cada uma guarda o modelo da época).
- **Qualquer alteração publicada:** aumente o número em `VERSAO` no topo do `sw.js` (ex.: `auditorias-v2`) para os celulares baixarem a versão nova. Ela aparece na segunda abertura do app.
- **Atualizar o Apps Script:** Implantar > Gerenciar implantações > editar (lápis) > Versão: *Nova versão*. Assim o endereço /exec não muda.

## Segurança

- O repositório público expõe só o código e o checklist. Auditorias, fotos e dados de clientes ficam no celular e no Drive da Hauke.
- O endereço do Apps Script está criptografado (AES-256, chave derivada da senha com PBKDF2 310 mil iterações) e o Apps Script confere a senha em todo envio.
- A senha fica memorizada em cada celular até usar ⋯ > *Sair*.
- `COMPARTILHAR_POR_LINK` no `Codigo.gs`: deixe `false` se todos abrem o Drive logados na conta da Hauke; mude para `true` se precisar abrir PDFs/fotos por link em aparelhos sem login.
