'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { PecaLDB, Loja, Usuario } from '@/types'
import { BadgeLoja } from '@/components/ui/Badge'
import Topbar from '@/components/layout/Topbar'
import { fmtData } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export default function LDBPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [lojas, setLojas] = useState<Loja[]>([])
  const [pecas, setPecas] = useState<PecaLDB[]>([])
  const [lojaFiltro, setLojaFiltro] = useState<number | null>(null)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    loja_id: 0, protocolo: '', codigo: '', descricao: '',
    numero_serie: '', recebido_em: new Date().toISOString().split('T')[0],
    almoxarife: '', status: 'Aguardando uso', ordem_id: '',
  })
  const supabase = createClient()
  const router = useRouter()

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: perfil } = await supabase.from('perfis').select('*, loja:lojas(*)').eq('id', user.id).single()
    if (!perfil) { router.push('/login'); return }
    setUsuario(perfil as Usuario)
    if (perfil.perfil === 'consultor') {
      setLojaFiltro(perfil.loja_id)
      setForm(f => ({ ...f, loja_id: perfil.loja_id! }))
    }
    const { data: lojasData } = await supabase.from('lojas').select('*').order('id')
    setLojas((lojasData ?? []) as Loja[])
    const { data: pecasData } = await supabase.from('pecas_ldb').select('*, loja:lojas(*)').order('criado_em', { ascending: false })
    setPecas((pecasData ?? []) as PecaLDB[])
  }, [supabase, router])

  useEffect(() => { carregar() }, [carregar])

  function set(k: string, v: string | number) { setForm(f => ({ ...f, [k]: v })) }

  async function salvar() {
    if (!form.loja_id || !form.codigo.trim() || !form.descricao.trim() || !form.protocolo.trim()) {
      alert('Preencha loja, protocolo, código e descrição.'); return
    }
    setSaving(true)
    await supabase.from('pecas_ldb').insert({
      loja_id: form.loja_id,
      protocolo: form.protocolo.trim(),
      codigo: form.codigo.trim().toUpperCase(),
      descricao: form.descricao.trim(),
      numero_serie: form.numero_serie.trim() || null,
      recebido_em: form.recebido_em,
      almoxarife: form.almoxarife.trim() || null,
      status: form.status,
      ordem_id: form.ordem_id ? parseInt(form.ordem_id) : null,
    })
    setShowForm(false)
    setSaving(false)
    carregar()
  }

  const filtradas = pecas.filter(p =>
    (!lojaFiltro || p.loja_id === lojaFiltro) &&
    (!filtroStatus || p.status === filtroStatus)
  )
  const pendentes = filtradas.filter(p => p.status === 'Aguardando uso').length

  if (!usuario) return <div className="min-h-screen flex items-center justify-center"><div className="text-sm text-gray-400">Carregando...</div></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar usuario={usuario} lojas={lojas} lojaFiltro={lojaFiltro}
        onLojaChange={id => { if (usuario.perfil === 'gerente') setLojaFiltro(id) }} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div>
            <h1 className="page-title">Peças Livre de Débito</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Controle externo ao Dealer Net — {pendentes > 0 && <span className="text-amber-600 font-medium">{pendentes} aguardando uso</span>}
            </p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">+ Registrar peça LDB</button>
        </div>

        {pendentes > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 mb-4">
            {pendentes} peça{pendentes > 1 ? 's' : ''} aguardando uso — verifique se há OS aberta para cada protocolo
          </div>
        )}

        {showForm && (
          <div className="card p-5 mb-4 border-blue-200 border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">Registrar nova peça LDB</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {usuario.perfil === 'gerente' && (
                <div>
                  <label className="label">Loja <span className="text-red-400">*</span></label>
                  <select className="input" value={form.loja_id} onChange={e => set('loja_id', parseInt(e.target.value))}>
                    <option value={0}>Selecione</option>
                    {lojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Protocolo <span className="text-red-400">*</span></label>
                <input className="input" value={form.protocolo} onChange={e => set('protocolo', e.target.value)} placeholder="RC-2025-4510" />
              </div>
              <div>
                <label className="label">Código da peça <span className="text-red-400">*</span></label>
                <input className="input font-mono" value={form.codigo} onChange={e => set('codigo', e.target.value.toUpperCase())} placeholder="31100-K97-V41" />
              </div>
              <div>
                <label className="label">Descrição <span className="text-red-400">*</span></label>
                <input className="input" value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Ex: Regulador retificador" />
              </div>
              <div>
                <label className="label">Nº de série</label>
                <input className="input" value={form.numero_serie} onChange={e => set('numero_serie', e.target.value)} placeholder="Se houver" />
              </div>
              <div>
                <label className="label">Data de recebimento</label>
                <input className="input" type="date" value={form.recebido_em} onChange={e => set('recebido_em', e.target.value)} />
              </div>
              <div>
                <label className="label">Almoxarife</label>
                <input className="input" value={form.almoxarife} onChange={e => set('almoxarife', e.target.value)} placeholder="Nome" />
              </div>
              <div>
                <label className="label">OS vinculada</label>
                <input className="input" value={form.ordem_id} onChange={e => set('ordem_id', e.target.value)} placeholder="ID da OS (se houver)" />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option>Aguardando uso</option>
                  <option>Aplicada</option>
                  <option>Devolvida</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="btn">Cancelar</button>
              <button onClick={salvar} disabled={saving} className="btn btn-primary">{saving ? 'Salvando...' : 'Registrar entrada'}</button>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <select className="input w-auto text-xs" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option>Aguardando uso</option>
            <option>Aplicada</option>
            <option>Devolvida</option>
          </select>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {usuario.perfil === 'gerente' && !lojaFiltro && <th className="th-cell">Loja</th>}
                  <th className="th-cell">Código</th>
                  <th className="th-cell">Descrição</th>
                  <th className="th-cell hidden md:table-cell">Protocolo</th>
                  <th className="th-cell hidden lg:table-cell">OS vinculada</th>
                  <th className="th-cell hidden md:table-cell">Recebida em</th>
                  <th className="th-cell hidden lg:table-cell">Almoxarife</th>
                  <th className="th-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    {usuario.perfil === 'gerente' && !lojaFiltro && (
                      <td className="td-cell">{p.loja && <BadgeLoja lojaId={p.loja_id} nome={p.loja.nome} />}</td>
                    )}
                    <td className="td-cell font-mono text-xs font-semibold">{p.codigo}</td>
                    <td className="td-cell text-gray-700">{p.descricao}</td>
                    <td className="td-cell hidden md:table-cell text-xs text-gray-500 font-mono">{p.protocolo}</td>
                    <td className="td-cell hidden lg:table-cell text-xs text-gray-500">{p.ordem_id ?? '—'}</td>
                    <td className="td-cell hidden md:table-cell text-xs text-gray-500">{fmtData(p.recebido_em)}</td>
                    <td className="td-cell hidden lg:table-cell text-xs text-gray-500">{p.almoxarife ?? '—'}</td>
                    <td className="td-cell">
                      <span className={`badge text-xs ${p.status === 'Aplicada' ? 'bg-green-50 text-green-700' : p.status === 'Devolvida' ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-700'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtradas.length === 0 && (
                  <tr><td colSpan={8} className="td-cell text-center text-gray-400 py-10">Nenhuma peça LDB registrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
