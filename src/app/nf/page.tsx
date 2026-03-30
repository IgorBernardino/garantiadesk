'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Ordem, NotaFiscal, Loja, Usuario } from '@/types'
import { BadgeStatus, BadgeTipo, BadgeLoja, BadgeReembolso } from '@/components/ui/Badge'
import Topbar from '@/components/layout/Topbar'
import { fmtData, fmtMoeda } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NFPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [lojas, setLojas] = useState<Loja[]>([])
  const [ordens, setOrdens] = useState<Ordem[]>([])
  const [notas, setNotas] = useState<NotaFiscal[]>([])
  const [lojaFiltro, setLojaFiltro] = useState<number | null>(null)
  const [osVinculando, setOSVinculando] = useState<Ordem | null>(null)
  const [nfForm, setNfForm] = useState({ numero_nf: '', emitido_em: new Date().toISOString().split('T')[0], valor: '', status_reembolso: 'Aguardando envio' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: perfil } = await supabase.from('perfis').select('*, loja:lojas(*)').eq('id', user.id).single()
    if (!perfil) { router.push('/login'); return }
    setUsuario(perfil as Usuario)
    if (perfil.perfil === 'consultor') setLojaFiltro(perfil.loja_id)
    const { data: lojasData } = await supabase.from('lojas').select('*').order('id')
    setLojas((lojasData ?? []) as Loja[])
    const { data: ordensData } = await supabase.from('ordens').select('*, loja:lojas(*)').in('status', ['Concluída', 'Faturada']).order('concluido_em', { ascending: false })
    setOrdens((ordensData ?? []) as Ordem[])
    const { data: notasData } = await supabase.from('notas_fiscais').select('*')
    setNotas((notasData ?? []) as NotaFiscal[])
  }, [supabase, router])

  useEffect(() => { carregar() }, [carregar])

  function nfDaOS(osId: number) { return notas.find(n => n.ordem_id === osId) }

  async function salvarNF() {
    if (!osVinculando || !nfForm.numero_nf.trim()) { alert('Informe o número da NF.'); return }
    setSaving(true)
    const { error } = await supabase.from('notas_fiscais').insert({
      ordem_id: osVinculando.id,
      loja_id: osVinculando.loja_id,
      numero_nf: nfForm.numero_nf.trim(),
      emitido_em: nfForm.emitido_em,
      valor: nfForm.valor ? parseFloat(nfForm.valor) : null,
      status_reembolso: nfForm.status_reembolso,
    })
    if (error) { alert('Erro: ' + error.message); setSaving(false); return }
    setOSVinculando(null)
    setNfForm({ numero_nf: '', emitido_em: new Date().toISOString().split('T')[0], valor: '', status_reembolso: 'Aguardando envio' })
    setSaving(false)
    carregar()
  }

  const filtradas = ordens.filter(o => !lojaFiltro || o.loja_id === lojaFiltro)
  const semNF = filtradas.filter(o => o.status === 'Concluída' && !nfDaOS(o.id))

  if (!usuario) return <div className="min-h-screen flex items-center justify-center"><div className="text-sm text-gray-400">Carregando...</div></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar usuario={usuario} lojas={lojas} lojaFiltro={lojaFiltro}
        onLojaChange={id => { if (usuario.perfil === 'gerente') setLojaFiltro(id) }} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-5">
          <h1 className="page-title">Vínculo NF × OS</h1>
          <p className="text-xs text-gray-400 mt-0.5">Planilha mestre de controle — Nota Fiscal vinculada a cada Ordem de Serviço</p>
        </div>

        {semNF.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 mb-4">
            <span className="font-semibold">{semNF.length} OS concluída{semNF.length > 1 ? 's' : ''}</span> aguardam emissão e vínculo de NF
          </div>
        )}

        {/* Modal vínculo NF */}
        {osVinculando && (
          <div className="card p-5 mb-4 border-blue-300 border bg-blue-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-sm">Vincular NF — {osVinculando.numero}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{osVinculando.tipo} · {osVinculando.protocolo} · {osVinculando.modelo}</p>
              </div>
              <button onClick={() => setOSVinculando(null)} className="text-gray-400 hover:text-gray-700 text-lg">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Número da NF <span className="text-red-400">*</span></label>
                <input className="input" value={nfForm.numero_nf} onChange={e => setNfForm(f => ({ ...f, numero_nf: e.target.value }))} placeholder="Ex: NF 000130" autoFocus />
              </div>
              <div>
                <label className="label">Data de emissão</label>
                <input className="input" type="date" value={nfForm.emitido_em} onChange={e => setNfForm(f => ({ ...f, emitido_em: e.target.value }))} />
              </div>
              <div>
                <label className="label">Valor (R$)</label>
                <input className="input" type="number" value={nfForm.valor} onChange={e => setNfForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" />
              </div>
              <div className="col-span-2">
                <label className="label">Status do reembolso</label>
                <select className="input" value={nfForm.status_reembolso} onChange={e => setNfForm(f => ({ ...f, status_reembolso: e.target.value }))}>
                  <option>Aguardando envio</option>
                  <option>Enviado à fábrica</option>
                  <option>Reembolso recebido</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setOSVinculando(null)} className="btn">Cancelar</button>
              <button onClick={salvarNF} disabled={saving} className="btn btn-primary">{saving ? 'Salvando...' : 'Salvar vínculo'}</button>
            </div>
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th-cell w-24">OS</th>
                  {usuario.perfil === 'gerente' && !lojaFiltro && <th className="th-cell">Loja</th>}
                  <th className="th-cell w-24">Tipo</th>
                  <th className="th-cell hidden md:table-cell">Protocolo</th>
                  <th className="th-cell hidden sm:table-cell">Conclusão</th>
                  <th className="th-cell">NF</th>
                  <th className="th-cell hidden md:table-cell">Data NF</th>
                  <th className="th-cell hidden lg:table-cell">Valor</th>
                  <th className="th-cell hidden lg:table-cell">Reembolso</th>
                  <th className="th-cell w-24">Status</th>
                  <th className="th-cell w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(os => {
                  const nota = nfDaOS(os.id)
                  const pendente = os.status === 'Concluída' && !nota
                  return (
                    <tr key={os.id} className={`transition-colors ${pendente ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'}`}>
                      <td className="td-cell">
                        <Link href={`/os/${os.id}`} className="font-semibold text-blue-600 hover:underline">{os.numero}</Link>
                      </td>
                      {usuario.perfil === 'gerente' && !lojaFiltro && (
                        <td className="td-cell">{os.loja && <BadgeLoja lojaId={os.loja_id} nome={os.loja.nome} />}</td>
                      )}
                      <td className="td-cell"><BadgeTipo tipo={os.tipo} /></td>
                      <td className="td-cell hidden md:table-cell text-xs text-gray-500 font-mono">{os.protocolo}</td>
                      <td className="td-cell hidden sm:table-cell text-xs text-gray-500">{os.concluido_em ? fmtData(os.concluido_em) : '—'}</td>
                      <td className="td-cell">
                        {nota
                          ? <span className="text-xs font-semibold text-green-700">{nota.numero_nf}</span>
                          : <span className="text-xs text-red-500 font-medium">— pendente</span>
                        }
                      </td>
                      <td className="td-cell hidden md:table-cell text-xs text-gray-500">{nota ? fmtData(nota.emitido_em) : '—'}</td>
                      <td className="td-cell hidden lg:table-cell text-xs text-gray-700">{nota ? fmtMoeda(nota.valor ?? undefined) : '—'}</td>
                      <td className="td-cell hidden lg:table-cell">{nota ? <BadgeReembolso status={nota.status_reembolso} /> : '—'}</td>
                      <td className="td-cell"><BadgeStatus status={os.status} /></td>
                      <td className="td-cell">
                        {pendente && (
                          <button onClick={() => setOSVinculando(os)} className="btn btn-primary text-xs py-1 px-2">Vincular</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filtradas.length === 0 && (
                  <tr><td colSpan={11} className="td-cell text-center text-gray-400 py-10">Nenhuma OS encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
