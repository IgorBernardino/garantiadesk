'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Ordem, Loja, Usuario, PecaLDB } from '@/types'
import { BadgeStatus, BadgeTipo } from '@/components/ui/Badge'
import Topbar from '@/components/layout/Topbar'
import { fmtData, lojaConfig, LOJAS_CONFIG } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DashboardPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [lojas, setLojas] = useState<Loja[]>([])
  const [ordens, setOrdens] = useState<Ordem[]>([])
  const [pecas, setPecas] = useState<PecaLDB[]>([])
  const [lojaFiltro, setLojaFiltro] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
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

    const { data: ordensData } = await supabase.from('ordens').select('*, loja:lojas(*), nota_fiscal:notas_fiscais(*)').order('criado_em', { ascending: false })
    setOrdens((ordensData ?? []) as Ordem[])

    const { data: pecasData } = await supabase.from('pecas_ldb').select('*, loja:lojas(*)').order('criado_em', { ascending: false })
    setPecas((pecasData ?? []) as PecaLDB[])

    setLoading(false)
  }, [supabase, router])

  useEffect(() => { carregar() }, [carregar])

  const filtradas = lojaFiltro ? ordens.filter(o => o.loja_id === lojaFiltro) : ordens
  const pecasFiltradas = lojaFiltro ? pecas.filter(p => p.loja_id === lojaFiltro) : pecas

  const qtd = (s: string) => filtradas.filter(o => o.status === s).length
  const semNF = filtradas.filter(o => o.status === 'Concluída').length
  const pecasPend = pecasFiltradas.filter(p => p.status === 'Aguardando uso').length

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <div className="text-xs font-medium text-gray-400 uppercase tracking-widest">Carregando Painel...</div>
      </div>
    </div>
  )
  if (!usuario) return null

  const isGerente = usuario.perfil === 'gerente'

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Topbar
        usuario={usuario}
        lojas={lojas}
        lojaFiltro={lojaFiltro}
        onLojaChange={(id) => { if (usuario.perfil === 'gerente') setLojaFiltro(id) }}
      />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Alerta NF pendente */}
        {semNF > 0 && (
          <div className="flex items-center justify-between gap-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-5 py-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              </div>
              <span className="text-sm text-amber-900">
                Atenção: <span className="font-bold">{semNF} OS concluída{semNF > 1 ? 's' : ''}</span> aguardam emissão de nota fiscal.
              </span>
            </div>
            <Link href="/nf" className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase tracking-wider py-2 px-4 rounded-lg transition-colors">Resolver agora</Link>
          </div>
        )}

        {/* Métricas Modernizadas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {[
            { label: 'OS em aberto', val: qtd('Aberta') + qtd('Em execução'), color: 'text-blue-600', border: 'border-l-blue-500' },
            { label: 'Aguardando NF', val: semNF, color: semNF > 0 ? 'text-amber-600' : 'text-slate-400', border: 'border-l-amber-500' },
            { label: 'Peças LDB pend.', val: pecasPend, color: pecasPend > 0 ? 'text-red-600' : 'text-slate-400', border: 'border-l-red-500' },
            { label: 'Faturadas', val: qtd('Faturada'), color: 'text-emerald-700', border: 'border-l-emerald-500' },
          ].map(m => (
            <div key={m.label} className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-100 ${m.border} border-l-4 transition-all hover:shadow-md hover:-translate-y-1 group`}>
              <div className="text-[10px] uppercase tracking-[0.15em] font-black text-slate-400 mb-1.5 group-hover:text-slate-500 transition-colors">{m.label}</div>
              <div className={`text-3xl font-black tracking-tight ${m.color}`}>{m.val}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Status por loja (Exclusivo Gerente) */}
          {isGerente && !lojaFiltro && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Desempenho por Unidade</h3>
                <div className="h-1 w-12 bg-blue-600 rounded-full" />
              </div>
              <div className="space-y-5">
                {LOJAS_CONFIG.map(cfg => {
                  const lo = ordens.filter(o => o.loja_id === cfg.id)
                  const snf = lo.filter(o => o.status === 'Concluída').length
                  return (
                    <div key={cfg.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                      <div className="flex items-center gap-3 w-32 shrink-0">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: cfg.cor }} />
                        <span className="text-sm font-bold text-slate-700 truncate">{cfg.nome}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap items-center">
                        {[
                          { s: 'Aberta',      bg: 'bg-blue-50',   tc: 'text-blue-700' },
                          { s: 'Em execução', bg: 'bg-amber-50',  tc: 'text-amber-700' },
                          { s: 'Concluída',   bg: 'bg-red-50',    tc: 'text-red-700' },
                          { s: 'Faturada',    bg: 'bg-emerald-50', tc: 'text-emerald-700' },
                        ].map(({ s, bg, tc }) => {
                          const n = lo.filter(o => o.status === s).length
                          return (
                            <span key={s} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tighter ${bg} ${tc}`}>
                              {n} {s === 'Em execução' ? 'exec.' : s.toLowerCase()}
                            </span>
                          )
                        })}
                        {snf > 0 && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-md font-black animate-pulse">{snf} S/ NF</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Seção OS Recentes (Opção B) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden lg:col-span-1 flex flex-col">
            <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Últimas Movimentações</h3>
              <Link href="/os" className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-full transition-all">Ver Histórico</Link>
            </div>
            
            <div className="divide-y divide-slate-50 overflow-y-auto max-h-[500px]">
              {filtradas.length > 0 ? (
                filtradas.slice(0, 8).map(os => (
                  <Link
                    key={os.id}
                    href={`/os/${os.id}`}
                    className="group flex items-center justify-between px-6 py-5 hover:bg-slate-50/80 transition-all border-l-4 border-transparent hover:border-blue-500"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Avatar do Cliente */}
                      <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner border border-slate-200">
                        {os.cliente_nome.substring(0, 2).toUpperCase()}
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">{os.numero}</span>
                          <BadgeTipo tipo={os.tipo} />
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                          <span className="text-slate-800 font-bold">{os.modelo}</span>
                          <span className="text-slate-300">•</span>
                          <span className="truncate max-w-[120px]">{os.cliente_nome}</span>
                          {isGerente && !lojaFiltro && os.loja && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="flex items-center gap-1 font-bold text-slate-400 italic">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: lojaConfig(os.loja_id).cor }} />
                                {os.loja.nome}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 shrink-0">
                       <BadgeStatus status={os.status} />
                       <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">{fmtData(os.criado_em)}</span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                   <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6"/><path d="M9 11h6"/><path d="M9 19h6"/></svg>
                   </div>
                   <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhuma OS encontrada</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}