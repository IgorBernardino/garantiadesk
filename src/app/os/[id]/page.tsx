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
  const [nf, setNF] = useState<NotaFiscal | null>(null)
  const [checks, setChecks] = useState(CHECK_ENC.map(() => false))
  const [nfForm, setNfForm] = useState({
    numero_nf: '',
    emitido_em: new Date().toISOString().split('T')[0],
    valor: '',
    status_reembolso: 'Aguardando envio',
  })
  const [savingNF, setSavingNF] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: perfil } = await supabase
      .from('perfis').select('*, loja:lojas(*)').eq('id', user.id).single()
    if (!perfil) { router.push('/login'); return }
    setUsuario(perfil as Usuario)

    const { data: lojasData } = await supabase.from('lojas').select('*').order('id')
    setLojas((lojasData ?? []) as Loja[])

    const { data: osData } = await supabase
      .from('ordens').select('*, loja:lojas(*)').eq('id', id).single()
    if (!osData) { router.push('/os'); return }
    setOS(osData as Ordem)

    const { data: pecasData } = await supabase
      .from('pecas_ldb').select('*').eq('ordem_id', id)
    setPecas((pecasData ?? []) as PecaLDB[])

    const { data: nfData } = await supabase
      .from('notas_fiscais').select('*').eq('ordem_id', id).maybeSingle()
    if (nfData) setNF(nfData as NotaFiscal)

    if (osData.status === 'Faturada') setChecks(CHECK_ENC.map(() => true))
  }, [supabase, router, id])

  useEffect(() => { carregar() }, [carregar])

  async function atualizarStatus(novoStatus: string) {
    setUpdatingStatus(true)
    const { error } = await supabase
      .from('ordens').update({ status: novoStatus }).eq('id', id)
    if (!error) {
      setOS(prev => prev ? { ...prev, status: novoStatus as any } : null)
    }
    setUpdatingStatus(false)
  }

  async function salvarNF() {
    if (!nfForm.numero_nf.trim()) { alert('Informe o número da NF.'); return }
    setSavingNF(true)
    const { data, error } = await supabase.from('notas_fiscais').insert({
      ordem_id: parseInt(id),
      loja_id: os!.loja_id,
      numero_nf: nfForm.numero_nf.trim(),
      emitido_em: nfForm.emitido_em,
      valor: nfForm.valor ? parseFloat(nfForm.valor) : null,
      status_reembolso: nfForm.status_reembolso,
    }).select().single()

    if (error) {
      alert('Erro ao vincular NF: ' + error.message)
      setSavingNF(false)
      return
    }
    setNF(data as NotaFiscal)
    setOS(prev => prev ? { ...prev, status: 'Faturada' } : null)
    setChecks(CHECK_ENC.map(() => true))
    setSavingNF(false)
  }

  const pct = Math.round(checks.filter(Boolean).length / checks.length * 100)
  const podeVincularNF = os?.status === 'Concluída' && !nf
  const podeConcluir = os?.status === 'Em execução' || os?.status === 'Aberta'

  if (!os || !usuario) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-sm text-gray-400">Carregando...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar usuario={usuario} lojas={lojas} lojaFiltro={null} onLojaChange={() => {}} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <button onClick={() => router.back()} className="btn text-xs">← Voltar</button>
          <h1 className="page-title">{os.numero}</h1>
          <BadgeTipo tipo={os.tipo} />
          <BadgeStatus status={os.status} />
          {os.loja && <BadgeLoja lojaId={os.loja_id} nome={os.loja.nome} />}
        </div>

        {/* Alerta NF pendente — aparece para o consultor quando OS está Concluída */}
        {podeVincularNF && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 mb-4">
            Esta OS está concluída e aguarda o vínculo da Nota Fiscal. Preencha o formulário abaixo para finalizar o processo.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna principal */}
          <div className="lg:col-span-2 space-y-4">

            {/* Dados da OS */}
            <div className="card p-5">
              <div className="section-title">Dados da OS</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0">
                {[
                  ['Número', os.numero],
                  ['Protocolo', os.protocolo],
                  ['Tipo', os.tipo],
                  ['Chassi', os.chassi],
                  ['Modelo', `${os.modelo}${os.ano ? ' — ' + os.ano : ''}`],
                  ['KM', os.km ? os.km.toLocaleString('pt-BR') + ' km' : '—'],
                  ['Cliente', os.cliente_nome],
                  ['Telefone', os.cliente_tel ?? '—'],
                  ['Técnico', os.tecnico],
                  ['Tempo previsto', os.tempo_previsto ? os.tempo_previsto + 'h' : '—'],
                  ['Aberta em', fmtData(os.criado_em)],
                  ['Concluída em', os.concluido_em ? fmtData(os.concluido_em) : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="py-1.5 border-b border-gray-50">
                    <div className="text-xs text-gray-400">{k}</div>
                    <div className="text-sm font-medium text-gray-900 mt-0.5 break-all">{v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50">
                <div className="text-xs text-gray-400 mb-1">Descrição do serviço</div>
                <p className="text-sm text-gray-700 leading-relaxed">{os.descricao}</p>
              </div>
              {os.observacoes && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <div className="text-xs text-gray-400 mb-1">Observações</div>
                  <p className="text-sm text-gray-600">{os.observacoes}</p>
                </div>
              )}
            </div>

            {/* Peças LDB */}
            <div className="card p-5">
              <div className="section-title">Peças livre de débito</div>
              {pecas.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma peça LDB registrada para esta OS.</p>
              ) : (
                <div className="space-y-3">
                  {pecas.map(p => (
                    <div key={p.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold font-mono text-gray-900">{p.codigo}</span>
                        <span className={`badge text-xs ${p.status === 'Aplicada' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-500">
                        <span>Descrição: <span className="text-gray-700">{p.descricao}</span></span>
                        {p.numero_serie && <span>Série: <span className="text-gray-700">{p.numero_serie}</span></span>}
                        <span>Recebida: <span className="text-gray-700">{fmtData(p.recebido_em)}</span></span>
                        {p.almoxarife && <span>Almoxarife: <span className="text-gray-700">{p.almoxarife}</span></span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* NF já vinculada */}
            {nf && (
              <div className="card p-5 border-green-200 border">
                <div className="section-title">Nota fiscal vinculada</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {[
                    ['Número NF', nf.numero_nf],
                    ['Data de emissão', fmtData(nf.emitido_em)],
                    ['Valor', fmtMoeda(nf.valor ?? undefined)],
                  ].map(([k, v]) => (
                    <div key={k} className="py-1.5 border-b border-gray-50">
                      <div className="text-xs text-gray-400">{k}</div>
                      <div className="text-sm font-semibold text-gray-900 mt-0.5">{v}</div>
                    </div>
                  ))}
                  <div className="py-1.5 border-b border-gray-50 col-span-2">
                    <div className="text-xs text-gray-400 mb-1">Status do reembolso</div>
                    <BadgeReembolso status={nf.status_reembolso} />
                  </div>
                </div>
              </div>
            )}

            {/* Formulário de vínculo de NF — visível quando OS está Concluída sem NF */}
            {podeVincularNF && (
              <div className="card p-5 border-blue-300 border bg-blue-50/40">
                <div className="section-title">Vincular Nota Fiscal</div>
                <p className="text-xs text-gray-500 mb-4">
                  Após emitir a NF de serviço, registre os dados abaixo para vincular à esta OS.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="label">Número da NF <span className="text-red-400">*</span></label>
                    <input
                      className="input"
                      value={nfForm.numero_nf}
                      onChange={e => setNfForm(f => ({ ...f, numero_nf: e.target.value }))}
                      placeholder="Ex: NF 000130"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="label">Data de emissão</label>
                    <input
                      className="input"
                      type="date"
                      value={nfForm.emitido_em}
                      onChange={e => setNfForm(f => ({ ...f, emitido_em: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Valor (R$)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      value={nfForm.valor}
                      onChange={e => setNfForm(f => ({ ...f, valor: e.target.value }))}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Status do reembolso junto à fábrica</label>
                    <select
                      className="input"
                      value={nfForm.status_reembolso}
                      onChange={e => setNfForm(f => ({ ...f, status_reembolso: e.target.value }))}
                    >
                      <option>Aguardando envio</option>
                      <option>Enviado à fábrica</option>
                      <option>Reembolso recebido</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={salvarNF}
                    disabled={savingNF}
                    className="btn btn-primary w-full justify-center"
                  >
                    {savingNF ? 'Salvando...' : 'Vincular NF e finalizar OS'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Coluna direita */}
          <div className="space-y-4">

            {/* Ações de status */}
            <div className="card p-5">
              <div className="section-title">Status da OS</div>
              <div className="space-y-2">
                {os.status === 'Aberta' && (
                  <button
                    onClick={() => atualizarStatus('Em execução')}
                    disabled={updatingStatus}
                    className="btn w-full justify-center"
                    style={{ background: '#FAEEDA', color: '#633806', borderColor: '#FAC775' }}
                  >
                    {updatingStatus ? 'Atualizando...' : 'Iniciar execução'}
                  </button>
                )}
                {os.status === 'Em execução' && (
                  <button
                    onClick={() => {
                      if (pct < 100 && !confirm('Checklist incompleto. Concluir mesmo assim?')) return
                      atualizarStatus('Concluída')
                    }}
                    disabled={updatingStatus}
                    className="btn w-full justify-center"
                    style={{ background: '#FCEBEB', color: '#791F1F', borderColor: '#F7C1C1' }}
                  >
                    {updatingStatus ? 'Atualizando...' : 'Concluir OS'}
                  </button>
                )}
                {os.status === 'Concluída' && !nf && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                    Preencha o formulário de NF ao lado para finalizar
                  </div>
                )}
                {os.status === 'Faturada' && (
                  <div
                    className="badge w-full justify-center py-2 text-sm"
                    style={{ background: '#EAF3DE', color: '#27500A' }}
                  >
                    Processo encerrado
                  </div>
                )}
              </div>
            </div>

            {/* Checklist encerramento */}
            <div className="card p-5">
              <div className="section-title">Checklist de encerramento</div>
              <div className="space-y-0">
                {CHECK_ENC.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setChecks(c => { const n = [...c]; n[i] = !n[i]; return n })}
                    disabled={os.status === 'Faturada'}
                    className="flex items-start gap-2.5 w-full text-left py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded transition-colors disabled:cursor-default"
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center text-xs mt-0.5 shrink-0 transition-all ${checks[i] ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white'}`}>
                      {checks[i] && '✓'}
                    </div>
                    <div>
                      <div className={`text-xs ${checks[i] ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.label}</div>
                      {item.obs && <div className="text-xs text-gray-400 mt-0.5">{item.obs}</div>}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Progresso</span><span>{pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: pct === 100 ? '#3B6D11' : '#185FA5' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
