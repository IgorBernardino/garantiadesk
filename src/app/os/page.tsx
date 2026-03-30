'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Ordem, Loja, Usuario, StatusOS, TipoOS } from '@/types'
import { BadgeStatus, BadgeTipo, BadgeLoja } from '@/components/ui/Badge'
import Topbar from '@/components/layout/Topbar'
import { fmtData, lojaConfig } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export default function OSPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [lojas, setLojas] = useState<Loja[]>([])
  const [ordens, setOrdens] = useState<Ordem[]>([])
  const [lojaFiltro, setLojaFiltro] = useState<number | null>(null)
  const [filtroStatus, setFiltroStatus] = useState<StatusOS | ''>('')
  const [filtroTipo, setFiltroTipo] = useState<TipoOS | ''>('')
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

    const { data: l } = await supabase.from('lojas').select('*').order('id')
    setLojas((l ?? []) as Loja[])

    const { data: o } = await supabase.from('ordens').select('*, loja:lojas(*)').order('criado_em', { ascending: false })
    setOrdens((o ?? []) as Ordem[])
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { carregar() }, [carregar])

  const filtradas = ordens.filter(o => {
    const mLoja = !lojaFiltro || o.loja_id === lojaFiltro
    const mStatus = !filtroStatus || o.status === filtroStatus
    const mTipo = !filtroTipo || o.tipo === filtroTipo
    return mLoja && mStatus && mTipo
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="animate-pulse flex flex-col items-center gap-3">
        <div className="h-8 w-32 bg-slate-200 rounded-full mb-2" />
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Ordens...</div>
      </div>
    </div>
  )

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
        {/* Cabeçalho e Filtros Rápidos */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Gestão de Garantias</h1>
            <p className="text-sm text-slate-500 font-medium">Listagem completa de processos ativos e faturados</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <select 
              value={filtroTipo} 
              onChange={e => setFiltroTipo(e.target.value as any)}
              className="bg-white border border-slate-200 text-slate-600 text-[10px] font-black rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 uppercase tracking-widest shadow-sm"
            >
              <option value="">Todos os Tipos</option>
              <option value="Recall">Recall</option>
              <option value="Garantia">Garantia</option>
            </select>

            <select 
              value={filtroStatus} 
              onChange={e => setFiltroStatus(e.target.value as any)}
              className="bg-white border border-slate-200 text-slate-600 text-[10px] font-black rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 uppercase tracking-widest shadow-sm"
            >
              <option value="">Todos os Status</option>
              <option value="Aberta">Aberta</option>
              <option value="Em execução">Em execução</option>
              <option value="Concluída">Concluída</option>
              <option value="Faturada">Faturada</option>
            </select>

            <button 
              onClick={() => router.push('/os/novo')}
              className="bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95"
            >
              + Abrir Ordem
            </button>
          </div>
        </div>

        {/* Listagem Estilo Opção B */}
        <div className="space-y-3">
          {filtradas.length > 0 ? (
            filtradas.map(os => (
              <div 
                key={os.id}
                onClick={() => router.push(`/os/${os.id}`)}
                className="group bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer border-l-4"
                style={{ borderLeftColor: os.status === 'Faturada' ? '#10b981' : os.status === 'Concluída' ? '#ef4444' : '#3b82f6' }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Avatar Cliente */}
                  <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-50 text-[11px] font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all border border-slate-100">
                    {os.cliente_nome.substring(0, 2).toUpperCase()}
                  </div>
                  
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors tracking-tighter">
                        {os.numero}
                      </span>
                      <BadgeTipo tipo={os.tipo} />
                      <span className="text-[10px] font-mono text-slate-400 font-bold hidden md:block">#{os.protocolo}</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-500">
                      <span className="text-slate-800">{os.modelo}</span>
                      <span className="text-slate-300">•</span>
                      <span className="truncate max-w-[150px]">{os.cliente_nome}</span>
                      {usuario.perfil === 'gerente' && !lojaFiltro && os.loja && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1.5 font-bold italic text-slate-400">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: lojaConfig(os.loja_id).cor }} />
                            {os.loja.nome}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-8 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-50">
                  <div className="flex flex-col items-start md:items-end">
                    <span className="text-[9px] uppercase font-black text-slate-300 tracking-widest">Técnico Responsável</span>
                    <span className="text-[11px] font-bold text-slate-600 uppercase">{os.tecnico}</span>
                  </div>
                  
                  <div className="flex flex-col items-start md:items-end min-w-[100px]">
                    <BadgeStatus status={os.status} />
                    <span className="text-[9px] font-black text-slate-300 mt-1 uppercase tracking-tighter">{fmtData(os.criado_em)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6"/><path d="M9 11h6"/><path d="M9 19h6"/></svg>
              </div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhuma ordem encontrada com estes filtros</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}