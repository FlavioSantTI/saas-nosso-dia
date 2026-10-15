import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  KeyRound,
  UserCheck,
  Copy,
  Check,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Home
} from 'lucide-react';

interface AdminFamilyOption {
  id: string;
  name: string;
  members_count: number;
}

interface AdminUserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_confirmed: boolean;
}

interface AdminUserManagementProps {
  initialEmail?: string;
  onSuccess?: (email: string) => void;
  className?: string;
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  initialEmail = '',
  onSuccess,
  className = ''
}) => {
  // Gestão de Usuários
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('ADMIN');

  const [families, setFamilies] = useState<AdminFamilyOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    credentials?: { email: string; password: string; name: string; familyName: string };
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const loadFamilies = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_list_families');
      if (!error && Array.isArray(data)) {
        setFamilies(data);
        if (data.length > 0 && !selectedFamilyId) {
          setSelectedFamilyId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar famílias:', err);
    }
  };

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
    loadFamilies();
    fetchUsers();
  }, []);

  const handleGenerateFriendlyPassword = () => {
    const prefixes = ['NossoDia', 'Familia', 'Rotina', 'Acesso'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(100 + Math.random() * 900);
    setPassword(`${prefix}${num}!`);
  };

  const handleCreateAndLinkUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanName = name.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFeedback({ type: 'error', message: 'Informe um e-mail válido.' });
      return;
    }
    if (cleanPassword.length < 6) {
      setFeedback({ type: 'error', message: 'A senha deve conter no mínimo 6 caracteres.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback(null);
      setCopied(false);

      const { data, error } = await supabase.rpc('admin_create_and_link_user', {
        p_target_email: cleanEmail,
        p_new_password: cleanPassword,
        p_family_id: selectedFamilyId || null,
        p_member_name: cleanName || null,
        p_role: role
      });

      if (error) throw error;

      const familyObj = families.find((f) => f.id === selectedFamilyId);

      setFeedback({
        type: 'success',
        message: data?.message || 'Usuário criado, ativado e vinculado com sucesso!',
        credentials: {
          email: cleanEmail,
          password: cleanPassword,
          name: cleanName || cleanEmail.split('@')[0],
          familyName: data?.family_name || familyObj?.name || 'Sua Família'
        }
      });

      fetchUsers(search);
      loadFamilies();
      onSuccess?.(cleanEmail);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Falha ao processar cadastro do usuário.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyWhatsAppMessage = () => {
    if (!feedback?.credentials) return;
    const { name: userName, email: userEmail, password: userPw, familyName } = feedback.credentials;
    const msg = `Oi, ${userName}! Já deixei seu acesso pronto no *Nosso Dia* (${familyName}).\n\n📱 *Link:* https://nossodia.flaviosantiago.com.br\n📧 *Seu e-mail:* ${userEmail}\n🔑 *Sua senha:* ${userPw}\n\nÉ só abrir o link, colocar esse e-mail e senha e entrar. Não precisa confirmar nada no e-mail!`;
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. SEÇÃO DE CADASTRO E VÍNCULO DE USUÁRIOS */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Cadastrar / Ativar Usuário e Vincular à Família
            </h3>
            <p className="text-xs text-slate-500">
              Cria o login ativo no Auth, define a senha direta e vincula imediatamente ao perfil da família selecionada.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateAndLinkUser} className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3.5">
          <div className="md:col-span-6">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              E-mail do Usuário
            </label>
            <input
              type="email"
              required
              maxLength={120}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="silvia.vilar@gmail.com"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          <div className="md:col-span-6">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome / Apelido no App
            </label>
            <input
              type="text"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Silvia Vilar"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Home className="w-3.5 h-3.5 text-slate-400" />
              Vincular à Família
            </label>
            <select
              value={selectedFamilyId}
              onChange={(e) => setSelectedFamilyId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            >
              {families.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.members_count} membros)
                </option>
              ))}
              {families.length === 0 && <option value="">Nenhuma família encontrada</option>}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Papel na Família
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'ADMIN' | 'MEMBER')}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            >
              <option value="ADMIN">Administrador (Pai/Mãe)</option>
              <option value="MEMBER">Membro da Família</option>
            </select>
          </div>

          <div className="md:col-span-4">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Senha Direta
              </label>
              <button
                type="button"
                onClick={handleGenerateFriendlyPassword}
                className="text-[11px] font-semibold text-sky-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Gerar senha
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

          <div className="md:col-span-12 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              {isSubmitting ? 'Processando...' : 'Criar Acesso, Ativar e Vincular à Família'}
            </button>
          </div>
        </form>

        {feedback && (
          <div
            className={`mt-5 p-4 rounded-xl border text-xs ${
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
                    Familiar: <strong>{feedback.credentials.name}</strong> | Família:{' '}
                    <strong>{feedback.credentials.familyName}</strong> | E-mail:{' '}
                    <strong>{feedback.credentials.email}</strong> | Senha:{' '}
                    <strong className="font-mono">{feedback.credentials.password}</strong>
                  </p>
                )}
              </div>

              {feedback.credentials && (
                <button
                  type="button"
                  onClick={handleCopyWhatsAppMessage}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado para o WhatsApp!' : 'Copiar Acesso para WhatsApp'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. LISTA DE USUÁRIOS */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs">
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
              className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg cursor-pointer"
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
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      className="text-sky-700 hover:underline font-semibold cursor-pointer"
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

export default AdminUserManagement;
