'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Ordem, Loja, Usuario, NotaFiscal, PecaLDB } from '@/types'
import { BadgeStatus, BadgeTipo, BadgeLoja, BadgeReembolso } from '@/components/ui/Badge'
import Topbar from '@/components/layout/Topbar'
import { fmtData, fmtMoeda, lojaConfig } from '@/lib/utils'
import { useRouter, useParams } from 'next/navigation'

const CHECK_ENC = [
  { label: 'Dados da moto conferidos (chassi, modelo, km)', obs: '' },
  { label: 'Protocolo da fábrica registrado na OS', obs: 'Obrigatório para reembolso' },
  { label: 'Serviço executado conforme boletim técnico', obs: '' },
  { label: 'Peça LDB aplicada registrada na planilha de controle', obs: 'Código e nº de série confirmados' },
  { label: 'Técnico e tempo de execução registrados', obs: '' },
  { label: 'Cliente notificado sobre a conclusão', obs: '' },
  { label: 'Documentação preparada para solicitação de reembolso', obs: 'OS + NF + comprovante LDB' },
]

export default function OSDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [lojas, setLojas] = useState<Loja[]>([])
  const [os, setOS] = useState<Ordem | null>(null)
  const [pecas, setPecas] = useState<PecaLDB[]>([])
  const [nota, setNota] = useState<NotaFiscal | null>(null)
  const [checks, setChecks] = useState(new Array(CHECK_ENC.length).fill(false))
  const [saving, setSaving] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: perfil } = await supabase.from('perfis').select('*, loja:lojas(*)').eq('id', user.id).single()
    setUsuario(perfil as Usuario)

    const { data: l } = await supabase.from('lojas').select('*').order('id')
    setLojas((l ?? []) as Loja[])

    const { data: o } = await supabase.from('ordens').select('*, loja:lojas(*)').eq('id', id).single()
    setOS(o as Ordem)

    const { data: p } = await supabase.from('pecas_ldb').select('*').eq('ordem_id', id)
    setPecas((p ?? []) as PecaLDB[])

    const { data: n } = await supabase.from('notas_fiscais').select('*').eq('ordem_id', id).single()
    setNota(n as NotaFiscal)
  }, [id, supabase, router])

  useEffect(() => { carregar() }, [carregar])

  const atualizarStatus = async (novo: string) => {
    setSaving(true)
    const { error } = await supabase.from('ordens').update({ 
      status: novo,
      concluido_em: novo === 'Concluída' ? new Date().toISOString() : os?.concluido_em 
    }).eq('id', id)
    if (!error) carregar()
    setSaving(false)
  }

  if (!os || !usuario) return null

  const pct = Math.round((checks.filter(Boolean).length / CHECK_ENC.length) * 100)
  const config = lojaConfig(os.loja_id)

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Topbar usuario={usuario} lojas={lojas} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header de Ações */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{os.numero}</h1>
                <BadgeStatus status={os.status} />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Abertura: {fmtData(os.criado_em)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {os.status === 'Aberta' && (
              <button onClick={() => atualizarStatus('Em execução')} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl shadow-lg transition-all active:scale-95">Iniciar Execução</button>
            )}
            {os.status === 'Em execução' && (
              <button onClick={() => atualizarStatus('Concluída')} disabled={saving || pct < 100} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl shadow-lg transition-all active:scale-95">Finalizar OS</button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal: Dados Técnicos */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Card Veículo e Cliente */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informações Gerais</span>
                <BadgeLoja lojaId={os.loja_id} nome={os.loja?.nome || ''} />
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-blue-500 uppercase">Modelo da Moto</span>
                    <span className="text-lg font-black text-slate-800">{os.modelo}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-blue-500 uppercase">Chassi (Final)</span>
                    <span className="text-base font-mono font-bold text-slate-700">{os.chassi}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-blue-500 uppercase">Kilometragem</span>
                    <span className="text-base font-bold text-slate-700">{os.km} KM</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-blue-500 uppercase">Cliente</span>
                    <span className="text-lg font-black text-slate-800">{os.cliente_nome}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-blue-500 uppercase">Protocolo Fábrica</span>
                    <span className="text-base font-mono font-bold text-slate-700">{os.protocolo}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-blue-500 uppercase">Técnico Responsável</span>
                    <span className="text-base font-bold text-slate-700 uppercase">{os.tecnico}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card LDB e Peças */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-4 bg-amber-400 rounded-full" /> Peças em Garantia (LDB)
              </h3>
              {pecas.length > 0 ? (
                <div className="space-y-3">
                  {pecas.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-sm font-black text-slate-800">{p.codigo}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">{p.descricao}</div>
                      </div>
                      <span className="text-[10px] font-black px-3 py-1 bg-white rounded-full shadow-sm text-slate-400">{p.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                  <span className="text-xs font-bold text-slate-300 uppercase italic">Nenhuma peça vinculada</span>
                </div>
              )}
            </div>
          </div>

          {/* Coluna Lateral: Status de Faturamento e Checklist */}
          <div className="space-y-6">
            
            {/* Card Faturamento */}
            <div className={`bg-white rounded-2xl shadow-lg border-t-4 p-6 ${nota ? 'border-t-emerald-500' : 'border-t-red-500'}`}>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Estado de Faturamento</h3>
              {nota ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                    <span className="text-[10px] font-black text-emerald-700 uppercase">NF Emitida</span>
                    <span className="text-sm font-black text-emerald-800">{nota.numero_nf}</span>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Valor Reembolso</span>
                    <span className="text-lg font-black text-slate-900 tracking-tighter">{fmtMoeda(nota.valor ?? 0)}</span>
                  </div>
                  <BadgeReembolso status={nota.status_reembolso} />
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-red-500 font-black text-xs uppercase animate-pulse mb-1">Aguardando Nota Fiscal</div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter leading-tight">O faturamento só pode ser iniciado após a conclusão da execução.</p>
                </div>
              )}
            </div>

            {/* Checklist de Progresso */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Checklist Técnico</h3>
                <span className="text-xs font-black text-blue-600">{pct}%</span>
              </div>
              
              <div className="space-y-1 mb-6">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                    style={{ width: `${pct}%` }} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                {CHECK_ENC.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (os.status === 'Faturada') return;
                      const n = [...checks]; n[i] = !n[i]; setChecks(n);
                    }}
                    className={`flex items-start gap-3 w-full text-left p-3 rounded-xl transition-all border ${checks[i] ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-transparent hover:bg-slate-50'}`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-all ${checks[i] ? 'bg-blue-600 text-white' : 'border-2 border-slate-200'}`}>
                      {checks[i] && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
                    </div>
                    <div>
                      <div className={`text-[11px] font-bold leading-tight ${checks[i] ? 'text-blue-900' : 'text-slate-600'}`}>{item.label}</div>
                      {item.obs && <div className="text-[9px] text-slate-400 font-medium mt-1 uppercase italic">{item.obs}</div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}