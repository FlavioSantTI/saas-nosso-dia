import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Family, FamilyMember } from '../types';
import { Mail, Lock, User as UserIcon, X, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteFamilyId?: string | null;
  family?: Family | null;
  members?: FamilyMember[];
  onAuthSuccess: (user: any, linkedMember?: FamilyMember | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  inviteFamilyId,
  family,
  members = [],
  onAuthSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [inviteFamilyName, setInviteFamilyName] = useState<string>(family?.name || '');

  // Se houver convite na URL, inicia na aba de cadastro
  useEffect(() => {
    if (inviteFamilyId) {
      setActiveTab('register');
    }
  }, [inviteFamilyId]);

  // Busca nome da família se houver inviteFamilyId mas não o objeto family
  useEffect(() => {
    if (inviteFamilyId && !family) {
      supabase
        .from('families')
        .select('name')
        .eq('id', inviteFamilyId)
        .maybeSingle()
        .then(({ data }) => {
          if (data && data.name) {
            setInviteFamilyName(data.name);
          }
        });
    } else if (family) {
      setInviteFamilyName(family.name);
    }
  }, [inviteFamilyId, family]);

  // Limpa estados ao fechar
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccessMsg(null);
      setEmail('');
      setPassword('');
      setName('');
      setSelectedMemberId('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtra membros adultos da família que podem ser vinculados
  const unlinkedAdultMembers = members.filter(
    (m) => m.role !== 'CHILD' && !m.user_id
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (activeTab === 'login') {
        // -----------------------------------------------------------
        // 1. LOGIN
        // -----------------------------------------------------------
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInErr) throw signInErr;
        if (!data.user) throw new Error('Não foi possível obter dados do usuário.');

        let linkedMember: FamilyMember | null = null;

        // Se houver inviteFamilyId ou membros sem user_id, vincula se aplicável
        if (inviteFamilyId || family) {
          const targetFamId = inviteFamilyId || family?.id;
          if (selectedMemberId) {
            const { data: updated } = await supabase
              .from('family_members')
              .update({ user_id: data.user.id })
              .eq('id', selectedMemberId)
              .select()
              .maybeSingle();
            linkedMember = updated;
          } else {
            // Tenta vincular pelo e-mail ou nome se houver correspondência
            const userMetadataName = data.user.user_metadata?.name || '';
            const match = members.find(
              (m) =>
                m.family_id === targetFamId &&
                !m.user_id &&
                (m.name.toLowerCase().includes(userMetadataName.toLowerCase()) ||
                  email.toLowerCase().includes(m.name.toLowerCase()))
            );
            if (match) {
              const { data: updated } = await supabase
                .from('family_members')
                .update({ user_id: data.user.id })
                .eq('id', match.id)
                .select()
                .maybeSingle();
              linkedMember = updated;
            }
          }
        }

        setSuccessMsg('Login realizado com sucesso!');
        setTimeout(() => {
          onAuthSuccess(data.user, linkedMember);
          onClose();
        }, 800);
      } else {
        // -----------------------------------------------------------
        // 2. CADASTRO (SIGN UP)
        // -----------------------------------------------------------
        if (!name.trim()) {
          throw new Error('Por favor, informe seu nome.');
        }

        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              name: name.trim(),
            },
          },
        });

        if (signUpErr) throw signUpErr;
        if (!data.user) throw new Error('Não foi possível criar o usuário.');

        let linkedMember: FamilyMember | null = null;
        const targetFamId = inviteFamilyId || family?.id;

        if (targetFamId) {
          // Se o usuário selecionou um membro existente na família:
          if (selectedMemberId) {
            const { data: updated } = await supabase
              .from('family_members')
              .update({ user_id: data.user.id, name: name.trim() })
              .eq('id', selectedMemberId)
              .select()
              .maybeSingle();
            linkedMember = updated;
          } else {
            // Tenta encontrar membro com o mesmo nome na família ou cria um novo membro
            const match = members.find(
              (m) =>
                m.family_id === targetFamId &&
                !m.user_id &&
                m.name.toLowerCase().trim() === name.toLowerCase().trim()
            );

            if (match) {
              const { data: updated } = await supabase
                .from('family_members')
                .update({ user_id: data.user.id })
                .eq('id', match.id)
                .select()
                .maybeSingle();
              linkedMember = updated;
            } else {
              // Insere novo adulto na família
              const { data: created } = await supabase
                .from('family_members')
                .insert({
                  family_id: targetFamId,
                  user_id: data.user.id,
                  name: name.trim(),
                  role: 'ADMIN',
                  color: '#0284C7',
                })
                .select()
                .maybeSingle();
              linkedMember = created;
            }
          }
        }

        setSuccessMsg('Conta criada e vinculada à família com sucesso!');
        setTimeout(() => {
          onAuthSuccess(data.user, linkedMember);
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-sky-100 flex flex-col">
        {/* Header do Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-sm">
              🔐
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {activeTab === 'login' ? 'Acessar Nosso Dia' : 'Criar Conta Familiar'}
              </h2>
              <p className="text-xs text-slate-500">
                {activeTab === 'login'
                  ? 'Entre com suas credenciais do Supabase'
                  : 'Cadastre-se para gerenciar a rotina familiar'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Banner de Convite Inteligente */}
        {inviteFamilyId && (
          <div className="mt-3.5 p-3.5 bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200/90 rounded-2xl flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="text-xs text-sky-900">
              <span className="font-bold text-sky-950 block">
                Você foi convidado(a) para participar da{' '}
                {inviteFamilyName ? `Família ${inviteFamilyName}` : 'sua Família'}!
              </span>
              <p className="text-sky-700 mt-0.5 leading-snug">
                Cadastre-se ou entre para sincronizar sua agenda com a do seu parceiro(a).
              </p>
            </div>
          </div>
        )}

        {/* Abas Limpas: Entrar / Criar Conta */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl my-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Mensagens de Sucesso ou Erro */}
        {error && (
          <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span className="flex-1 leading-snug">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {activeTab === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Seu Nome
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Flávio Santiago ou Silvia"
                  className="w-full text-xs font-medium pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
              </div>
            </div>
          )}

          {/* Seleção de membro da família (quando houver membros pré-cadastrados sem vínculo) */}
          {unlinkedAdultMembers.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Quem é você na família? (Opcional)
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-slate-800 cursor-pointer"
              >
                <option value="">+ Vincular automaticamente pelo meu nome</option>
                {unlinkedAdultMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    👤 {m.name} ({m.role === 'ADMIN' ? 'Adulto / Admin' : 'Adulto / Membro'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full text-xs font-medium pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full text-xs font-medium pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : activeTab === 'login' ? (
              <span>Entrar na Família</span>
            ) : (
              <span>Criar Conta & Sincronizar</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
