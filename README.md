# GarantiaDesk

Sistema de controle de Garantia e Recall para rede de 5 concessionárias — Santos, São Vicente, Praia Grande, Peruíbe e Guarujá.

---

## Stack

- **Frontend + API**: Next.js 14 (App Router) hospedado no Vercel
- **Banco de dados**: Supabase (PostgreSQL) com Row-Level Security por loja
- **Autenticação**: Supabase Auth
- **Estilo**: Tailwind CSS

---

## Deploy passo a passo

### 1. Criar conta no Supabase

1. Acesse https://app.supabase.com e crie uma conta gratuita
2. Clique em **New project**, escolha um nome (ex: `garantiadesk`) e uma senha forte
3. Aguarde o projeto ser criado (~2 min)

### 2. Criar o banco de dados

1. No painel do Supabase, clique em **SQL Editor**
2. Cole o conteúdo do arquivo `supabase_schema.sql` e clique em **Run**
3. Confirme que as tabelas foram criadas em **Table Editor**

### 3. Criar usuários

Para cada consultor e gerente da rede:

1. Vá em **Authentication > Users > Invite user**
2. Informe o e-mail e envie o convite
3. Após o usuário aceitar, vá em **SQL Editor** e insira o perfil:

```sql
-- Consultor da loja Santos (loja_id = 1)
insert into perfis (id, nome, email, perfil, loja_id)
values (
  '<uuid do usuário em auth.users>',
  'Carlos Silva',
  'carlos@loja.com',
  'consultor',
  1  -- 1=Santos, 2=São Vicente, 3=Praia Grande, 4=Peruíbe, 5=Guarujá
);

-- Gerente regional (acesso a todas as lojas)
insert into perfis (id, nome, email, perfil, loja_id)
values (
  '<uuid do usuário em auth.users>',
  'João Gerente',
  'joao@rede.com',
  'gerente',
  null  -- null = acesso total
);
```

> O UUID está em Authentication > Users, coluna "UID".

### 4. Obter as chaves do Supabase

1. Vá em **Settings > API**
2. Copie:
   - **Project URL** → será `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 5. Subir o código no GitHub

```bash
# Na pasta do projeto
git init
git add .
git commit -m "feat: GarantiaDesk v1.0"

# Criar repositório em github.com e conectar
git remote add origin https://github.com/SEU_USUARIO/garantiadesk.git
git push -u origin main
```

### 6. Deploy no Vercel

1. Acesse https://vercel.com e faça login com sua conta GitHub
2. Clique em **Add New > Project**
3. Selecione o repositório `garantiadesk`
4. Na seção **Environment Variables**, adicione:

| Nome | Valor |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | sua URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sua anon key do Supabase |

5. Clique em **Deploy**
6. Aguarde ~1 minuto — o sistema estará disponível em `https://garantiadesk.vercel.app`

---

## Estrutura do projeto

```
src/
├── app/
│   ├── dashboard/     # Painel principal com métricas
│   ├── os/            # Lista de OS + nova OS + detalhe
│   │   ├── page.tsx
│   │   ├── nova/
│   │   └── [id]/
│   ├── ldb/           # Controle de peças livre de débito
│   ├── nf/            # Vínculo NF × OS
│   └── login/
├── components/
│   ├── layout/        # Topbar com seletor de loja
│   └── ui/            # Badges de status, tipo, loja
├── lib/
│   ├── supabase.ts    # Cliente Supabase
│   └── utils.ts       # Constantes e helpers
└── types/             # Tipos TypeScript
```

---

## IDs das lojas

| ID | Loja |
|----|------|
| 1 | Santos |
| 2 | São Vicente |
| 3 | Praia Grande |
| 4 | Peruíbe |
| 5 | Guarujá |

---

## Perfis de acesso

| Perfil | Acesso |
|--------|--------|
| `consultor` | Vê e edita somente a própria loja |
| `gerente` | Vê todas as lojas, pode filtrar por unidade |

---

## Funcionalidades

- **Dashboard**: métricas por loja, alertas de OS sem NF, OS recentes
- **Ordens de Serviço**: abertura guiada em 6 passos, checklist de encerramento, atualização de status
- **Peças LDB**: registro de peças livre de débito sem lançamento no Dealer Net
- **Vínculo NF × OS**: planilha mestre com vínculo manual de NF a cada OS concluída
- **Multi-loja**: separação por Row-Level Security — consultor vê apenas sua loja
- **Responsivo**: funciona no celular e computador

---

## Atualizar o sistema

Qualquer alteração no código enviada ao GitHub é publicada automaticamente no Vercel em ~1 minuto.
