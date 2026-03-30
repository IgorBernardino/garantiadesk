'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Ordem, Loja, Usuario, PecaLDB } from '@/types'
import { BadgeStatus, BadgeTipo, BadgeLoja } from '@/components/ui/Badge'
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

    const { data: ordensData } = await supabase
  .from('ordens')
  .select('*, loja:lojas(*)') 
  .order('criado_em', { ascending: false })
  
    const { data: pecasData } = await supabase.from('pecas_ldb').select('*, loja:lojas(*)').order('criado_em', { ascending: false })
    setPecas((pecasData ?? []) as PecaLDB[])

    setLoading(false)
  }, [supabase, router])

  useEffect(() => { carregar() }, [carregar])

  const filtradas = (!lojaFiltro || lojaFiltro === null) 
  ? ordens 
  : ordens.filter(o => Number(o.loja_id) === Number(lojaFiltro))

  
  const pecasFiltradas = lojaFiltro ? pecas.filter(p => p.loja_id === lojaFiltro) : pecas

  const qtd = (s: string) => filtradas.filter(o => o.status === s).length
  const semNF = filtradas.filter(o => o.status === 'Concluída').length
  const pecasPend = pecasFiltradas.filter(p => p.status === 'Aguardando uso').length

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-sm text-gray-400">Carregando...</div>
    </div>
  )
  if (!usuario) return null

  const isGerente = usuario.perfil === 'gerente'

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar
        usuario={usuario}
        lojas={lojas}
        lojaFiltro={lojaFiltro}
        onLojaChange={(id) => { if (usuario.perfil === 'gerente') setLojaFiltro(id) }}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Alerta NF pendente */}
        {semNF > 0 && (
          <div className="flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <span>
              <span className="font-semibold">{semNF} OS concluída{semNF > 1 ? 's' : ''}</span> aguardam emissão de Nota Fiscal
            </span>
            <Link href="/nf" className="btn btn-danger text-xs py-1 shrink-0">Ver pendências</Link>
          </div>
        )}

        {/* Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'OS em aberto', val: qtd('Aberta') + qtd('Em execução'), color: 'text-blue-600' },
            { label: 'Aguardando NF', val: semNF, color: semNF > 0 ? 'text-amber-600' : 'text-gray-900' },
            { label: 'Peças LDB pend.', val: pecasPend, color: pecasPend > 0 ? 'text-red-600' : 'text-gray-900' },
            { label: 'Faturadas', val: qtd('Faturada'), color: 'text-green-700' },
          ].map(m => (
            <div key={m.label} className="card p-4">
              <div className="text-xs text-gray-500 mb-1">{m.label}</div>
              <div className={`text-2xl font-semibold ${m.color}`}>{m.val}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Por loja (só gerente sem filtro) */}
          {isGerente && !lojaFiltro && (
            <div className="card p-5">
              <div className="section-title">Status por loja</div>
              <div className="space-y-3">
                {LOJAS_CONFIG.map(cfg => {
                  const lo = ordens.filter(o => o.loja_id === cfg.id)
                  const snf = lo.filter(o => o.status === 'Concluída').length
                  return (
                    <div key={cfg.id} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-28 shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cfg.cor }} />
                        <span className="text-sm font-medium text-gray-700 truncate">{cfg.nome}</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {[
                          { s: 'Aberta',      bg: '#E6F1FB', tc: '#0C447C' },
                          { s: 'Em execução', bg: '#FAEEDA', tc: '#633806' },
                          { s: 'Concluída',   bg: '#FCEBEB', tc: '#791F1F' },
                          { s: 'Faturada',    bg: '#EAF3DE', tc: '#27500A' },
                        ].map(({ s, bg, tc }) => {
                          const n = lo.filter(o => o.status === s).length
                          return (
                            <span key={s} className="badge text-xs" style={{ background: bg, color: tc }}>
                              {n} {s === 'Em execução' ? 'exec.' : s.toLowerCase()}
                            </span>
                          )
                        })}
                        {snf > 0 && <span className="text-xs text-red-500 font-medium">{snf} s/ NF</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* OS recentes */}
          <div className="card overflow-hidden lg:col-span-1">
            <div className="px-5 py-4 border-b border-gray-50">
              <div className="section-title mb-0">OS recentes</div>
            </div>
            <div className="divide-y divide-gray-50">
              {filtradas.slice(0, 6).map(os => (
                <Link
                  key={os.id}
                  href={`/os/${os.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isGerente && !lojaFiltro && os.loja && (
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: lojaConfig(os.loja_id).cor }} />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{os.numero}</span>
                        <BadgeTipo tipo={os.tipo} />
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {os.modelo} · {os.cliente_nome}{isGerente && !lojaFiltro && os.loja ? ` · ${os.loja.nome}` : ''}
                      </div>
                    </div>
                  </div>
                  <BadgeStatus status={os.status} />
                </Link>
              ))}
              {filtradas.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-gray-400">Nenhuma OS encontrada</div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-50">
              <Link href="/os" className="text-xs text-blue-600 hover:underline">Ver todas →</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
