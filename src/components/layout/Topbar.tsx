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
    { href: '/os', label: 'Ordens' },
    { href: '/ldb', label: 'Peças LDB' },
    { href: '/nf', label: 'Faturamento' },
  ]

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-20">
        
        {/* Logo e Nav */}
        <div className="flex items-center gap-10">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-slate-900/20 group-hover:scale-105 transition-transform">
              G
            </div>
            <span className="text-lg font-black tracking-tighter uppercase italic hidden sm:block">
              Garantia<span className="text-blue-600">Desk</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  pathname.startsWith(link.href)
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Filtros de Loja (Apenas Gerente) */}
        <div className="flex items-center gap-4">
          {isGerente && (
            <div className="hidden md:flex bg-slate-100 p-1 rounded-full border border-slate-200">
              <button
                onClick={() => onLojaChange(null)}
                className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tight transition-all ${
                  lojaFiltro === null ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Geral
              </button>
              {lojas.map(l => (
                <button
                  key={l.id}
                  onClick={() => onLojaChange(l.id)}
                  className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tight transition-all ${
                    lojaFiltro === l.id 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {l.nome.split(' ')[0]} {/* Pega apenas o primeiro nome para não lotar */}
                </button>
              ))}
            </div>
          )}

          {/* Perfil e Logout */}
          <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-slate-900 uppercase leading-none">{usuario.nome}</p>
              <p className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">{usuario.perfil}</p>
            </div>
            <button 
              onClick={logout}
              className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all"
              title="Sair"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}