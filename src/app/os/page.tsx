'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Ordem, Loja, Usuario, StatusOS, TipoOS } from '@/types'
import { BadgeStatus, BadgeTipo, BadgeLoja } from '@/components/ui/Badge'
import Topbar from '@/components/layout/Topbar'
import { fmtData, lojaConfig } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
    const { data: lojasData } = await supabase.from('lojas').select('*').order('id')
    setLojas((lojasData ?? []) as Loja[])
    const { data: ordensData } = await supabase.from('ordens').select('*, loja:lojas(*)').order('criado_em', { ascending: false })
    setOrdens((ordensData ?? []) as Ordem[])
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { carregar() }, [carregar])

  const filtradas = ordens.filter(o =>
    (!lojaFiltro || o.loja_id === lojaFiltro) &&
    (!filtroStatus || o.status === filtroStatus) &&
    (!filtroTipo || o.tipo === filtroTipo)
  )

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-sm text-gray-400">Carregando...</div></div>
  if (!usuario) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar usuario={usuario} lojas={lojas} lojaFiltro={lojaFiltro}
        onLojaChange={id => { if (usuario.perfil === 'gerente') setLojaFiltro(id) }} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="page-title">Ordens de Serviço</h1>
            <p className="text-xs text-gray-400 mt-0.5">{filtradas.length} ordens encontradas</p>
          </div>
          <Link href="/os/nova" className="btn btn-primary">+ Nova OS</Link>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <select className="input w-auto text-xs" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as StatusOS | '')}>
            <option value="">Todos os status</option>
            <option value="Aberta">Aberta</option>
            <option value="Em execução">Em execução</option>
            <option value="Concluída">Concluída</option>
            <option value="Faturada">Faturada</option>
          </select>
          <select className="input w-auto text-xs" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as TipoOS | '')}>
            <option value="">Recall + Garantia</option>
            <option value="Recall">Recall</option>
            <option value="Garantia">Garantia</option>
          </select>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th-cell w-24">Nº OS</th>
                  {usuario.perfil === 'gerente' && !lojaFiltro && <th className="th-cell">Loja</th>}
                  <th className="th-cell w-24">Tipo</th>
                  <th className="th-cell">Protocolo</th>
                  <th className="th-cell hidden md:table-cell">Modelo</th>
                  <th className="th-cell hidden lg:table-cell">Cliente</th>
                  <th className="th-cell hidden md:table-cell">Técnico</th>
                  <th className="th-cell">Status</th>
                  <th className="th-cell hidden sm:table-cell">Abertura</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(os => (
                  <tr
                    key={os.id}
                    onClick={() => router.push(`/os/${os.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="td-cell font-semibold text-blue-600">{os.numero}</td>
                    {usuario.perfil === 'gerente' && !lojaFiltro && (
                      <td className="td-cell">
                        {os.loja && <BadgeLoja lojaId={os.loja_id} nome={os.loja.nome} />}
                      </td>
                    )}
                    <td className="td-cell"><BadgeTipo tipo={os.tipo} /></td>
                    <td className="td-cell text-gray-500 text-xs font-mono">{os.protocolo}</td>
                    <td className="td-cell hidden md:table-cell text-gray-700">{os.modelo}</td>
                    <td className="td-cell hidden lg:table-cell text-gray-700">{os.cliente_nome}</td>
                    <td className="td-cell hidden md:table-cell text-gray-500">{os.tecnico}</td>
                    <td className="td-cell"><BadgeStatus status={os.status} /></td>
                    <td className="td-cell hidden sm:table-cell text-gray-400 text-xs">{fmtData(os.criado_em)}</td>
                  </tr>
                ))}
                {filtradas.length === 0 && (
                  <tr><td colSpan={9} className="td-cell text-center text-gray-400 py-10">Nenhuma OS encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
