import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { KeyRound, UserCheck, Copy, Check, RefreshCw, Search, ShieldCheck, Sparkles } from 'lucide-react';

interface AdminUserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_confirmed: boolean;
}

export const AdminUserManagement: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    credentials?: { email: string; password: string };
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const fetchUsers = async (term = '') => {
    try {
      setIsLoadingUsers(true);
      const { data, error } = await supabase.rpc('admin_list_users', {
        p_search: term.trim() || null
      });
      if (!error && Array.isArray(data)) {
        setUsers(data as AdminUserRow[]);
      }
    } catch (err) {
      console.error('Erro ao listar usuários:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleGenerateFriendlyPassword = () => {
    const prefixes = ['NossoDia', 'Familia', 'Rotina', 'Acesso'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(100 + Math.random() * 900);
    setPassword(`${prefix}${num}!`);
  };

  const handleActivateAndSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFeedback({ type: 'error', message: 'Informe um e-mail válido.' });
      return;
    }
    if (cleanPassword.length < 6) {
      setFeedback({ type: 'error', message: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback(null);
      setCopied(false);

      const { data, error } = await supabase.rpc('admin_set_user_credentials', {
        p_target_email: cleanEmail,
        p_new_password: cleanPassword
      });

      if (error) throw error;

      setFeedback({
        type: 'success',
        message: (data as any)?.message || 'Conta ativada e senha definida com sucesso!',
        credentials: { email: cleanEmail, password: cleanPassword }
      });

      fetchUsers(search);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Falha ao definir credenciais do usuário.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyWhatsAppMessage = async () => {
    if (!feedback?.credentials) return;
    // URL em texto puro (sem sintaxe Markdown) para o WhatsApp reconhecer o link corretamente
    const msg = `Oi! Já deixei seu acesso pronto no *Nosso Dia*.\n\n📱 *Link:* https://nossodia.flaviosantiago.com.br\n📧 *Seu e-mail:* ${feedback.credentials.email}\n🔑 *Sua senha:* ${feedback.credentials.password}\n\nÉ só abrir o link, colocar esse e-mail e senha e entrar. Não precisa confirmar nada no e-mail!`;
    try {
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Falha ao copiar para a área de transferência:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Ativação Direta e Alteração de Senha (Sem E-mail)
            </h3>
            <p className="text-xs text-slate-500">
              Ative ou redefina a senha de qualquer usuário instantaneamente, sem precisar que ele clique em links de confirmação.
            </p>
          </div>
        </div>

        <form onSubmit={handleActivateAndSetPassword} className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              E-mail do Usuário
            </label>
            <input
              type="email"
              required
              maxLength={120}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@exemplo.com"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          <div className="md:col-span-4">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Nova Senha Direta
              </label>
              <button
                type="button"
                onClick={handleGenerateFriendlyPassword}
                className="text-[11px] font-semibold text-sky-700 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Gerar senha fácil
              </button>
            </div>
            <input
              type="text"
              required
              minLength={6}
              maxLength={64}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ex: Familia2026!"
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          <div className="md:col-span-3 flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4" />
              {isSubmitting ? 'Processando...' : 'Ativar & Salvar Senha'}
            </button>
          </div>
        </form>

        {feedback && (
          <div
            className={`mt-4 p-4 rounded-xl border text-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-sm">{feedback.message}</p>
                {feedback.credentials && (
                  <p className="mt-1 text-emerald-800">
                    E-mail: <strong>{feedback.credentials.email}</strong> | Senha:{' '}
                    <strong className="font-mono">{feedback.credentials.password}</strong>
                  </p>
                )}
              </div>

              {feedback.credentials && (
                <button
                  type="button"
                  onClick={handleCopyWhatsAppMessage}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5 shrink-0 shadow-2xs"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado para o WhatsApp!' : 'Copiar Acesso para WhatsApp'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lista de Usuários */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Usuários Cadastrados na Plataforma
          </h4>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  fetchUsers(e.target.value);
                }}
                placeholder="Buscar por e-mail..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <button
              type="button"
              onClick={() => fetchUsers(search)}
              className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 px-3 font-semibold">E-mail</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold">Último Login</th>
                <th className="py-2.5 px-3 font-semibold text-right">Ação Rápida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-medium text-slate-900">{u.email}</td>
                  <td className="py-2.5 px-3">
                    {u.is_confirmed ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Ativo / Confirmado
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Pendente Ativação
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {u.last_sign_in_at ? u.last_sign_in_at.substring(0, 10) : 'Nunca acessou'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(u.email);
                        handleGenerateFriendlyPassword();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-sky-700 hover:underline font-semibold"
                    >
                      Trocar Senha / Ativar
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !isLoadingUsers && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
