'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro('Credenciais inválidas. Verifique os dados e tente novamente.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] relative overflow-hidden">
      {/* Elementos Decorativos de Fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-slate-900/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-[400px] px-6 relative z-10">
        {/* Logo e Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 text-white text-2xl font-black mb-6 shadow-2xl shadow-slate-900/20 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            G
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Garantia<span className="text-blue-600">Desk</span></h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Sistema de Gestão Pós-Vendas</p>
        </div>

        {/* Card de Login */}
        <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 p-10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">E-mail Corporativo</label>
              <input
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300"
                type="email"
                placeholder="nome.sobrenome@comeri.com.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Senha de Acesso</label>
              <input
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300"
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
              />
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-[11px] font-black uppercase tracking-tight rounded-xl px-4 py-3 animate-shake">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] text-[11px] py-5 rounded-2xl shadow-xl shadow-slate-900/20 transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? 'Autenticando...' : 'Entrar no Sistema'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="flex gap-4 opacity-30">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          </div>
          <p className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest leading-loose">
            Rede de Concessionárias Suzuki<br />
            Baixada Santista
          </p>
        </div>
      </div>
    </div>
  )
}