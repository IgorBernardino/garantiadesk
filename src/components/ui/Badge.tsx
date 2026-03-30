import { StatusOS, TipoOS } from '@/types'
import { STATUS_CONFIG, TIPO_CONFIG, lojaConfig } from '@/lib/utils'

export function BadgeStatus({ status }: { status: StatusOS }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 shadow-sm"
      style={{ 
        backgroundColor: `${cfg.bg}20`, // Adiciona transparência ao fundo
        color: cfg.tc, 
        borderColor: cfg.bg 
      }}
    >
      {cfg.label}
    </span>
  )
}

export function BadgeTipo({ tipo }: { tipo: TipoOS }) {
  const cfg = TIPO_CONFIG[tipo]
  return (
    <span 
      className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter shadow-sm" 
      style={{ backgroundColor: cfg.bg, color: cfg.tc }}
    >
      {tipo}
    </span>
  )
}

export function BadgeLoja({ lojaId, nome }: { lojaId: number; nome: string }) {
  const cfg = lojaConfig(lojaId)
  return (
    <span className="inline-flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
      <div className="w-2 h-2 rounded-full shadow-sm" style={{ background: cfg.cor }} />
      <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{nome}</span>
    </span>
  )
}

export function BadgeReembolso({ status }: { status: string }) {
  const map: Record<string, { bg: string; tc: string }> = {
    'Aguardando envio':   { bg: '#f59e0b', tc: '#fff' },
    'Enviado à fábrica':  { bg: '#3b82f6', tc: '#fff' },
    'Pago':               { bg: '#10b981', tc: '#fff' },
    'Recusado':           { bg: '#ef4444', tc: '#fff' },
  }
  const cfg = map[status] || { bg: '#64748b', tc: '#fff' }
  
  return (
    <span 
      className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-md"
      style={{ backgroundColor: cfg.bg, color: cfg.tc }}
    >
      {status}
    </span>
  )
}