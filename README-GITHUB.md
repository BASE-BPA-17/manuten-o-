# SkyRail L17 — arquivos para GitHub

Este pacote contém o painel HTML e os arquivos auxiliares da etapa de autenticação por usuário e senha via Supabase.

## Envio pelo site do GitHub (sem VS Code)
1. Extraia o ZIP no Windows (botão direito > Extrair tudo).
2. Abra a pasta `skyrail-l17-corrigido` extraída.
3. No GitHub, abra o repositório `BASE-BPA-17/manuten-o-`.
4. Clique em **Add file** > **Upload files** (ou no link de enviar arquivos existentes).
5. Arraste para a página os arquivos e pastas `index.html`, `js`, `supabase` e este README. Não envie apenas o HTML: os arquivos auxiliares são necessários.
6. Em **Commit changes**, use a mensagem `Adicionar arquivos do SkyRail L17` e confirme.

## Antes de colocar o sistema em uso
- Configure `js/skyrail-config.js` com a Project URL e a chave pública anon/publishable do Supabase.
- Nunca coloque `service_role` ou `sb_secret` no HTML ou em arquivos publicados.
- Execute `supabase/schema.sql` no SQL Editor do Supabase e publique a Edge Function `supabase/functions/skyrail-admin-create-user` conforme o guia `README-PRIMEIROS-PASSOS.md`.
- O cadastro público fica desativado; o administrador cria os usuários.
- Hospede em HTTPS, por exemplo Cloudflare Pages.

## Limite importante desta versão
Esta etapa prepara autenticação e controle de acesso por usuário. Os registros dos módulos de manutenção ainda usam armazenamento local do navegador; a sincronização desses registros entre computadores ainda precisa ser implementada. Não considere o banco como cópia online dos relatórios/preventivas até essa etapa ser concluída e testada.
