import { StatusOS, TipoOS } from '@/types'

export const LOJAS_CONFIG = [
  { id: 1, nome: 'Santos',       cor: '#185FA5', bg: '#E6F1FB', tc: '#0C447C' },
  { id: 2, nome: 'São Vicente',  cor: '#534AB7', bg: '#EEEDFE', tc: '#3C3489' },
  { id: 3, nome: 'Praia Grande', cor: '#0F6E56', bg: '#E1F5EE', tc: '#085041' },
  { id: 4, nome: 'Peruíbe',      cor: '#854F0B', bg: '#FAEEDA', tc: '#633806' },
  { id: 5, nome: 'Guarujá',      cor: '#993556', bg: '#FBEAF0', tc: '#72243E' },
]

export const STATUS_CONFIG: Record<StatusOS, { label: string; bg: string; tc: string; border: string }> = {
  'Aberta':      { label: 'Aberta',      bg: '#E6F1FB', tc: '#0C447C', border: '#B5D4F4' },
  'Em execução': { label: 'Em execução', bg: '#FAEEDA', tc: '#633806', border: '#FAC775' },
  'Concluída':   { label: 'Conc. s/ NF', bg: '#FCEBEB', tc: '#791F1F', border: '#F7C1C1' },
  'Faturada':    { label: 'Faturada',    bg: '#EAF3DE', tc: '#27500A', border: '#C0DD97' },
}

export const TIPO_CONFIG: Record<TipoOS, { bg: string; tc: string }> = {
  'Recall':   { bg: '#E6F1FB', tc: '#0C447C' },
  'Garantia': { bg: '#FBEAF0', tc: '#72243E' },
}

export const MODELOS = [
  '350 E', 'T350', 'T350 X', 'R350', 'S350', 'V350', 'GK 350', 'DK 160', 'DL 160', 'DR 160', 'NK 150', 'DK 150', 'MASTER RIDE', 
]

export const TECNICOS = [
  'Alex', 'Ronald','Vitor', 'Guilherme','Wesley' ,
]

export function lojaConfig(lojaId: number) {
  return LOJAS_CONFIG.find(l => l.id === lojaId) ?? LOJAS_CONFIG[0]
}

export function fmtData(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function fmtMoeda(val?: number) {
  if (val == null) return '—'
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
