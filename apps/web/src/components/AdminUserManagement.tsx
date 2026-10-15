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
  Home,
  Cpu,
  Lock,
  Save,
  Calendar,
  Crown
} from 'lucide-react';

interface AdminFamilyWithPlan {
  family_id: string;
  family_name: string;
  members_count: number;
  plan_id: string | null;
  plan_name: string;
  plan_badge: string;
  subscription_status: string;
  billing_cycle: string;
  expires_at: string;
  expires_at_formatted: string;
  days_remaining: number;
  is_expired: boolean;
}

interface AdminUserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_confirmed: boolean;
}

interface PlatformSettingRow {
  key: string;
  key_fingerprint: string | null;
  description: string | null;
  updated_at: string;
}

interface PlanCatalogOption {
  id: string;
  name: string;
  price: number;
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
  // 1. Gestão de Vigência de Famílias
  const [families, setFamilies] = useState<AdminFamilyWithPlan[]>([]);
  const [planCatalog, setPlanCatalog] = useState<PlanCatalogOption[]>([]);
  const [selectedFamilyForPlan, setSelectedFamilyForPlan] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [durationDays, setDurationDays] = useState<number>(365);
  const [customExpiresDate, setCustomExpiresDate] = useState('');
  const [isUpdatingSubscription, setIsUpdatingSubscription] = useState(false);
  const [subscriptionFeedback, setSubscriptionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 2. Gestão de Usuários
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [userFamilyId, setUserFamilyId] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('ADMIN');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [userFeedback, setUserFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    credentials?: { email: string; password: string; name: string; familyName: string };
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // 3. Gestão de Chaves de IA
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [isSavingAiKey, setIsSavingAiKey] = useState(false);
  const [aiKeyFeedback, setAiKeyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [currentAiSettings, setCurrentAiSettings] = useState<PlatformSettingRow[]>([]);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const handleGenerateFriendlyPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pw = 'Familia';
    for (let i = 0; i < 4; i++) {
      pw += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pw += '!';
    setPassword(pw);
  };

  const loadData = async () => {
    // Carrega Famílias com Vigência (via RPC ou fallback para admin_list_families)
    try {
      const { data, error } = await supabase.rpc('admin_list_families_with_plans');
      if (!error && Array.isArray(data)) {
        setFamilies(data as AdminFamilyWithPlan[]);
        if (data.length > 0 && !selectedFamilyForPlan) {
          setSelectedFamilyForPlan(data[0].family_id);
          setUserFamilyId(data[0].family_id);
        }
      } else {
        // Fallback defensivo caso a RPC ainda não tenha sido criada
        const { data: fallbackFamilies } = await supabase.rpc('admin_list_families');
        if (fallbackFamilies && Array.isArray(fallbackFamilies)) {
          const adapted: AdminFamilyWithPlan[] = fallbackFamilies.map((f: any) => ({
            family_id: f.id,
            family_name: f.name,
            members_count: f.members_count || 0,
            plan_id: null,
            plan_name: 'Família Pro IA Anual',
            plan_badge: 'Pro IA',
            subscription_status: 'ACTIVE',
            billing_cycle: 'YEARLY',
            expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
            expires_at_formatted: new Date(Date.now() + 365 * 86400000).toLocaleDateString('pt-BR'),
            days_remaining: 365,
            is_expired: false
          }));
          setFamilies(adapted);
          if (adapted.length > 0 && !selectedFamilyForPlan) {
            setSelectedFamilyForPlan(adapted[0].family_id);
            setUserFamilyId(adapted[0].family_id);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao listar famílias:', err);
    }

    // Carrega Planos Ativos
    try {
      const { data, error } = await supabase.from('plans').select('id, name, price').eq('is_active', true);
      if (!error && Array.isArray(data) && data.length > 0) {
        setPlanCatalog(data);
        if (!selectedPlanId) {
          setSelectedPlanId(data[0].id);
        }
      } else {
        // Fallback de catálogo se tabela vazia
        const defaultPlans: PlanCatalogOption[] = [
          { id: 'plan-pro-ia-anual', name: 'Família Pro IA Anual', price: 299 },
          { id: 'plan-pro-ia', name: 'Família Pro IA Mensal', price: 29.9 },
          { id: 'plan-essencial', name: 'Família Essencial', price: 19.9 },
          { id: 'plan-trial', name: 'Degustação (Trial 14 dias)', price: 0 }
        ];
        setPlanCatalog(defaultPlans);
        if (!selectedPlanId) setSelectedPlanId(defaultPlans[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar catálogo de planos:', err);
    }

    // Carrega Configurações de IA
    try {
      const { data, error } = await supabase.rpc('admin_get_platform_settings');
      if (!error && Array.isArray(data)) {
        setCurrentAiSettings(data as PlatformSettingRow[]);
      }
    } catch (err) {
      console.error('Erro ao carregar IA settings:', err);
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
    loadData();
    fetchUsers();
  }, []);

  // Atualizar Vigência da Família
  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamilyForPlan || !selectedPlanId) {
      setSubscriptionFeedback({ type: 'error', message: 'Selecione a família e o plano.' });
      return;
    }

    try {
      setIsUpdatingSubscription(true);
      setSubscriptionFeedback(null);

      const expiresParam = customExpiresDate ? `${customExpiresDate}T23:59:59Z` : null;

      const { data, error } = await supabase.rpc('admin_set_family_subscription', {
        p_family_id: selectedFamilyForPlan,
        p_plan_id: selectedPlanId,
        p_status: 'ACTIVE',
        p_expires_at: expiresParam,
        p_duration_days: expiresParam ? null : durationDays
      });

      if (error) throw error;

      setSubscriptionFeedback({
        type: 'success',
        message: data?.message || 'Vigência e plano atualizados com sucesso!'
      });

      loadData();
    } catch (err: any) {
      setSubscriptionFeedback({
        type: 'error',
        message: err?.message || 'Falha ao atualizar vigência da família.'
      });
    } finally {
      setIsUpdatingSubscription(false);
    }
  };

  // Salvar Chave AES-256
  const handleSaveGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiKeyInput.trim()) {
      setAiKeyFeedback({ type: 'error', message: 'Informe a chave do Gemini.' });
      return;
    }

    try {
      setIsSavingAiKey(true);
      setAiKeyFeedback(null);

      const { data, error } = await supabase.rpc('admin_set_platform_setting', {
        p_key: 'gemini_api_key',
        p_value: geminiKeyInput.trim(),
        p_description: 'Google Gemini 1.5 Flash (Criptografia AES-256)'
      });

      if (error) throw error;

      setAiKeyFeedback({
        type: 'success',
        message: data?.message || 'Chave criptografada com AES-256 e salva com sucesso!'
      });

      setGeminiKeyInput('');
      loadData();
    } catch (err: any) {
      setAiKeyFeedback({
        type: 'error',
        message: err?.message || 'Falha ao salvar chave criptografada.'
      });
    } finally {
      setIsSavingAiKey(false);
    }
  };

  // Criar Usuário e Vincular
  const handleCreateAndLinkUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanName = name.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setUserFeedback({ type: 'error', message: 'Informe um e-mail válido.' });
      return;
    }
    if (cleanPassword.length < 6) {
      setUserFeedback({ type: 'error', message: 'A senha deve conter no mínimo 6 caracteres.' });
      return;
    }

    try {
      setIsSubmittingUser(true);
      setUserFeedback(null);
      setCopied(false);

      const { data, error } = await supabase.rpc('admin_create_and_link_user', {
        p_target_email: cleanEmail,
        p_new_password: cleanPassword,
        p_family_id: userFamilyId || null,
        p_member_name: cleanName || null,
        p_role: role
      });

      if (error) throw error;

      const familyObj = families.find((f) => f.family_id === userFamilyId);

      setUserFeedback({
        type: 'success',
        message: data?.message || 'Usuário criado, ativado e vinculado com sucesso!',
        credentials: {
          email: cleanEmail,
          password: cleanPassword,
          name: cleanName || cleanEmail.split('@')[0],
          familyName: data?.family_name || familyObj?.family_name || 'Sua Família'
        }
      });

      if (onSuccess) {
        onSuccess(cleanEmail);
      }

      fetchUsers(searchUser);
      loadData();
    } catch (err: any) {
      setUserFeedback({
        type: 'error',
        message: err?.message || 'Falha ao processar cadastro do usuário.'
      });
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleCopyWhatsAppMessage = () => {
    if (!userFeedback?.credentials) return;
    const { name: userName, email: userEmail, password: userPw, familyName } = userFeedback.credentials;
    const msg = `Oi, ${userName}! Já deixei seu acesso pronto no *Nosso Dia* (${familyName}).\n\n📱 *Link:* https://nossodia.flaviosantiago.com.br\n📧 *Seu e-mail:* ${userEmail}\n🔑 *Sua senha:* ${userPw}\n\nÉ só abrir o link, colocar esse e-mail e senha e entrar. Não precisa confirmar nada no e-mail!`;
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const geminiSetting = currentAiSettings.find((s) => s.key === 'gemini_api_key');

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. SEÇÃO CENTRAL DE GESTÃO DE VIGÊNCIA E EXPIRAÇÃO DE PLANOS */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Controle de Planos, Vigência e Expiração das Famílias
            </h3>
            <p className="text-xs text-slate-500">
              Defina o plano ativo, a data de vencimento e quanto tempo a degustação ou o plano anual permanecerá válido.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateSubscription} className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Família
              </label>
              <select
                value={selectedFamilyForPlan}
                onChange={(e) => setSelectedFamilyForPlan(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                {families.map((f) => (
                  <option key={f.family_id} value={f.family_id}>
                    {f.family_name} ({f.plan_name} - {f.days_remaining}d restantes)
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Plano a Atribuir
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                {planCatalog.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Atalhos de Vigência
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setDurationDays(14);
                    setCustomExpiresDate('');
                  }}
                  className={`flex-1 py-2 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                    durationDays === 14 && !customExpiresDate
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  14d
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDurationDays(30);
                    setCustomExpiresDate('');
                  }}
                  className={`flex-1 py-2 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                    durationDays === 30 && !customExpiresDate
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  30d
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDurationDays(365);
                    setCustomExpiresDate('');
                  }}
                  className={`flex-1 py-2 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                    durationDays === 365 && !customExpiresDate
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  1 ano
                </button>
              </div>
            </div>

            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Ou Escolha a Data Exata de Vencimento
              </label>
              <input
                type="date"
                value={customExpiresDate}
                onChange={(e) => setCustomExpiresDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-6 flex items-end">
              <button
                type="submit"
                disabled={isUpdatingSubscription}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {isUpdatingSubscription ? 'Salvando...' : 'Salvar Vigência da Família'}
              </button>
            </div>
          </div>

          {subscriptionFeedback && (
            <p
              className={`text-xs font-semibold ${
                subscriptionFeedback.type === 'success' ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {subscriptionFeedback.message}
            </p>
          )}
        </form>

        {/* Tabela de Famílias com Status de Vencimento */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 px-3 font-semibold">Família</th>
                <th className="py-2.5 px-3 font-semibold">Plano Ativo</th>
                <th className="py-2.5 px-3 font-semibold">Vencimento</th>
                <th className="py-2.5 px-3 font-semibold">Status / Dias</th>
                <th className="py-2.5 px-3 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {families.map((f) => (
                <tr key={f.family_id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{f.family_name}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-700">{f.plan_name}</td>
                  <td className="py-2.5 px-3 text-slate-600 font-mono">{f.expires_at_formatted}</td>
                  <td className="py-2.5 px-3">
                    {f.is_expired ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Expirado ({Math.abs(f.days_remaining)}d atrás)
                      </span>
                    ) : f.days_remaining <= 3 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Vence em {f.days_remaining}d (Avisar!)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Ativo ({f.days_remaining}d restantes)
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFamilyForPlan(f.family_id);
                        if (f.plan_id) setSelectedPlanId(f.plan_id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                    >
                      Renovar / Alterar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. GESTÃO CENTRAL DE CHAVES DE IA (AES-256) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-2xl bg-amber-50 text-[#EA580C] border border-amber-200 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Gestão Central de Inteligência Artificial</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                <Lock className="w-3 h-3 text-emerald-700" /> Criptografado AES-256
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Chaves salvas no banco com criptografia militar AES-256 via OpenPGP pgcrypto.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveGeminiKey} className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-800">
                Google Gemini (Multimodal)
              </label>
              {geminiSetting ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Check className="w-3 h-3" /> Ativa: <span className="font-mono">{geminiSetting.key_fingerprint}</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                  Chave não configurada
                </span>
              )}
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-sky-600 hover:underline font-semibold"
            >
              Obter chave gratuita no Google AI Studio (1.500 req/dia) ↗
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              required
              value={geminiKeyInput}
              onChange={(e) => setGeminiKeyInput(e.target.value)}
              placeholder={geminiSetting ? 'Digite nova chave para substituir com criptografia...' : 'Cole sua chave AIzaSy...'}
              className="flex-1 px-3.5 py-2.5 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={isSavingAiKey}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {isSavingAiKey ? 'Criptografando...' : 'Salvar com Criptografia'}
            </button>
          </div>

          {aiKeyFeedback && (
            <p
              className={`text-xs font-semibold ${
                aiKeyFeedback.type === 'success' ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {aiKeyFeedback.message}
            </p>
          )}
        </form>
      </div>

      {/* 3. CADASTRO DE USUÁRIOS E VÍNCULO */}
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
              value={userFamilyId}
              onChange={(e) => setUserFamilyId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            >
              {families.map((f) => (
                <option key={f.family_id} value={f.family_id}>
                  {f.family_name} ({f.members_count} membros)
                </option>
              ))}
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
              disabled={isSubmittingUser}
              className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              {isSubmittingUser ? 'Processando...' : 'Criar Acesso, Ativar e Vincular à Família'}
            </button>
          </div>
        </form>

        {userFeedback && (
          <div
            className={`mt-5 p-4 rounded-xl border text-xs ${
              userFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-sm">{userFeedback.message}</p>
                {userFeedback.credentials && (
                  <p className="mt-1 text-emerald-800">
                    Familiar: <strong>{userFeedback.credentials.name}</strong> | Família:{' '}
                    <strong>{userFeedback.credentials.familyName}</strong> | E-mail:{' '}
                    <strong>{userFeedback.credentials.email}</strong> | Senha:{' '}
                    <strong className="font-mono">{userFeedback.credentials.password}</strong>
                  </p>
                )}
              </div>

              {userFeedback.credentials && (
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

      {/* 4. LISTA DE USUÁRIOS */}
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
                value={searchUser}
                onChange={(e) => {
                  setSearchUser(e.target.value);
                  fetchUsers(e.target.value);
                }}
                placeholder="Buscar por e-mail..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <button
              type="button"
              onClick={() => fetchUsers(searchUser)}
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
                        window.scrollTo({ top: 400, behavior: 'smooth' });
                      }}
                      className="text-sky-700 hover:underline font-semibold cursor-pointer"
                    >
                      Trocar Senha / Ativar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUserManagement;
