'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Usuario, Loja } from '@/types'
import { MODELOS, TECNICOS, lojaConfig, LOJAS_CONFIG } from '@/lib/utils'
import Topbar from '@/components/layout/Topbar'
import { useRouter } from 'next/navigation'

const STEPS = [
  { label: 'Unidade', icon: '🏢' },
  { label: 'Serviço', icon: '🛠️' },
  { label: 'Veículo', icon: '🏍️' },
  { label: 'Cliente', icon: '👤' },
  { label: 'Revisão', icon: '✅' }
]

export default function NovaOSPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [lojas, setLojas] = useState<Loja[]>([])
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [checks, setChecks] = useState([false, false, false, false, false, false])

  const [form, setForm] = useState({
    loja_id: 0, consultor: '', tipo: '', protocolo: '', chassi: '',
    modelo: '', ano: '', km: '', cliente_nome: '', cliente_tel: '',
    data_entrada: new Date().toISOString().split('T')[0],
    tecnico: '', descricao: '', status: 'Aberta'
  })

  const supabase = createClient()
  const router = useRouter()

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: perfil } = await supabase.from('perfis').select('*, loja:lojas(*)').eq('id', user.id).single()
    if (!perfil) { router.push('/login'); return }
    setUsuario(perfil as Usuario)
    if (perfil.perfil === 'consultor') setForm(f => ({ ...f, loja_id: perfil.loja_id, consultor: perfil.nome }))
    const { data: l } = await supabase.from('lojas').select('*').order('id')
    setLojas((l ?? []) as Loja[])
  }, [supabase, router])

  useEffect(() => { carregar() }, [carregar])

  const salvar = async () => {
    setSaving(true)
    const { error } = await supabase.from('ordens').insert([form])
    if (!error) router.push('/os')
    setSaving(false)
  }

  if (!usuario) return null

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Topbar usuario={usuario} lojas={lojas} />

      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Stepper Moderno */}
        <div className="flex justify-between mb-12 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
          {STEPS.map((s, i) => (
            <div key={s.label} className="relative z-10 flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 shadow-sm ${step >= i ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-white text-slate-400 border border-slate-200'}`}>
                {step > i ? '✓' : s.icon}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${step >= i ? 'text-blue-600' : 'text-slate-400'}`}>{s.label}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden">
          <div className="p-8">
            {/* STEP 0: LOJA */}
            {step === 0 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Selecione a Unidade</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {LOJAS_CONFIG.map(l => (
                    <button
                      key={l.id}
                      onClick={() => { setForm({ ...form, loja_id: l.id }); setStep(1); }}
                      className={`p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md flex items-center gap-4 ${form.loja_id === l.id ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                    >
                      <div className="w-4 h-4 rounded-full" style={{ background: l.cor }} />
                      <span className="font-bold text-slate-700">{l.nome}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 1: TIPO E PROTOCOLO */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Tipo de Processo</h2>
                <div className="grid grid-cols-2 gap-4">
                  {['Recall', 'Garantia'].map(t => (
                    <button
                      key={t}
                      onClick={() => setForm({ ...form, tipo: t })}
                      className={`py-6 rounded-2xl border-2 font-black uppercase tracking-widest transition-all ${form.tipo === t ? 'border-blue-500 bg-blue-600 text-white shadow-lg' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="pt-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Protocolo da Fábrica (Obrigatório)</label>
                  <input 
                    placeholder="Ex: PROT-2024-001"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none transition-all"
                    value={form.protocolo} 
                    onChange={e => setForm({ ...form, protocolo: e.target.value.toUpperCase() })} 
                  />
                </div>
              </div>
            )}

            {/* STEP 2: VEÍCULO */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Dados da Moto</h2>
                <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Modelo Suzuki</label>
                    <select 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {MODELOS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Chassi (Últimos 8)</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-mono font-bold uppercase" value={form.chassi} onChange={e => setForm({ ...form, chassi: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Kilometragem</label>
                    <input type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold" value={form.km} onChange={e => setForm({ ...form, km: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: CLIENTE E TÉCNICO */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Responsáveis</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Nome Completo do Cliente</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold" value={form.cliente_nome} onChange={e => setForm({ ...form, cliente_nome: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Técnico da Oficina</label>
                    <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold" value={form.tecnico} onChange={e => setForm({ ...form, tecnico: e.target.value })}>
                      <option value="">Selecione o técnico...</option>
                      {TECNICOS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: REVISÃO FINAL */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight text-center">Checklist de Conferência</h2>
                <div className="space-y-3">
                  {[
                    'Protocolo validado na fábrica',
                    'Chassi conferido fisicamente',
                    'Cliente ciente do prazo de garantia',
                    'Peças para LDB identificadas'
                  ].map((item, i) => (
                    <button 
                      key={i} 
                      onClick={() => { const n = [...checks]; n[i] = !n[i]; setChecks(n); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${checks[i] ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white'}`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${checks[i] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200'}`}>
                        {checks[i] && '✓'}
                      </div>
                      <span className={`text-sm font-bold ${checks[i] ? 'text-emerald-900' : 'text-slate-500'}`}>{item}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer de Navegação */}
          <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-between gap-4">
            <button 
              onClick={() => step > 0 ? setStep(s => s - 1) : router.back()}
              className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
            >
              {step === 0 ? 'Cancelar' : 'Voltar'}
            </button>
            
            {step < STEPS.length - 1 ? (
              <button 
                onClick={() => setStep(s => s + 1)}
                disabled={step === 1 && !form.protocolo}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95"
              >
                Próximo Passo →
              </button>
            ) : (
              <button 
                onClick={salvar}
                disabled={saving || !checks.every(Boolean)}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-10 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                {saving ? 'Gravando...' : 'Finalizar Abertura'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}