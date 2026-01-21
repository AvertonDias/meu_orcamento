# Resumo Técnico do Aplicativo "Meu Orçamento"

Este documento descreve a arquitetura, tecnologias e estrutura de arquivos do aplicativo, servindo como um guia rápido para desenvolvedores.

### Linguagem e Tecnologias Principais

*   **Linguagem:** O aplicativo é escrito em **TypeScript**, o que garante um código mais seguro e robusto, com tipos bem definidos.
*   **Framework Principal:** Utiliza **Next.js 14** com o **App Router**. Isso significa que a estrutura de páginas e rotas é definida por pastas dentro do diretório `src/app/`.
*   **Interface do Usuário (UI):**
    *   **React:** Como base para a construção dos componentes.
    *   **Shadcn/UI:** É a biblioteca de componentes principal, localizada em `src/components/ui/`. Ela é construída sobre os primitivos do Radix UI para garantir acessibilidade e funcionalidade.
    *   **Tailwind CSS:** Usado para toda a estilização. As configurações de tema (cores, fontes, etc.) estão centralizadas em `src/app/globals.css`.
*   **Funcionalidade Offline (PWA):** O aplicativo é um **Progressive Web App (PWA)**, projetado para funcionar perfeitamente mesmo sem conexão com a internet.
    *   **Capacitor:** Utilizado para empacotar o aplicativo web em um formato nativo que pode ser instalado em dispositivos móveis (Android/iOS), como configurado em `capacitor.config.ts`.
    *   **Dexie.js:** É o banco de dados local que roda no navegador, baseado no IndexedDB. Ele armazena todos os dados da aplicação (clientes, orçamentos, materiais) diretamente no dispositivo, permitindo que o app funcione offline. A configuração do schema do banco está em `src/lib/dexie.ts`.
*   **Banco de Dados na Nuvem e Sincronização:**
    *   **Firebase Firestore:** Usado como o banco de dados central na nuvem, para persistência e compartilhamento de dados.
    *   **Sincronização:** O aplicativo possui uma lógica customizada no hook `src/hooks/useSync.tsx`. Este hook detecta quando o usuário está online para enviar as alterações locais (salvas no Dexie) para o Firestore e, inversamente, para baixar as atualizações da nuvem para o banco de dados local.
*   **Autenticação:** Utiliza o **Firebase Authentication** para gerenciar o login, cadastro e recuperação de senha dos usuários.

---

### Estrutura de Arquivos Principais

Aqui está um mapa dos diretórios mais importantes e o que eles contêm:

*   `src/app/dashboard/`: **O coração da aplicação.**
    *   Cada subpasta aqui (`/orcamento`, `/clientes`, `/materiais`, `/configuracoes`, `/conversoes`) representa uma página principal do sistema.
    *   Dentro de cada pasta de página, você encontrará:
        *   `page.tsx`: O componente principal que renderiza a página.
        *   `_components/`: Uma pasta com os componentes específicos daquela funcionalidade (ex: listas, formulários, modais, diálogos).

*   `src/components/`: **Componentes reutilizáveis em todo o app.**
    *   `layout/`: Contém os componentes que montam a estrutura visual da página, como a barra lateral para desktop (`desktop-sidebar.tsx`) e a barra de navegação para dispositivos móveis (`mobile-navbar.tsx`).
    *   `ui/`: Componentes base da biblioteca Shadcn (ex: `Button`, `Card`, `Input`, `Dialog`). São os blocos de construção da interface.

*   `src/lib/`: **Lógica central, tipos e utilitários.**
    *   `dexie.ts`: Define a estrutura (schema) do banco de dados local (offline).
    *   `firebase.ts`: Inicializa e exporta as instâncias de conexão com os serviços do Firebase (Firestore, Auth).
    *   `types.ts`: Contém todas as definições de interface TypeScript para os dados do app (ex: `Orcamento`, `ClienteData`, `MaterialItem`). É a "fonte da verdade" para a estrutura dos dados.
    *   `utils.ts`: Funções úteis usadas em várias partes do app, como formatação de moeda, máscaras para campos de formulário (telefone, CPF/CNPJ) e funções de validação.

*   `src/services/`: **Camada de acesso e manipulação de dados.**
    *   Estes arquivos (`clientesService.ts`, `orcamentosService.ts`, etc.) contêm as funções para **salvar, editar e excluir** dados.
    *   **Importante:** Eles interagem **primeiro com o banco de dados local (Dexie)** e marcam os dados como "pendentes de sincronização" (`syncStatus: 'pending'`). O `useSync` depois se encarrega de processar essa fila e enviar os dados para o Firestore.

*   `src/hooks/`: **Lógica de React reutilizável (Custom Hooks).**
    *   `useSync.tsx`: A peça central da funcionalidade offline/online. Gerencia o estado da conexão e dispara a sincronização.
    *   `useDirtyState.tsx`: Um hook que detecta se há alterações não salvas em um formulário, para avisar o usuário antes de ele sair da página e perder o trabalho.
    *   `use-permission-dialog.tsx`: Um hook que cria um diálogo padronizado para pedir permissões ao usuário de forma consistente (ex: acesso a contatos, permissão para salvar arquivos).

Em resumo, é um aplicativo moderno e robusto com uma arquitetura **offline-first**, que prioriza a experiência do usuário permitindo o uso contínuo mesmo sem internet, e sincroniza os dados de forma inteligente e automática quando a conexão é restabelecida.
