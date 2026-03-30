export type Perfil = 'consultor' | 'gerente'

export interface Loja {
  id: number
  nome: string
  cidade: string
  cor: string
}

export interface Usuario {
  id: string
  nome: string
  email: string
  perfil: Perfil
  loja_id: number | null
  loja?: Loja
}

export type StatusOS = 'Aberta' | 'Em execução' | 'Concluída' | 'Faturada'
export type TipoOS = 'Recall' | 'Garantia'

export interface Ordem {
  id: number
  numero: string
  loja_id: number
  loja?: Loja
  tipo: TipoOS
  protocolo: string
  chassi: string
  modelo: string
  ano?: number
  km?: number
  cliente_nome: string
  cliente_tel?: string
  tecnico: string
  tempo_previsto?: number
  descricao: string
  observacoes?: string
  status: StatusOS
  consultor_id?: string
  criado_em: string
  concluido_em?: string
  atualizado_em: string
  nota_fiscal?: NotaFiscal
  pecas?: PecaLDB[]
}

export interface PecaLDB {
  id: number
  loja_id: number
  loja?: Loja
  ordem_id?: number
  protocolo: string
  codigo: string
  descricao: string
  numero_serie?: string
  status: 'Aguardando uso' | 'Aplicada' | 'Devolvida'
  almoxarife?: string
  recebido_em: string
  criado_em: string
}

export type StatusReembolso = 'Aguardando envio' | 'Enviado à fábrica' | 'Reembolso recebido'

export interface NotaFiscal {
  id: number
  ordem_id: number
  loja_id: number
  numero_nf: string
  emitido_em: string
  valor?: number
  status_reembolso: StatusReembolso
  criado_em: string
}

export interface DashMetrics {
  total_os: number
  abertas: number
  em_execucao: number
  concluidas: number
  faturadas: number
  sem_nf: number
  pecas_pendentes: number
  por_loja: {
    loja: Loja
    abertas: number
    em_execucao: number
    concluidas: number
    faturadas: number
    sem_nf: number
  }[]
}
