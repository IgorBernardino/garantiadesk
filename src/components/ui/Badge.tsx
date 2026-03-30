import { StatusOS, TipoOS } from '@/types'
import { STATUS_CONFIG, TIPO_CONFIG, lojaConfig } from '@/lib/utils'

export function BadgeStatus({ status }: { status: StatusOS }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className="badge"
      style={{ background: cfg.bg, color: cfg.tc, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  )
}

export function BadgeTipo({ tipo }: { tipo: TipoOS }) {
  const cfg = TIPO_CONFIG[tipo]
  return (
    <span className="badge" style={{ background: cfg.bg, color: cfg.tc }}>
      {tipo}
    </span>
  )
}

export function BadgeLoja({ lojaId, nome }: { lojaId: number; nome: string }) {
  const cfg = lojaConfig(lojaId)
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.cor }} />
      {nome}
    </span>
  )
}

export function BadgeReembolso({ status }: { status: string }) {
  const map: Record<string, { bg: string; tc: string }> = {
    'Aguardando envio':   { bg: '#FAEEDA', tc: '#633806' },
    'Enviado à fábrica':  { bg: '#E6F1FB', tc: '#0C447C' },
    'Reembolso recebido': { bg: '#EAF3DE', tc: '#27500A' },
  }
  const cfg = map[status] ?? { bg: '#f3f4f6', tc: '#374151' }
  return (
    <span className="badge" style={{ background: cfg.bg, color: cfg.tc }}>{status}</span>
  )
}
