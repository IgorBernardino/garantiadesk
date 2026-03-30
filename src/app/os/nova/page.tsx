'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Usuario, Loja } from '@/types'
import { MODELOS, TECNICOS, lojaConfig, LOJAS_CONFIG } from '@/lib/utils'
import Topbar from '@/components/layout/Topbar'
import { useRouter } from 'next/navigation'

const STEPS = ['Loja', 'Tipo', 'Moto', 'Serviço', 'Peça LDB', 'Revisão']

const CHECK_ITEMS = [
  'Loja e consultor identificados',
  'Tipo de serviço selecionado (Recall ou Garantia)',
  'Protocolo da fábrica informado',
  'Chassi e modelo da moto preenchidos',
  'Técnico responsável e descrição do serviço',
  'Peça LDB registrada com código e descrição',
]

export default function NovaOSPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [lojas, setLojas] = useState<Loja[]>([])
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [checks, setChecks] = useState([false, false, false, false, false, false])

  const [form, setForm] = useState({
    loja_id: 0,
    consultor: '',
    tipo: '',
    protocolo: '',
    chassi: '',
    modelo: '',
    ano: '',
    km: '',
    cliente_nome: '',
    cliente_tel: '',
    data_entrada: new Date().toISOString().split('T')[0],
    tecnico: '',
    tempo_previsto: '',
    descricao: '',
    observacoes: '',
    cod_peca: '',
    desc_peca: '',
    serie_peca: '',
    data_peca: new Date().toISOString().split('T')[0],
    almoxarife: '',
    status_peca: 'Aguardando uso',
  })

  const supabase = createClient()
  const router = useRouter()

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: perfil } = await supabase.from('perfis').select('*, loja:lojas(*)').eq('id', user.id).single()
    if (!perfil) { router.push('/login'); return }
    setUsuario(perfil as Usuario)
    if (perfil.perfil === 'consultor' && perfil.loja_id) {
      setForm(f => ({ ...f, loja_id: perfil.loja_id!, consultor: perfil.nome }))
    }
    const { data: lojasData } = await supabase.from('lojas').select('*').order('id')
    setLojas((lojasData ?? []) as Loja[])
  }, [supabase, router])

  useEffect(() => { carregar() }, [carregar])

  function set(k: string, v: string | number) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function validar() {
    if (step === 0 && (!form.loja_id || !form.consultor.trim())) { alert('Selecione a loja e informe o consultor.'); return false }
    if (step === 1 && (!form.tipo || !form.protocolo.trim())) { alert('Selecione o tipo e informe o protocolo.'); return false }
    if (step === 2 && (!form.chassi.trim() || !form.modelo || !form.cliente_nome.trim())) { alert('Preencha chassi, modelo e cliente.'); return false }
    if (step === 3 && (!form.tecnico || !form.descricao.trim())) { alert('Selecione o técnico e descreva o serviço.'); return false }
    return true
  }

  function avancar() {
    if (!validar()) return
    if (step === 4) {
      const newChecks = [
        !!(form.loja_id && form.consultor),
        !!form.tipo,
        !!form.protocolo,
        !!(form.chassi && form.modelo),
        !!(form.tecnico && form.descricao),
        !!(form.cod_peca && form.desc_peca),
      ]
      setChecks(newChecks)
    }
    setStep(s => s + 1)
  }

  async function salvar() {
    if (!checks.every(Boolean) && !confirm('Checklist incompleto. Deseja abrir mesmo assim?')) return
    setSaving(true)
    const { data: os, error } = await supabase.from('ordens').insert({
      loja_id: form.loja_id,
      tipo: form.tipo,
      protocolo: form.protocolo.trim(),
      chassi: form.chassi.trim().toUpperCase(),
      modelo: form.modelo,
      ano: form.ano ? parseInt(form.ano) : null,
      km: form.km ? parseInt(form.km) : null,
      cliente_nome: form.cliente_nome.trim(),
      cliente_tel: form.cliente_tel.trim() || null,
      tecnico: form.tecnico,
      tempo_previsto: form.tempo_previsto ? parseFloat(form.tempo_previsto) : null,
      descricao: form.descricao.trim(),
      observacoes: form.observacoes.trim() || null,
      consultor_id: usuario?.id,
    }).select().single()

    if (error || !os) { alert('Erro ao salvar OS: ' + error?.message); setSaving(false); return }

    if (form.cod_peca.trim()) {
      await supabase.from('pecas_ldb').insert({
        loja_id: form.loja_id,
        ordem_id: os.id,
        protocolo: form.protocolo.trim(),
        codigo: form.cod_peca.trim().toUpperCase(),
        descricao: form.desc_peca.trim(),
        numero_serie: form.serie_peca.trim() || null,
        recebido_em: form.data_peca,
        almoxarife: form.almoxarife.trim() || null,
        status: form.status_peca,
      })
    }

    router.push(`/os/${os.id}`)
  }

  if (!usuario) return <div className="min-h-screen flex items-center justify-center"><div className="text-sm text-gray-400">Carregando...</div></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar usuario={usuario} lojas={lojas} lojaFiltro={null} onLojaChange={() => {}} />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="btn text-xs">← Voltar</button>
          <h1 className="page-title">Abertura de OS</h1>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center shrink-0">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  i < step ? 'bg-blue-600 text-white' :
                  i === step ? 'bg-blue-50 border-2 border-blue-600 text-blue-700' :
                  'bg-white border border-gray-200 text-gray-400'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs whitespace-nowrap ${i === step ? 'text-blue-700 font-medium' : 'text-gray-400'}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-px mx-1 mb-4 shrink-0 ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* STEP 0: LOJA */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="card p-5">
              <div className="section-title">Em qual loja está sendo feito o atendimento?</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LOJAS_CONFIG.map(cfg => (
                  <button
                    key={cfg.id}
                    onClick={() => set('loja_id', cfg.id)}
                    disabled={usuario.perfil === 'consultor'}
                    className="flex items-center gap-2 p-3 rounded-lg border text-left transition-all"
                    style={form.loja_id === cfg.id
                      ? { borderColor: cfg.cor, background: cfg.bg, color: cfg.tc }
                      : { borderColor: '#e5e7eb', background: 'white', color: '#374151' }}
                  >
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: cfg.cor }} />
                    <span className="text-sm font-medium">{cfg.nome}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <div className="section-title">Consultor responsável</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nome <span className="text-red-400">*</span></label>
                  <input className="input" value={form.consultor} onChange={e => set('consultor', e.target.value)} placeholder="Seu nome" />
                </div>
                <div>
                  <label className="label">Matrícula</label>
                  <input className="input" value={''} placeholder="Opcional" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: TIPO */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="card p-5">
              <div className="section-title">Tipo de serviço</div>
              <div className="grid grid-cols-2 gap-3">
                {(['Recall', 'Garantia'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => set('tipo', t)}
                    className="p-4 rounded-lg border-2 text-left transition-all"
                    style={form.tipo === t
                      ? t === 'Recall' ? { borderColor: '#185FA5', background: '#E6F1FB' } : { borderColor: '#993556', background: '#FBEAF0' }
                      : { borderColor: '#e5e7eb', background: 'white' }}
                  >
                    <div className="font-semibold text-sm mb-1" style={form.tipo === t ? { color: t === 'Recall' ? '#0C447C' : '#72243E' } : { color: '#111827' }}>{t}</div>
                    <div className="text-xs text-gray-500">
                      {t === 'Recall' ? 'Convocação oficial da fábrica para correção de defeito de série' : 'Falha relatada pelo cliente dentro do prazo de garantia'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <label className="label">Protocolo da fábrica <span className="text-red-400">*</span></label>
              <input className="input" value={form.protocolo} onChange={e => set('protocolo', e.target.value)} placeholder="Ex: RC-2025-4510 ou GT-2025-1250" />
              <p className="text-xs text-gray-400 mt-2">Obrigatório para solicitação de reembolso junto à fábrica.</p>
            </div>
          </div>
        )}

        {/* STEP 2: MOTO */}
        {step === 2 && (
          <div className="card p-5">
            <div className="section-title">Dados da motocicleta</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Chassi (VIN) <span className="text-red-400">*</span></label>
                <input className="input font-mono" value={form.chassi} onChange={e => set('chassi', e.target.value.toUpperCase())} placeholder="9C2JC0510RR000001" maxLength={17} />
              </div>
              <div>
                <label className="label">Modelo <span className="text-red-400">*</span></label>
                <select className="input" value={form.modelo} onChange={e => set('modelo', e.target.value)}>
                  <option value="">Selecione</option>
                  {MODELOS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Ano</label>
                <input className="input" type="number" value={form.ano} onChange={e => set('ano', e.target.value)} placeholder="2023" min="2010" max="2026" />
              </div>
              <div>
                <label className="label">KM atual</label>
                <input className="input" type="number" value={form.km} onChange={e => set('km', e.target.value)} placeholder="15000" />
              </div>
              <div>
                <label className="label">Data de entrada</label>
                <input className="input" type="date" value={form.data_entrada} onChange={e => set('data_entrada', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">Nome do cliente <span className="text-red-400">*</span></label>
                <input className="input" value={form.cliente_nome} onChange={e => set('cliente_nome', e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="col-span-2">
                <label className="label">Telefone</label>
                <input className="input" type="tel" value={form.cliente_tel} onChange={e => set('cliente_tel', e.target.value)} placeholder="(13) 99999-9999" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SERVIÇO */}
        {step === 3 && (
          <div className="card p-5">
            <div className="section-title">Serviço a realizar</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Técnico responsável <span className="text-red-400">*</span></label>
                <select className="input" value={form.tecnico} onChange={e => set('tecnico', e.target.value)}>
                  <option value="">Selecione</option>
                  {TECNICOS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tempo previsto (h)</label>
                <input className="input" type="number" value={form.tempo_previsto} onChange={e => set('tempo_previsto', e.target.value)} placeholder="Ex: 2" min="0.5" step="0.5" />
              </div>
              <div className="col-span-2">
                <label className="label">Descrição do serviço <span className="text-red-400">*</span></label>
                <textarea className="input min-h-20 resize-y" value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Descreva o serviço conforme boletim técnico da fábrica..." />
              </div>
              <div className="col-span-2">
                <label className="label">Observações</label>
                <textarea className="input min-h-16 resize-y" value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Condições da moto, reclamações do cliente..." />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: PEÇA LDB */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800">
              A peça LDB não pode ser lançada no Dealer Net com saldo. Este registro é o controle oficial desta concessionária.
            </div>
            <div className="card p-5">
              <div className="section-title">Peça livre de débito</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Código da peça <span className="text-red-400">*</span></label>
                  <input className="input font-mono" value={form.cod_peca} onChange={e => set('cod_peca', e.target.value.toUpperCase())} placeholder="31100-K97-V41" />
                </div>
                <div>
                  <label className="label">Descrição <span className="text-red-400">*</span></label>
                  <input className="input" value={form.desc_peca} onChange={e => set('desc_peca', e.target.value)} placeholder="Ex: Regulador retificador" />
                </div>
                <div>
                  <label className="label">Nº de série</label>
                  <input className="input" value={form.serie_peca} onChange={e => set('serie_peca', e.target.value)} placeholder="Se houver" />
                </div>
                <div>
                  <label className="label">Data de recebimento</label>
                  <input className="input" type="date" value={form.data_peca} onChange={e => set('data_peca', e.target.value)} />
                </div>
                <div>
                  <label className="label">Recebido por (almoxarife)</label>
                  <input className="input" value={form.almoxarife} onChange={e => set('almoxarife', e.target.value)} placeholder="Nome" />
                </div>
                <div>
                  <label className="label">Status da peça</label>
                  <select className="input" value={form.status_peca} onChange={e => set('status_peca', e.target.value)}>
                    <option>Aguardando uso</option>
                    <option>Já aplicada na moto</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: REVISÃO */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="card p-5">
              <div className="section-title">Revisão — confirme antes de abrir</div>
              <div className="divide-y divide-gray-50">
                {[
                  ['Loja', LOJAS_CONFIG.find(l => l.id === form.loja_id)?.nome ?? '—'],
                  ['Consultor', form.consultor],
                  ['Tipo', form.tipo],
                  ['Protocolo', form.protocolo],
                  ['Chassi', form.chassi],
                  ['Modelo', form.modelo + (form.ano ? ' — ' + form.ano : '')],
                  ['Cliente', form.cliente_nome],
                  ['Telefone', form.cliente_tel || '—'],
                  ['Técnico', form.tecnico],
                  ['Peça LDB', form.cod_peca ? `${form.cod_peca} — ${form.desc_peca}` : 'Não informada'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 text-sm">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-medium text-gray-900 text-right max-w-xs truncate">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <div className="section-title">Checklist de abertura</div>
              <div className="space-y-0">
                {CHECK_ITEMS.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setChecks(c => { const n = [...c]; n[i] = !n[i]; return n })}
                    className="flex items-start gap-3 w-full text-left py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded transition-colors"
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center text-xs mt-0.5 shrink-0 transition-all ${checks[i] ? 'bg-blue-600 text-white' : 'border border-gray-300'}`}>
                      {checks[i] && '✓'}
                    </div>
                    <span className={`text-sm ${checks[i] ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Confirmados</span>
                  <span>{checks.filter(Boolean).length}/{checks.length}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${Math.round(checks.filter(Boolean).length / checks.length * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navegação */}
        <div className="flex justify-between mt-6">
          <button onClick={() => step > 0 ? setStep(s => s - 1) : router.back()} className="btn">
            ← {step === 0 ? 'Cancelar' : 'Anterior'}
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={avancar} className="btn btn-primary">Próximo →</button>
          ) : (
            <button onClick={salvar} disabled={saving} className="btn btn-primary">
              {saving ? 'Salvando...' : 'Abrir OS'}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
