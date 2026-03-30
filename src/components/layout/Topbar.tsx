'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Usuario, Loja } from '@/types'
import { lojaConfig } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  usuario: Usuario
  lojas: Loja[]
  lojaFiltro: number | null
  onLojaChange: (id: number | null) => void
}

export default function Topbar({ usuario, lojas, lojaFiltro, onLojaChange }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const isGerente = usuario.perfil === 'gerente'

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navLinks = [
    { href: '/dashboard', label: 'Painel' },
    { href: '/os', label: 'Ordens de Serviço' },
    { href: '/ldb', label: 'Peças LDB' },
    { href: '/nf', label: 'Vínculo NF' },
  ]

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
      <div className="flex items-center gap-4 px-4 h-14">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center">G</div>
          <span className="font-semibold text-sm text-gray-900 hidden sm:block">GarantiaDesk</span>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
          {navLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                pathname.startsWith(l.href)
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Filtro de loja (só gerente) */}
        {isGerente && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onLojaChange(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                lojaFiltro === null
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            {lojas.map(l => {
              const cfg = lojaConfig(l.id)
              const ativa = lojaFiltro === l.id
              return (
                <button
                  key={l.id}
                  onClick={() => onLojaChange(l.id)}
                  style={ativa ? { background: cfg.bg, color: cfg.tc } : {}}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    ativa ? '' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {l.nome}
                </button>
              )
            })}
          </div>
        )}

        {/* Usuário */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
            style={usuario.loja_id ? { background: lojaConfig(usuario.loja_id).bg, color: lojaConfig(usuario.loja_id).tc } : { background: '#f3f4f6', color: '#374151' }}
          >
            {usuario.nome.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-xs text-gray-500 hidden md:block">{usuario.nome}</span>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-700 ml-1">sair</button>
        </div>
      </div>
    </header>
  )
}
