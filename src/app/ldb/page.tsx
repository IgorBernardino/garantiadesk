'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { PecaLDB, Loja, Usuario } from '@/types'
import { BadgeLoja } from '@/components/ui/Badge'
import Topbar from '@/components/layout/Topbar'
import { fmtData, LOJAS_CONFIG } from '@/lib/utils'
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
    if (perfil.perfil === 'consultor') setLojaFiltro(perfil.loja_id)

    const { data: l } = await supabase.from('lojas').select('*').order('id')
    setLojas((l ?? []) as Loja[])

    const { data: p } = await supabase.from('pecas_ldb').select('*, loja:lojas(*)').order('criado_em', { ascending: false })
    setPecas((p ?? []) as PecaLDB[])
  }, [supabase, router])

  useEffect(() => { carregar() }, [carregar])

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, loja_id: lojaFiltro || form.loja_id }
    const { error } = await supabase.from('pecas_ldb').insert([payload])
    if (!error) {
      setShowForm(false)
      carregar()
    }
    setSaving(false)
  }

  const filtradas = pecas.filter(p => {
    const matchLoja = !lojaFiltro || p.loja_id === lojaFiltro
    const matchStatus = !filtroStatus || p.status === filtroStatus
    return matchLoja && matchStatus
  })

  const getStatusStyle = (s: string) => {
    switch (s) {
      case 'Aplicada': return 'bg-emerald-50 text-emerald-700 border-emerald-200 border-l-emerald-500';
      case 'Devolvida': return 'bg-slate-50 text-slate-500 border-slate-200 border-l-slate-400';
      default: return 'bg-amber-50 text-amber-700 border-amber-200 border-l-amber-500';
    }
  }

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Peças LDB</h1>
            <p className="text-sm text-slate-500 font-medium">Gestão de componentes em stock de garantia</p>
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              value={filtroStatus} 
              onChange={e => setFiltroStatus(e.target.value)}
              className="bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 uppercase tracking-wider"
            >
              <option value="">Todos os Status</option>
              <option value="Aguardando uso">Aguardando uso</option>
              <option value="Aplicada">Aplicada</option>
              <option value="Devolvida">Devolvida</option>
            </select>
            
            <button 
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-lg transition-all shadow-md active:scale-95"
            >
              + Nova Peça
            </button>
          </div>
        </div>

        {/* Listagem de Peças com Estilo Opção B */}
        <div className="grid grid-cols-1 gap-4">
          {filtradas.length > 0 ? (
            filtradas.map(p => (
              <div 
                key={p.id} 
                className={`bg-white rounded-xl shadow-sm border border-l-4 transition-all hover:shadow-md p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${getStatusStyle(p.status)}`}
              >
                <div className="flex items-center gap-5 min-w-0">
                  <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/50 border border-current/10 shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.27 6.96 8.73 5.04 8.73-5.04"/><path d="M12 22.08V12"/></svg>
                  </div>
                  
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-base font-black tracking-tight text-slate-900">{p.codigo}</span>
                      <span className="text-[10px] font-black uppercase bg-white/60 px-2 py-0.5 rounded border border-current/10">LDB</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-500">
                      <span className="text-slate-800">{p.descricao}</span>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-1">
                        Prot: <span className="text-slate-600">{p.protocolo}</span>
                      </span>
                      {usuario.perfil === 'gerente' && !lojaFiltro && p.loja && (
                        <>
                          <span className="text-slate-300">|</span>
                          <BadgeLoja lojaId={p.loja_id} nome={p.loja.nome} />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-current/5">
                  <div className="flex flex-col items-start md:items-end">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Recebido em</span>
                    <span className="text-xs font-bold text-slate-700">{fmtData(p.recebido_em)}</span>
                  </div>
                  <div className="flex flex-col items-start md:items-end">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Status</span>
                    <span className="text-xs font-black uppercase tracking-widest">{p.status}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-20 flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.27 6.96 8.73 5.04 8.73-5.04"/><path d="M12 22.08V12"/></svg>
              </div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Stock Vazio</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Cadastro (Simplificado) */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Nova Peça LDB</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>
            <form onSubmit={salvar} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Descrição da Peça</label>
                  <input required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" value={form.descricao} onChange={e=>setForm({...form, descricao: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Código Suzuki</label>
                  <input required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500/20" value={form.codigo} onChange={e=>setForm({...form, codigo: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Protocolo</label>
                  <input required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500/20" value={form.protocolo} onChange={e=>setForm({...form, protocolo: e.target.value})} />
                </div>
              </div>
              <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
                {saving ? 'A guardar...' : 'Confirmar Registo'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}