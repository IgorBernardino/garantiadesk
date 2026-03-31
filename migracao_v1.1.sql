-- ============================================================
-- GarantiaDesk — MIGRACAO v1.1
-- Execute no Supabase SQL Editor se o banco JA EXISTE
-- Corrige 3 problemas:
--   1. Remove trigger de número automático (consultor preenche)
--   2. Corrige RLS que impedia OS de outras lojas no painel geral
--   3. Garante que NF pode ser vinculada pelo consultor
-- ============================================================

-- 1. Remove o trigger de número automático (se existir)
drop trigger if exists trg_numero_os on ordens;
drop function if exists gerar_numero_os();

-- O campo "numero" agora é texto livre preenchido pelo consultor.
-- Se quiser manter os números existentes, não precisa fazer nada.
-- Se quiser limpar o unique constraint antigo:
-- alter table ordens drop constraint if exists ordens_numero_key;

-- 2. Remove as policies antigas com sub-select direto em perfis
--    (causavam recursão e impediam gerente de ver outras lojas)
drop policy if exists "consultor_loja_os"   on ordens;
drop policy if exists "consultor_loja_ldb"  on pecas_ldb;
drop policy if exists "consultor_loja_nf"   on notas_fiscais;
drop policy if exists "loja_os"             on ordens;
drop policy if exists "loja_ldb"            on pecas_ldb;
drop policy if exists "loja_nf"             on notas_fiscais;

-- 3. Cria funcoes auxiliares com security definer
--    Rodam com permissao do criador, sem passar pelo RLS de perfis
--    Isso evita o loop: policy -> query perfis -> policy -> ...
create or replace function get_meu_loja_id()
returns int language sql security definer stable as $$
  select loja_id from perfis where id = auth.uid()
$$;

create or replace function sou_gerente()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from perfis where id = auth.uid() and perfil = 'gerente'
  )
$$;

-- 4. Recria policies usando as funcoes acima
create policy "loja_os" on ordens
  using ( sou_gerente() or loja_id = get_meu_loja_id() );

create policy "loja_ldb" on pecas_ldb
  using ( sou_gerente() or loja_id = get_meu_loja_id() );

create policy "loja_nf" on notas_fiscais
  using ( sou_gerente() or loja_id = get_meu_loja_id() );

-- 5. Atualiza a funcao de timestamp para usar security definer tambem
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

create or replace function marcar_os_faturada()
returns trigger language plpgsql security definer as $$
begin
  update ordens set status = 'Faturada' where id = new.ordem_id;
  return new;
end;
$$;

-- Verificacao: rode estas queries para confirmar que a migracao funcionou
-- SELECT * FROM ordens;                    -- deve retornar todas as lojas para o gerente
-- SELECT sou_gerente();                    -- deve retornar true se voce for gerente
-- SELECT get_meu_loja_id();               -- deve retornar o id da sua loja (ou null se gerente)
