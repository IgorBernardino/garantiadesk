-- ============================================================
-- GarantiaDesk — Schema SQL
-- Execute no Supabase SQL Editor em ordem
-- ============================================================

-- 1. LOJAS
create table lojas (
  id         serial primary key,
  nome       text not null,
  cidade     text not null,
  cor        text not null default '#185FA5'
);

insert into lojas (nome, cidade, cor) values
  ('Santos',       'Santos',       '#185FA5'),
  ('São Vicente',  'São Vicente',  '#534AB7'),
  ('Praia Grande', 'Praia Grande', '#0F6E56'),
  ('Peruíbe',      'Peruíbe',      '#854F0B'),
  ('Guarujá',      'Guarujá',      '#993556');

-- 2. USUÁRIOS (gerenciado via Supabase Auth + tabela de perfis)
create table perfis (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text not null,
  email      text not null,
  perfil     text not null check (perfil in ('consultor','gerente')),
  loja_id    int references lojas(id),   -- null = gerente (acesso total)
  criado_em  timestamptz default now()
);

-- 3. ORDENS DE SERVIÇO
create table ordens (
  id              serial primary key,
  numero          text not null unique,         -- OS-0001
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
                  check (status in ('Aberta','Em execução','Concluída','Faturada')),
  consultor_id    uuid references perfis(id),
  criado_em       timestamptz default now(),
  concluido_em    timestamptz,
  atualizado_em   timestamptz default now()
);

-- Gera número automático OS-XXXX
create or replace function gerar_numero_os()
returns trigger language plpgsql as $$
begin
  new.numero := 'OS-' || lpad(new.id::text, 4, '0');
  return new;
end;
$$;
create trigger trg_numero_os
  before insert on ordens
  for each row execute function gerar_numero_os();

-- Atualiza timestamp ao editar
create or replace function atualizar_timestamp()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  if new.status = 'Concluída' and old.status != 'Concluída' then
    new.concluido_em := now();
  end if;
  return new;
end;
$$;
create trigger trg_atualizar_os
  before update on ordens
  for each row execute function atualizar_timestamp();

-- 4. PEÇAS LIVRE DE DÉBITO
create table pecas_ldb (
  id              serial primary key,
  loja_id         int not null references lojas(id),
  ordem_id        int references ordens(id),
  protocolo       text not null,
  codigo          text not null,
  descricao       text not null,
  numero_serie    text,
  status          text not null default 'Aguardando uso'
                  check (status in ('Aguardando uso','Aplicada','Devolvida')),
  almoxarife      text,
  recebido_em     date not null default current_date,
  criado_em       timestamptz default now()
);

-- 5. NOTAS FISCAIS (vínculo manual NF x OS)
create table notas_fiscais (
  id              serial primary key,
  ordem_id        int not null unique references ordens(id),
  loja_id         int not null references lojas(id),
  numero_nf       text not null,
  emitido_em      date not null,
  valor           numeric(10,2),
  status_reembolso text not null default 'Aguardando envio'
                  check (status_reembolso in (
                    'Aguardando envio','Enviado à fábrica','Reembolso recebido')),
  criado_em       timestamptz default now()
);

-- Ao vincular NF, atualiza OS para Faturada
create or replace function marcar_os_faturada()
returns trigger language plpgsql as $$
begin
  update ordens set status = 'Faturada' where id = new.ordem_id;
  return new;
end;
$$;
create trigger trg_faturar_os
  after insert on notas_fiscais
  for each row execute function marcar_os_faturada();

-- ============================================================
-- ROW-LEVEL SECURITY — cada loja vê só seus dados
-- ============================================================
alter table ordens    enable row level security;
alter table pecas_ldb enable row level security;
alter table notas_fiscais enable row level security;
alter table perfis    enable row level security;

-- Consultores: veem/editam só a própria loja
create policy "consultor_loja_os" on ordens
  using (
    loja_id = (select loja_id from perfis where id = auth.uid())
    or exists (select 1 from perfis where id = auth.uid() and perfil = 'gerente')
  );

create policy "consultor_loja_ldb" on pecas_ldb
  using (
    loja_id = (select loja_id from perfis where id = auth.uid())
    or exists (select 1 from perfis where id = auth.uid() and perfil = 'gerente')
  );

create policy "consultor_loja_nf" on notas_fiscais
  using (
    loja_id = (select loja_id from perfis where id = auth.uid())
    or exists (select 1 from perfis where id = auth.uid() and perfil = 'gerente')
  );

create policy "perfil_proprio" on perfis
  using (id = auth.uid());

-- ============================================================
-- DADOS DE EXEMPLO (opcional — remova em produção)
-- ============================================================
-- Descomente após criar usuários reais no Supabase Auth
/*
insert into ordens (loja_id,tipo,protocolo,chassi,modelo,ano,km,cliente_nome,cliente_tel,tecnico,descricao,status) values
  (1,'Recall','RC-2025-4499','9C2JC0510RR000042','CG 160 Start',2023,15200,'Pedro Alves','(13)98111-1111','Carlos Silva','Substituição do regulador retificador conforme BT RC-2025-4499','Em execução'),
  (2,'Garantia','GT-2025-1193','9C2KC0811SR000041','Pop 110i',2022,8900,'Maria Santos','(13)97222-2222','João Melo','Troca do filtro de ar por falha de vedação','Concluída'),
  (1,'Recall','RC-2025-4482','9C2JC0510RR000040','Biz 125i',2024,3100,'José Lima','(13)96333-3333','Carlos Silva','Reprogramação da CDI conforme boletim','Faturada'),
  (3,'Garantia','GT-2025-1201','9C2JC0510PR000039','Titan 160',2023,12000,'Ana Costa','(13)95444-4444','Pedro Rocha','Substituição da pastilha de freio dianteira','Aberta'),
  (4,'Recall','RC-2025-4480','9C2JC0510RR000038','Pop 110i',2021,22000,'Lucas Ramos','(13)94555-5555','João Melo','Verificação do sistema de ignição','Concluída'),
  (5,'Garantia','GT-2025-1188','9C2KC0811SR000035','PCX 150',2024,5500,'Carla Dias','(13)93666-6666','Ana Ferreira','Ajuste da corrente de transmissão','Faturada');
*/
