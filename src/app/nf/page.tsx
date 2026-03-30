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
  const [nfForm, setNfForm] = useState({ 
    numero_nf: '', 
    emitido_em: new Date().toISOString().split('T')[0], 
    valor: '', 
    status_reembolso: 'Aguardando envio' 
  })
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

    const { data: l } = await supabase.from('lojas').select('*').order('id')
    setLojas((l ?? []) as Loja[])

    const { data: o } = await supabase.from('ordens').select('*, loja:lojas(*)').order('concluido_em', { ascending: false })
    setOrdens((o ?? []) as Ordem[])

    const { data: n } = await supabase.from('notas_fiscais').select('*')
    setNotas((n ?? []) as NotaFiscal[])
  }, [supabase, router])

  useEffect(() => { carregar() }, [carregar])

  const salvarNF = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!osVinculando) return
    setSaving(true)
    
    const { error: errNF } = await supabase.from('notas_fiscais').insert([{
      ordem_id: osVinculando.id,
      numero_nf: nfForm.numero_nf,
      emitido_em: nfForm.emitido_em,
      valor: parseFloat(nfForm.valor),
      status_reembolso: nfForm.status_reembolso
    }])

    if (!errNF) {
      await supabase.from('ordens').update({ status: 'Faturada' }).eq('id', osVinculando.id)
      setOSVinculando(null)
      carregar()
    }
    setSaving(false)
  }

  const filtradas = lojaFiltro ? ordens.filter(o => o.loja_id === lojaFiltro) : ordens

  if (!usuario) return null

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Topbar 
        usuario={usuario} 
        lojas={lojas} 
        lojaFiltro={lojaFiltro} 
        onLojaChange={(id) => usuario.perfil === 'gerente' && setLojaFiltro(id)} 
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Faturamento e Notas</h1>
          <p className="text-sm text-slate-500 font-medium">Controlo de reembolsos e vínculos de NF para as unidades da Baixada</p>
        </div>

        {/* Tabela de Gestão de Notas */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Ordem de Serviço</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Unidade</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente / Modelo</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Nota Fiscal</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Reembolso</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map(os => {
                  const nota = notas.find(n => n.ordem_id === os.id)
                  const pendente = os.status === 'Concluída' && !nota

                  return (
                    <tr key={os.id} className={`group hover:bg-slate-50/50 transition-colors ${pendente ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{os.numero}</span>
                          <div className="mt-1"><BadgeTipo tipo={os.tipo} /></div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {os.loja && <BadgeLoja lojaId={os.loja_id} nome={os.loja.nome} />}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 truncate max-w-[180px]">{os.cliente_nome}</span>
                          <span className="text-[10px] text-slate-400 font-medium italic">{os.modelo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {nota ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">{nota.numero_nf}</span>
                            <span className="text-[9px] text-slate-400 mt-1 font-bold">{fmtData(nota.emitido_em)}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-black uppercase text-red-500 bg-red-50 px-2 py-1 rounded animate-pulse">Pendente</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {nota ? (
                          <div className="flex flex-col gap-1">
                            <BadgeReembolso status={nota.status_reembolso} />
                            <span className="text-xs font-black text-slate-800 tracking-tighter">{fmtMoeda(nota.valor ?? 0)}</span>
                          </div>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {pendente ? (
                          <button 
                            onClick={() => setOSVinculando(os)} 
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-lg shadow-md transition-all active:scale-95"
                          >
                            Vincular NF
                          </button>
                        ) : (
                          <BadgeStatus status={os.status} />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal de Vinculação de NF */}
      {osVinculando && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Vincular Nota Fiscal</h2>
              <p className="text-xs text-slate-500 mt-1">OS: <span className="text-blue-600 font-bold">{osVinculando.numero}</span> - {osVinculando.cliente_nome}</p>
            </div>
            
            <form onSubmit={salvarNF} className="p-6 space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Número da NF</label>
                <input required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20" value={nfForm.numero_nf} onChange={e=>setNfForm({...nfForm, numero_nf: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Valor Bruto</label>
                  <input required type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20" value={nfForm.valor} onChange={e=>setNfForm({...nfForm, valor: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Data de Emissão</label>
                  <input required type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20" value={nfForm.emitido_em} onChange={e=>setNfForm({...nfForm, emitido_em: e.target.value})} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOSVinculando(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest py-3 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest py-3 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
                  {saving ? 'A Processar...' : 'Confirmar Faturamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}