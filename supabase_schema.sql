-- ============================================================
-- GarantiaDesk — Schema SQL v1.1
-- MUDANCAS v1.1:
--   - Numero da OS e informado pelo consultor (sem trigger)
--   - RLS corrigido com funcoes security definer
--   - Vinculo de NF feito pelo consultor na tela de detalhe
-- ============================================================

create table lojas (
  id    serial primary key,
  nome  text not null,
  cidade text not null,
  cor   text not null default '#185FA5'
);

insert into lojas (nome, cidade, cor) values
  ('Santos',       'Santos',       '#185FA5'),
  ('Sao Vicente',  'Sao Vicente',  '#534AB7'),
  ('Praia Grande', 'Praia Grande', '#0F6E56'),
  ('Peruibe',      'Peruibe',      '#854F0B'),
  ('Guaruja',      'Guaruja',      '#993556');

create table perfis (
  id        uuid primary key references auth.users(id) on delete cascade,
  nome      text not null,
  email     text not null,
  perfil    text not null check (perfil in ('consultor','gerente')),
  loja_id   int references lojas(id),
  criado_em timestamptz default now()
);

-- numero preenchido pelo consultor
create table ordens (
  id              serial primary key,
  numero          text not null,
  loja_id         int not null references lojas(id),
  tipo            text not null check (tipo in ('Recall','Garantia')),
  protocolo       text not null,
  chassi          text not null,
  modelo          text not null,
  ano             int,
  km              int,
  cliente_nome    text not null,
  cliente_tel     text,
  tecnico         text not null,
  tempo_previsto  numeric(4,1),
  descricao       text not null,
  observacoes     text,
  status          text not null default 'Aberta'
                  check (status in ('Aberta','Em execucao','Concluida','Faturada')),
  consultor_id    uuid references perfis(id),
  criado_em       timestamptz default now(),
  concluido_em    timestamptz,
  atualizado_em   timestamptz default now()
);

create or replace function atualizar_timestamp()
returns trigger language plpgsql security definer as $$
begin
  new.atualizado_em := now();
  if new.status = 'Concluida' and old.status != 'Concluida' then
    new.concluido_em := now();
  end if;
  return new;
end;
$$;
create trigger trg_atualizar_os
  before update on ordens
  for each row execute function atualizar_timestamp();

create table pecas_ldb (
  id           serial primary key,
  loja_id      int not null references lojas(id),
  ordem_id     int references ordens(id),
  protocolo    text not null,
  codigo       text not null,
  descricao    text not null,
  numero_serie text,
  status       text not null default 'Aguardando uso'
               check (status in ('Aguardando uso','Aplicada','Devolvida')),
  almoxarife   text,
  recebido_em  date not null default current_date,
  criado_em    timestamptz default now()
);

-- NF vinculada pelo consultor na tela da OS
create table notas_fiscais (
  id               serial primary key,
  ordem_id         int not null unique references ordens(id),
  loja_id          int not null references lojas(id),
  numero_nf        text not null,
  emitido_em       date not null,
  valor            numeric(10,2),
  status_reembolso text not null default 'Aguardando envio'
                   check (status_reembolso in (
                     'Aguardando envio','Enviado a fabrica','Reembolso recebido')),
  criado_em        timestamptz default now()
);

create or replace function marcar_os_faturada()
returns trigger language plpgsql security definer as $$
begin
  update ordens set status = 'Faturada' where id = new.ordem_id;
  return new;
end;
$$;
create trigger trg_faturar_os
  after insert on notas_fiscais
  for each row execute function marcar_os_faturada();

-- ============================================================
-- RLS v1.1 — funcoes security definer evitam recursao
-- ============================================================

-- Retorna o loja_id do usuario atual (sem passar pelo RLS de perfis)
create or replace function get_meu_loja_id()
returns int language sql security definer stable as $$
  select loja_id from perfis where id = auth.uid()
$$;

-- Retorna true se o usuario logado e gerente
create or replace function sou_gerente()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from perfis where id = auth.uid() and perfil = 'gerente'
  )
$$;

alter table ordens        enable row level security;
alter table pecas_ldb     enable row level security;
alter table notas_fiscais enable row level security;
alter table perfis        enable row level security;

create policy "loja_os" on ordens
  using ( sou_gerente() or loja_id = get_meu_loja_id() );

create policy "loja_ldb" on pecas_ldb
  using ( sou_gerente() or loja_id = get_meu_loja_id() );

create policy "loja_nf" on notas_fiscais
  using ( sou_gerente() or loja_id = get_meu_loja_id() );

create policy "perfil_proprio" on perfis
  using (id = auth.uid());
