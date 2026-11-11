import React, { useState, useEffect } from 'react';
import { Family, FamilyMember, MemberRole, Plan } from '../types';
import { getFamilyInviteUrl } from '../lib/url';
import {
  createSubscription,
  formatCentsToBRL,
  formatCpfCnpjMask,
  validateCpfCnpj
} from '../lib/asaas';
import { supabase } from '../lib/supabase';
import { CreditCard, Users, ShieldCheck, CheckCircle2, Sparkles, QrCode, ArrowRight, Copy, Check } from 'lucide-react';
import { MemberAvatar } from './MemberAvatar';
import { AvatarPickerModal } from './AvatarPickerModal';

interface FamilyManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  family: Family;
  members: FamilyMember[];
  onUpdateFamily: (name: string) => Promise<void>;
  onAddMember: (member: { name: string; nickname?: string | null; avatar?: string | null; email?: string | null; role: MemberRole; color: string }) => Promise<void>;
  onUpdateMember: (member: FamilyMember) => Promise<void>;
  onDeleteMember: (memberId: string) => Promise<void>;
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const COLOR_PALETTE = [
  '#0284C7', // Azul Oceano
  '#EA580C', // Terracota / Laranja
  '#059669', // Verde Sálvia
  '#0891B2', // Ciano / Petróleo
  '#7C3AED', // Violeta
  '#DB2777', // Rosa
  '#D97706', // Âmbar
  '#65A30D', // Lima / Oliva
  '#4F46E5', // Índigo
  '#475569', // Ardósia
];

const DEFAULT_PLANS_FALLBACK: Plan[] = [
  {
    id: 'd2222222-2222-2222-2222-222222222222',
    name: 'Família Essencial',
    slug: 'essencial',
    price_cents: 5990,
    billing_interval: 'MONTHLY',
    max_members: 5,
    has_ai_access: true,
    features: [
      'Até 5 membros da família',
      '60 créditos de IA por mês',
      'Mural Escolar: até 2 importações de PDF/Foto por mês',
      'Agenda Inteligente via Texto e Áudio',
      'Painel de Resumo & Balanço da Semana'
    ],
    is_active: true,
    monthly_ai_credits: 60,
    allowed_ai_modalities: ['TEXT', 'AUDIO', 'IMAGE', 'PDF'],
  },
  {
    id: 'd3333333-3333-3333-3333-333333333333',
    name: 'Família Pro IA',
    slug: 'pro-ia',
    price_cents: 8990,
    billing_interval: 'MONTHLY',
    max_members: 8,
    has_ai_access: true,
    features: [
      'Até 8 membros da família',
      '160 créditos de IA por mês (Multimodal Completo)',
      'Mural Escolar: Importação ILIMITADA de PDFs, Word e Fotos',
      'Aglutinação de Provas, Checklists e Trabalhos Embutidos',
      'Armazenamento dos PDFs originais anexados aos cards'
    ],
    is_active: true,
    monthly_ai_credits: 160,
    allowed_ai_modalities: ['TEXT', 'AUDIO', 'IMAGE', 'PDF', 'DOCX'],
  },
  {
    id: 'd4444444-4444-4444-4444-444444444444',
    name: 'Família Pro IA Anual',
    slug: 'pro-ia-anual',
    price_cents: 87990,
    billing_interval: 'YEARLY',
    max_members: 10,
    has_ai_access: true,
    features: [
      'Economia de R$ 198,90 no ano (equivale a R$ 73,32/mês)',
      'Até 10 membros da família',
      'Dobro de IA: 320 créditos de IA todo mês',
      'Cobertura completa para múltiplos filhos o ano letivo inteiro',
      'Mural Escolar Ilimitado (PDFs, Word e Fotos) + Anexos'
    ],
    is_active: true,
    monthly_ai_credits: 320,
    allowed_ai_modalities: ['TEXT', 'AUDIO', 'IMAGE', 'PDF', 'DOCX'],
  },
];

export const FamilyManageModal: React.FC<FamilyManageModalProps> = ({
  isOpen,
  onClose,
  family,
  members,
  onUpdateFamily,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onToast,
}) => {
  const [familyName, setFamilyName] = useState(family.name);
  const [isUpdatingFamily, setIsUpdatingFamily] = useState(false);
  const [familySuccess, setFamilySuccess] = useState(false);

  // Estado para novo membro
  const [newName, setNewName] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [newAvatar, setNewAvatar] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<MemberRole>('CHILD');
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0]);
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Estados de edição por membro
  const [editingMembers, setEditingMembers] = useState<{ [id: string]: FamilyMember }>(
    () => members.reduce((acc, m) => ({ ...acc, [m.id]: { ...m } }), {})
  );
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [invitingMemberId, setInvitingMemberId] = useState<string | null>(null);

  // Estado para abrir o AvatarPickerModal para um membro ou para o novo membro
  const [avatarPickerTarget, setAvatarPickerTarget] = useState<{
    memberId: string | 'new';
    color: string;
    name: string;
    avatar: string | null;
  } | null>(null);

  // Aba ativa do modal: 'members' ou 'billing'
  const [modalTab, setModalTab] = useState<'members' | 'billing'>('members');

  // Estado da Assinatura Asaas
  const defaultAdmin = members.find((m) => m.role === 'ADMIN') || members[0];
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>('pro-ia');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
  const [holderName, setHolderName] = useState<string>(defaultAdmin?.name || family.name || '');
  const [holderCpfCnpj, setHolderCpfCnpj] = useState<string>('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionSuccess, setSubscriptionSuccess] = useState<any | null>(null);
  const [pixCopied, setPixCopied] = useState(false);

  // Lista dinâmica de planos vindos diretamente do banco de dados (public.plans)
  const [availablePlans, setAvailablePlans] = useState<Plan[]>(DEFAULT_PLANS_FALLBACK);

  useEffect(() => {
    async function loadLivePlans() {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .eq('is_active', true)
          .gt('price_cents', 0)
          .order('price_cents', { ascending: true });

        if (!error && data && data.length > 0) {
          setAvailablePlans(
            data.map((p) => ({
              ...p,
              features: Array.isArray(p.features) ? p.features : [],
              monthly_ai_credits: p.monthly_ai_credits ?? (p.has_ai_access ? 160 : 0),
              allowed_ai_modalities: Array.isArray(p.allowed_ai_modalities)
                ? p.allowed_ai_modalities
                : (p.has_ai_access ? ['TEXT', 'AUDIO', 'IMAGE', 'PDF'] : []),
            }))
          );
        }
      } catch (err) {
        console.warn('[Billing] Falha ao consultar public.plans:', err);
      }
    }

    if (isOpen) {
      loadLivePlans();
    }
  }, [isOpen]);

  const handleSubscribeAsaas = async () => {
    if (!validateCpfCnpj(holderCpfCnpj)) {
      if (onToast) {
        onToast('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido para emitir a cobrança no Asaas.', 'error');
      }
      return;
    }

    const chosenPlan = availablePlans.find((p) => p.slug === selectedPlanSlug) || availablePlans[0];
    try {
      setIsSubscribing(true);
      const res = await createSubscription(
        `cus_fam_${family.id.slice(0, 8)}`,
        chosenPlan,
        paymentMethod,
        {
          familyId: family.id,
          customerName: holderName.trim() || family.name,
          customerEmail: defaultAdmin?.email || undefined,
          cpfCnpj: holderCpfCnpj
        }
      );
      setSubscriptionSuccess(res);
      if (onToast) {
        onToast(`🎉 Assinatura do ${chosenPlan.name} gerada via Asaas (${paymentMethod})!`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      if (onToast) {
        onToast(`Erro ao gerar assinatura Asaas: ${err.message}`, 'error');
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  if (!isOpen) return null;

  const handleSaveFamilyName = async () => {
    if (!familyName.trim() || familyName === family.name) return;
    try {
      setIsUpdatingFamily(true);
      await onUpdateFamily(familyName.trim());
      setFamilySuccess(true);
      setTimeout(() => setFamilySuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingFamily(false);
    }
  };

  const handleAddNewMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      setIsAddingMember(true);
      await onAddMember({
        name: newName.trim(),
        nickname: newNickname.trim() || null,
        avatar: newAvatar,
        email: newEmail.trim() || null,
        role: newRole,
        color: newColor,
      });
      setNewName('');
      setNewNickname('');
      setNewAvatar(null);
      setNewEmail('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleSendInvite = async (member: FamilyMember) => {
    if (!member.email || member.role === 'CHILD') return;
    try {
      setInvitingMemberId(member.id);
      await supabase.auth.signInWithOtp({
        email: member.email.trim(),
        options: {
          data: { family_id: member.family_id },
          emailRedirectTo: window.location.origin,
        },
      });
      if (onToast) {
        onToast(`Convite de acesso enviado com sucesso para ${member.email}!`, 'success');
      } else {
        alert(`Convite de acesso enviado com sucesso para ${member.email}!`);
      }
    } catch (err: any) {
      console.error('[Invite] Erro ao enviar convite:', err);
      if (onToast) {
        onToast(`Erro ao enviar convite: ${err.message || 'Falha de comunicação'}`, 'error');
      } else {
        alert(`Erro ao enviar convite: ${err.message || 'Falha de comunicação'}`);
      }
    } finally {
      setInvitingMemberId(null);
    }
  };

  const handleMemberFieldChange = (id: string, field: keyof FamilyMember, val: any) => {
    setEditingMembers((prev) => {
      const current = prev[id] || members.find((m) => m.id === id);
      if (!current) return prev;
      return {
        ...prev,
        [id]: {
          ...current,
          [field]: val,
        },
      };
    });
  };

  const handleSaveMember = async (id: string) => {
    const updated = editingMembers[id];
    if (!updated || !updated.name.trim()) return;
    try {
      setSavingMemberId(id);
      await onUpdateMember(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingMemberId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja remover ${name} da família?`)) {
      try {
        await onDeleteMember(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-5 sm:p-8 shadow-2xl border border-sky-100/80 flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Puxador Mobile (Drag Handle) */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden shrink-0" aria-hidden="true" />

        {/* Header do Modal */}
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl shrink-0">👥</span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
                Gestão da Família
              </h2>
              <p className="text-xs text-slate-600 line-clamp-2">
                Gerencie o nome da família e os membros cadastrados no Supabase
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-700 font-bold text-lg p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Abas do Modal */}
        <div className="flex border-b border-slate-100 gap-2 sm:gap-4 pt-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setModalTab('members')}
            className={`pb-3 px-1 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              modalTab === 'members'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Membros & Família</span>
          </button>
          <button
            type="button"
            onClick={() => setModalTab('billing')}
            className={`pb-3 px-1 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              modalTab === 'billing'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>Plano & Assinatura</span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 rounded-full font-bold">
              Asaas
            </span>
          </button>
        </div>

        {/* Conteúdo com scroll vertical (sem overflow horizontal) */}
        <div className="overflow-y-auto overflow-x-hidden py-4 sm:py-5 space-y-5 flex-1 pr-0.5">
          {modalTab === 'members' ? (
            <>
              {/* Seção: Nome da Família */}
          <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <label htmlFor="manage-family-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Nome da Família
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="manage-family-name"
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                className="w-full sm:flex-1 min-w-0 text-base sm:text-sm font-semibold px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              />
              <button
                type="button"
                onClick={handleSaveFamilyName}
                disabled={isUpdatingFamily || !familyName.trim() || familyName === family.name}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer shrink-0 whitespace-nowrap"
              >
                {isUpdatingFamily ? 'Salvando...' : familySuccess ? '✓ Salvo!' : 'Salvar Nome'}
              </button>
            </div>
          </div>

          {/* Seção: Convidar Cônjuge/Responsável */}
          <div className="bg-sky-50/80 p-3.5 sm:p-4 rounded-2xl border border-sky-200/90 space-y-2">
            <label htmlFor="manage-invite-url" className="block text-xs font-bold uppercase tracking-wider text-sky-900">
              🔗 Convidar Cônjuge/Responsável
            </label>
            <p className="text-xs text-sky-800 leading-relaxed">
              Compartilhe o link abaixo para outro adulto acessar e gerenciar a família.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="manage-invite-url"
                type="text"
                readOnly
                value={getFamilyInviteUrl(family.id)}
                className="w-full sm:flex-1 min-w-0 truncate text-xs font-mono px-3.5 py-2.5 bg-white rounded-xl border border-sky-200 text-sky-950 focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={() => {
                  const inviteUrl = getFamilyInviteUrl(family.id);
                  navigator.clipboard.writeText(inviteUrl);
                  if (onToast) {
                    onToast('🔗 Link de convite copiado para a área de transferência!', 'success');
                  } else {
                    alert('Link de convite copiado com sucesso!');
                  }
                }}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center justify-center"
              >
                Copiar Link de Convite
              </button>
            </div>
          </div>

          {/* Seção: Lista de Membros */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Membros Cadastrados ({members.length})
              </h3>
            </div>

            <div className="space-y-3">
              {members.map((m) => {
                const current = editingMembers[m.id] || m;
                const hasChanged =
                  current.name !== m.name ||
                  (current.nickname || '') !== (m.nickname || '') ||
                  (current.avatar || '') !== (m.avatar || '') ||
                  (current.email || '') !== (m.email || '') ||
                  current.role !== m.role ||
                  current.color !== m.color;

                return (
                  <div
                    key={m.id}
                    className="p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 flex flex-col gap-3 transition-all shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      {/* Linha 1 no Mobile / Desktop integrado */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Seletor de Avatar */}
                        <button
                          type="button"
                          onClick={() =>
                            setAvatarPickerTarget({
                              memberId: m.id,
                              color: current.color,
                              name: current.nickname || current.name,
                              avatar: current.avatar || null,
                            })
                          }
                          className="p-1 rounded-xl border border-slate-200 hover:border-sky-400 hover:ring-2 hover:ring-sky-100 transition-all cursor-pointer bg-white shrink-0"
                          title="Escolher ícone do membro"
                          aria-label={`Escolher ícone de ${current.name}`}
                        >
                          <MemberAvatar member={current} size="sm" />
                        </button>

                        {/* Nome Completo */}
                        <div className="flex-1 min-w-0">
                          <input
                            aria-label="Nome completo do membro"
                            type="text"
                            value={current.name}
                            onChange={(e) => handleMemberFieldChange(m.id, 'name', e.target.value)}
                            placeholder="Nome completo (ex: Flavio Dias Santiago)"
                            className="w-full text-base sm:text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>

                        {/* Ações Salvar / Deletar no topo (Mobile) */}
                        <div className="flex items-center gap-1.5 shrink-0 sm:hidden">
                          {hasChanged && (
                            <button
                              type="button"
                              onClick={() => handleSaveMember(m.id)}
                              disabled={savingMemberId === m.id}
                              className="min-h-[38px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
                            >
                              {savingMemberId === m.id ? '...' : 'Salvar'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(m.id, m.name)}
                            className="min-w-[38px] min-h-[38px] flex items-center justify-center text-slate-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remover membro"
                            aria-label={`Remover ${m.name}`}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Linha 2 no Mobile / Continuação no Desktop */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Seletor de Cor */}
                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg py-1 px-2 border border-slate-200">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: current.color }} />
                          <select
                            aria-label={`Cor de ${current.name}`}
                            value={current.color}
                            onChange={(e) => handleMemberFieldChange(m.id, 'color', e.target.value)}
                            className="text-base sm:text-xs bg-transparent border-none text-slate-700 cursor-pointer outline-none"
                          >
                            {COLOR_PALETTE.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Papel */}
                        <select
                          aria-label={`Papel de ${current.name}`}
                          value={current.role}
                          onChange={(e) =>
                            handleMemberFieldChange(m.id, 'role', e.target.value as MemberRole)
                          }
                          className="flex-1 sm:flex-initial text-base sm:text-xs font-semibold bg-slate-100 rounded-lg px-2.5 py-1.5 border border-slate-200 text-slate-700 cursor-pointer shrink-0"
                        >
                          <option value="ADMIN">Adulto (Admin)</option>
                          <option value="MEMBER">Adulto (Membro)</option>
                          <option value="CHILD">Criança</option>
                        </select>

                        {/* Ações Salvar / Deletar no Desktop */}
                        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                          {hasChanged && (
                            <button
                              type="button"
                              onClick={() => handleSaveMember(m.id)}
                              disabled={savingMemberId === m.id}
                              className="min-h-[38px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
                            >
                              {savingMemberId === m.id ? '...' : 'Salvar'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(m.id, m.name)}
                            className="min-w-[38px] min-h-[38px] flex items-center justify-center text-slate-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remover membro"
                            aria-label={`Remover ${m.name}`}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Campo Nickname / Como é chamado na casa */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 pt-2 border-t border-slate-100">
                      <label htmlFor={`member-nick-${m.id}`} className="text-[11px] font-semibold text-slate-600 leading-snug">
                        Como é chamado(a) na casa? (Apelido ou Primeiro Nome):
                      </label>
                      <input
                        id={`member-nick-${m.id}`}
                        type="text"
                        value={current.nickname || ''}
                        onChange={(e) => handleMemberFieldChange(m.id, 'nickname', e.target.value)}
                        placeholder="Ex: Flávio, Rafa, Pai, Mãe"
                        className="w-full sm:flex-1 min-w-0 text-base sm:text-xs px-3 py-2 sm:py-1.5 bg-slate-50/70 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>

                    {/* Campo E-mail e Disparo de Convite */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 pt-2 border-t border-slate-100">
                      <label htmlFor={`member-email-${m.id}`} className="text-[11px] font-semibold text-slate-600 leading-snug">
                        E-mail (opcional para crianças, necessário para acesso):
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:flex-1 min-w-0">
                        <input
                          id={`member-email-${m.id}`}
                          type="email"
                          value={current.email || ''}
                          onChange={(e) => handleMemberFieldChange(m.id, 'email', e.target.value)}
                          placeholder="exemplo@email.com"
                          className="w-full sm:flex-1 min-w-0 text-base sm:text-xs px-3 py-2 sm:py-1.5 bg-slate-50/70 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                        />

                        {/* Botão de Disparo Rápido de Convite */}
                        {current.role !== 'CHILD' && current.email && (
                          <button
                            type="button"
                            onClick={() => handleSendInvite(current)}
                            disabled={invitingMemberId === m.id}
                            className="w-full sm:w-auto min-h-[38px] px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                            title="Disparar convite de acesso para o e-mail cadastrado"
                          >
                            <span>{invitingMemberId === m.id ? 'Enviando...' : '✉️ Enviar Convite'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seção: Adicionar Novo Membro */}
          <form
            onSubmit={handleAddNewMember}
            className="p-3.5 sm:p-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 space-y-3"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              + Adicionar Novo Membro
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="add-member-name" className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  id="add-member-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Flavio Dias Santiago"
                  className="w-full text-base sm:text-xs font-medium px-3 py-2.5 sm:py-2 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="add-member-nickname" className="block text-[11px] font-bold text-slate-700 mb-1">
                  Como é chamado(a) na casa? (Apelido ou Primeiro Nome)
                </label>
                <input
                  id="add-member-nickname"
                  type="text"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  placeholder="Ex: Flávio, Rafa, Pai, Mãe"
                  className="w-full text-base sm:text-xs font-medium px-3 py-2.5 sm:py-2 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="add-member-email" className="block text-[11px] font-bold text-slate-700 mb-1">
                E-mail (opcional para crianças, necessário para acesso)
              </label>
              <input
                id="add-member-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="exemplo@email.com"
                className="w-full text-base sm:text-xs font-medium px-3 py-2.5 sm:py-2 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                <select
                  aria-label="Papel do novo membro"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as MemberRole)}
                  className="flex-1 sm:flex-initial text-base sm:text-xs font-semibold bg-white rounded-xl px-3 py-2 border border-slate-200 text-slate-700 cursor-pointer"
                >
                  <option value="CHILD">Criança</option>
                  <option value="ADMIN">Adulto (Admin)</option>
                  <option value="MEMBER">Adulto (Membro)</option>
                </select>

                <div className="flex items-center gap-1.5 shrink-0 bg-white px-2 py-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() =>
                      setAvatarPickerTarget({
                        memberId: 'new',
                        color: newColor,
                        name: newNickname || newName || 'Novo Membro',
                        avatar: newAvatar,
                      })
                    }
                    className="p-1 rounded-lg hover:ring-2 hover:ring-sky-200 transition-all cursor-pointer"
                    title="Escolher ícone do novo membro"
                  >
                    <MemberAvatar
                      member={{ name: newNickname || newName || 'Novo', color: newColor, avatar: newAvatar }}
                      size="xs"
                    />
                  </button>
                  <select
                    aria-label="Cor do novo membro"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="text-base sm:text-xs bg-transparent text-slate-700 border-none outline-none cursor-pointer"
                  >
                    {COLOR_PALETTE.map((c) => (
                      <option key={c} value={c}>
                        ● {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isAddingMember || !newName.trim()}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
              >
                {isAddingMember ? 'Adicionando...' : '+ Adicionar Membro'}
              </button>
            </div>
          </form>
            </>
          ) : (
            <div className="space-y-6">
              {/* Card de Status do Plano Atual */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-md space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
                      Plano Atual da Família
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      family.plan_status === 'PAST_DUE'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                        : family.plan_status === 'TRIALING'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                    }`}
                  >
                    {family.plan_status === 'TRIALING'
                      ? 'Degustação Ativa (14 Dias)'
                      : family.plan_status === 'PAST_DUE'
                      ? 'Pagamento Pendente'
                      : 'Assinatura Ativa'}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-black text-white">
                    {family.plan_name || 'Família Pro IA'}
                  </h3>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Mural Escolar & Provas com IA, Agenda Inteligente e sincronização em tempo real.
                  </p>
                </div>

                {/* Barra de Consumo de Créditos IA da Família */}
                {(() => {
                  const used = Number(family.ai_credits_used || 0);
                  const limit = Number(family.ai_credits_limit || 160);
                  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                  return (
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-indigo-800/60 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-indigo-200">
                          ⚡ Consumo de Créditos IA no Ciclo
                        </span>
                        <span className="font-black text-amber-300">
                          {used} / {limit} créditos ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 90 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-indigo-300">
                        Pesos: Texto = 1 créd. • Voz = 2 créd. • Foto = 3 créd. • PDF/Word no Mural = 5 créd.
                      </p>
                    </div>
                  );
                })()}

                <div className="pt-2 border-t border-indigo-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-300">
                  <span>
                    Renovação/Vencimento: {family.plan_expires_at || 'em 14 dias'} (
                    {family.plan_days_remaining ?? 14} dias restantes)
                  </span>
                  <span className="font-semibold text-white">
                    {family.plan_status === 'TRIALING' ? 'Período de Avaliação' : 'Ciclo Vigente'}
                  </span>
                </div>
              </div>

              {/* Seção: Escolha de Novo Plano ou Renovação */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Selecione seu Plano de Assinatura
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Cobrança segura e automatizada via Asaas (Pix Instantâneo ou Cartão de Crédito)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {availablePlans.map((plan) => {
                    const isSelected = selectedPlanSlug === plan.slug;
                    const isYearly = plan.billing_interval === 'YEARLY';
                    const priceFormatted = formatCentsToBRL(plan.price_cents);
                    const aiCredits = plan.monthly_ai_credits ?? 0;
                    const modalities = plan.allowed_ai_modalities || [];

                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlanSlug(plan.slug)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-xs'
                        }`}
                      >
                        <div className="space-y-2.5">
                          {/* Nome e Seleção */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                              {plan.name}
                            </span>
                            {isSelected && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                                <span>Escolhido</span>
                              </span>
                            )}
                          </div>

                          {/* Pílula Chamativa com Créditos de IA */}
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-500/15 via-indigo-500/15 to-purple-500/15 text-indigo-950 border border-indigo-200 shadow-2xs">
                            <span className="text-amber-500">⚡</span>
                            <span>{aiCredits} Créditos de IA / mês</span>
                          </div>

                          {/* Selos de Mídias Suportadas */}
                          <div className="flex flex-wrap items-center gap-1">
                            {modalities.includes('TEXT') && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100 flex items-center gap-0.5">
                                <span>📝</span> Texto
                              </span>
                            )}
                            {modalities.includes('AUDIO') && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-0.5">
                                <span>🎙️</span> Voz
                              </span>
                            )}
                            {modalities.includes('IMAGE') && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100 flex items-center gap-0.5">
                                <span>📸</span> Fotos
                              </span>
                            )}
                            {modalities.includes('PDF') && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-0.5">
                                <span>📄</span> PDFs
                              </span>
                            )}
                            {modalities.length === 0 && (
                              <span className="text-[10px] font-medium text-slate-400 italic">
                                Sem IA multimodal
                              </span>
                            )}
                          </div>

                          {/* Formatação Monetária Limpa Padrão Brasileiro */}
                          <div className="pt-0.5">
                            <span className="text-lg font-black text-slate-900">
                              {priceFormatted}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              /{isYearly ? 'ano' : 'mês'}
                            </span>
                          </div>

                          {/* Lista de Benefícios lida diretamente da coluna features (JSONB) */}
                          <ul className="text-[11px] text-slate-600 space-y-1 pt-1.5 border-t border-slate-100">
                            <li className="font-semibold text-slate-700 flex items-center gap-1">
                              <span>👥</span> Até {plan.max_members} membros
                            </li>
                            {Array.isArray(plan.features) &&
                              plan.features.map((f, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                                  <span className="leading-tight">{f}</span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dados do Titular e Forma de Pagamento (Gateway Asaas) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Dados para Emissão da Assinatura (Gateway Asaas)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nome Completo ou Razão Social *
                    </label>
                    <input
                      type="text"
                      value={holderName}
                      onChange={(e) => setHolderName(e.target.value)}
                      placeholder="Ex: Flávio Dias Santiago"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      CPF ou CNPJ do Titular * <span className="text-slate-400 font-normal">(Obrigatório Banco Central/Pix)</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={holderCpfCnpj}
                      onChange={(e) => setHolderCpfCnpj(formatCpfCnpjMask(e.target.value))}
                      placeholder="000.000.000-00"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PIX')}
                    className={`min-h-[44px] p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      paymentMethod === 'PIX'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Pix Instantâneo (QR Code)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CREDIT_CARD')}
                    className={`min-h-[44px] p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      paymentMethod === 'CREDIT_CARD'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Cartão de Crédito Recorrente</span>
                  </button>
                </div>
              </div>

              {/* Botão de Ação: Assinar Plano via Asaas */}
              <button
                type="button"
                onClick={handleSubscribeAsaas}
                disabled={isSubscribing}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubscribing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Gerando cobrança segura no Asaas...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Assinar Plano via Asaas ({paymentMethod === 'PIX' ? 'Pix' : 'Cartão'})</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              {/* Feedback de Assinatura Gerada com Sucesso */}
              {subscriptionSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 font-extrabold text-emerald-900 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Cobrança Asaas Gerada com Sucesso!</span>
                    </div>
                    <code className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-emerald-200">
                      ID: {subscriptionSuccess.id}
                    </code>
                  </div>

                  {subscriptionSuccess.pixQrCodeImage && (
                    <div className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl border border-emerald-200 w-fit mx-auto">
                      <img
                        src={subscriptionSuccess.pixQrCodeImage}
                        alt="QR Code Pix Asaas"
                        className="w-44 h-44 object-contain"
                      />
                      <span className="text-[11px] font-bold text-slate-600 mt-1">
                        Escaneie com o aplicativo do seu banco
                      </span>
                    </div>
                  )}

                  {subscriptionSuccess.pixQrCode && (
                    <div className="space-y-2">
                      <span className="block text-[11px] font-bold text-emerald-900">
                        Código Pix Copia e Cola:
                      </span>
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-200 font-mono text-[11px] break-all select-all">
                        {subscriptionSuccess.pixQrCode}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(subscriptionSuccess.pixQrCode);
                          setPixCopied(true);
                          if (onToast) onToast('Código Pix copiado para a área de transferência!', 'success');
                          setTimeout(() => setPixCopied(false), 3000);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {pixCopied ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Código Pix Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copiar Código Pix (Copia e Cola)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {subscriptionSuccess.paymentLink && (
                    <div className="pt-1">
                      <a
                        href={subscriptionSuccess.paymentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <span>Abrir Fatura Completa / Cartão no Asaas ↗</span>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Selo de Segurança */}
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium pt-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Processamento criptografado pelo gateway bancário Asaas. Cancele quando quiser.</span>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="pt-3.5 border-t border-slate-100 flex justify-end shrink-0 pb-[env(safe-area-inset-bottom,0px)]">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Modal Seletor de Ícones Font Awesome */}
      <AvatarPickerModal
        isOpen={!!avatarPickerTarget}
        onClose={() => setAvatarPickerTarget(null)}
        selectedAvatarId={avatarPickerTarget?.avatar}
        memberColor={avatarPickerTarget?.color || '#0284C7'}
        memberName={avatarPickerTarget?.name || 'Membro'}
        onSelectAvatar={(avatarId) => {
          if (!avatarPickerTarget) return;
          if (avatarPickerTarget.memberId === 'new') {
            setNewAvatar(avatarId);
          } else {
            handleMemberFieldChange(avatarPickerTarget.memberId, 'avatar', avatarId);
          }
        }}
      />
    </div>
  );
};
