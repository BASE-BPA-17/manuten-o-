# SkyRail L17 — pacote corrigido e autenticação Supabase

## O que foi corrigido
- Removida a referência ao arquivo ausente `js/skyrail-sdk.js` e criado um novo `js/skyrail-online.js` com autenticação real via Supabase.
- Removido o botão **Criar conta**: o funcionário não pode se cadastrar publicamente.
- Login alterado de e-mail para **usuário + senha**.
- Adicionado controle de sessão persistente, bloqueio da tela principal sem sessão e botão Sair.
- Mantidos os três módulos originais e o código de backup local.
- Validada a sintaxe JavaScript do HTML principal e dos scripts internos dos três módulos.

## Importante: ainda falta conectar ao seu projeto
O HTML não contém URL nem chave pública do Supabase. Por segurança, não inventei esses dados. A autenticação só ficará operacional depois de configurar o projeto. A chave `service_role` nunca deve ser colocada no HTML.

## Configuração
1. Abra `js/skyrail-config.js`.
2. Substitua `COLE_AQUI_A_URL_DO_PROJETO` pela Project URL do Supabase.
3. Substitua `COLE_AQUI_A_CHAVE_ANON_PUBLICA` pela chave `anon`/`publishable` pública do projeto. Não use `service_role`.
4. Em Authentication > Settings, desative o cadastro público (Allow new users to sign up). Mantenha o provedor Email habilitado; a função administrativa cria usuários já confirmados.
5. No SQL Editor do Supabase, execute `supabase/schema.sql`.
6. Em Authentication > Users, crie o primeiro usuário administrador com o e-mail técnico `admin@login.skyrail.invalid`, marque-o como confirmado e defina uma senha. Esse e-mail é interno ao mecanismo de autenticação; o administrador entra no SkyRail digitando apenas `admin`.
7. Copie o UUID desse usuário e execute o INSERT de bootstrap comentado no final de `schema.sql`, preenchendo UUID e nome.
8. Publique a Edge Function: `supabase functions deploy skyrail-admin-create-user`. Verifique se a função tem verificação JWT habilitada.
9. Hospede a pasta do projeto em HTTPS (por exemplo, Cloudflare Pages). Não abra o HTML por `file://`.

## Cadastro de funcionários
A Edge Function `skyrail-admin-create-user` aceita POST autenticado pelo administrador com JSON `{ "username": "joao", "fullName": "João da Silva", "password": "uma-senha-forte" }`. Ela verifica o perfil admin no banco, cria o usuário confirmado e grava seu perfil. A senha nunca é gravada na tabela de perfis.

## Limite desta etapa
Esta entrega implementa e prepara a autenticação. Os módulos ainda gravam os registros de trabalho nos armazenamentos locais do navegador (localStorage/IndexedDB), como no arquivo original. **Não considere os dados de manutenção sincronizados entre computadores ainda.** A sincronização compartilhada de preventivas, relatórios, passagens e fotos precisa ser a próxima etapa, com regras de acesso e tratamento de conflitos antes de ativá-la.
