import React, { useState, useEffect } from 'react';
import { Family, FamilyMember, MemberRole, Plan } from '../types';
import { getFamilyInviteUrl } from '../lib/url';
import { createSubscription, formatCentsToBRL } from '../lib/asaas';
import { supabase } from '../lib/supabase';
import { CreditCard, Users, ShieldCheck, CheckCircle2, Sparkles, QrCode, ArrowRight } from 'lucide-react';

interface FamilyManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  family: Family;
  members: FamilyMember[];
  onUpdateFamily: (name: string) => Promise<void>;
  onAddMember: (member: { name: string; nickname?: string | null; role: MemberRole; color: string }) => Promise<void>;
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
    price_cents: 2990,
    billing_interval: 'MONTHLY',
    max_members: 5,
    has_ai_access: false,
    features: ['Até 5 membros', 'Sincronização ilimitada', 'Painel de Resumo & Balanço', 'Lembretes'],
    is_active: true,
    monthly_ai_credits: 0,
    allowed_ai_modalities: [],
  },
  {
    id: 'd3333333-3333-3333-3333-333333333333',
    name: 'Família Pro IA',
    slug: 'pro-ia',
    price_cents: 4990,
    billing_interval: 'MONTHLY',
    max_members: 10,
    has_ai_access: true,
    features: ['Até 10 membros', 'Captura Inteligente Gemini IA', 'Briefing Matinal', 'Suporte VIP'],
    is_active: true,
    monthly_ai_credits: 100,
    allowed_ai_modalities: ['TEXT', 'AUDIO', 'IMAGE', 'PDF'],
  },
  {
    id: 'd4444444-4444-4444-4444-444444444444',
    name: 'Família Pro IA Anual',
    slug: 'pro-ia-anual',
    price_cents: 47880,
    billing_interval: 'YEARLY',
    max_members: 10,
    has_ai_access: true,
    features: ['2 meses grátis (economia R$ 120)', 'Acesso Completo IA', 'Membros ilimitados', 'Briefing e Resumo'],
    is_active: true,
    monthly_ai_credits: 150,
    allowed_ai_modalities: ['TEXT', 'AUDIO', 'IMAGE', 'PDF'],
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
  const [newRole, setNewRole] = useState<MemberRole>('CHILD');
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0]);
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Estados de edição por membro
  const [editingMembers, setEditingMembers] = useState<{ [id: string]: FamilyMember }>(
    () => members.reduce((acc, m) => ({ ...acc, [m.id]: { ...m } }), {})
  );
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  // Aba ativa do modal: 'members' ou 'billing'
  const [modalTab, setModalTab] = useState<'members' | 'billing'>('members');

  // Estado da Assinatura Asaas
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>('pro-ia');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionSuccess, setSubscriptionSuccess] = useState<any | null>(null);

  // Lista dinâmica de planos vindos diretamente do banco de dados (public.plans)
  const [availablePlans, setAvailablePlans] = useState<Plan[]>(DEFAULT_PLANS_FALLBACK);

  useEffect(() => {
    async function loadLivePlans() {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .eq('is_active', true)
          .order('price_cents', { ascending: true });

        if (!error && data && data.length > 0) {
          setAvailablePlans(
            data.map((p) => ({
              ...p,
              features: Array.isArray(p.features) ? p.features : [],
              monthly_ai_credits: p.monthly_ai_credits ?? (p.has_ai_access ? 100 : 0),
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
    const chosenPlan = availablePlans.find((p) => p.slug === selectedPlanSlug) || availablePlans[0];
    try {
      setIsSubscribing(true);
      const res = await createSubscription(`cus_fam_${family.id.slice(0, 8)}`, chosenPlan, paymentMethod);
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
        role: newRole,
        color: newColor,
      });
      setNewName('');
      setNewNickname('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingMember(false);
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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-sky-100/80 flex flex-col max-h-[90vh]">
        {/* Header do Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">👥</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                Gestão da Família
              </h2>
              <p className="text-xs text-slate-500">
                Gerencie o nome da família e os membros cadastrados no Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Abas do Modal */}
        <div className="flex border-b border-slate-100 gap-4 pt-1">
          <button
            type="button"
            onClick={() => setModalTab('members')}
            className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              modalTab === 'members'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Membros & Família</span>
          </button>
          <button
            type="button"
            onClick={() => setModalTab('billing')}
            className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              modalTab === 'billing'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Plano & Assinatura</span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 rounded-full font-bold">
              Asaas
            </span>
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="overflow-y-auto py-5 space-y-6 flex-1 pr-1">
          {modalTab === 'members' ? (
            <>
              {/* Seção: Nome da Família */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Nome da Família
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                className="flex-1 text-sm font-semibold px-3 py-2 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              />
              <button
                type="button"
                onClick={handleSaveFamilyName}
                disabled={isUpdatingFamily || !familyName.trim() || familyName === family.name}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
              >
                {isUpdatingFamily ? 'Salvando...' : familySuccess ? '✓ Salvo!' : 'Salvar Nome'}
              </button>
            </div>
          </div>

          {/* Seção: Convidar Cônjuge/Responsável */}
          <div className="bg-sky-50/80 p-4 rounded-2xl border border-sky-200/90 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-sky-800">
              🔗 Convidar Cônjuge/Responsável
            </label>
            <p className="text-xs text-sky-700 mb-2">
              Compartilhe o link abaixo para outro adulto acessar e gerenciar a família.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={getFamilyInviteUrl(family.id)}
                className="flex-1 text-xs font-mono px-3 py-2 bg-white rounded-xl border border-sky-200 text-sky-950 focus:outline-none select-all"
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
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
              >
                Copiar Link de Convite
              </button>
            </div>
          </div>

          {/* Seção: Lista de Membros */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Membros Cadastrados ({members.length})
              </h3>
            </div>

            <div className="space-y-3">
              {members.map((m) => {
                const current = editingMembers[m.id] || m;
                const hasChanged =
                  current.name !== m.name ||
                  (current.nickname || '') !== (m.nickname || '') ||
                  current.role !== m.role ||
                  current.color !== m.color;

                return (
                  <div
                    key={m.id}
                    className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 flex flex-col gap-2.5 transition-all shadow-2xs"
                  >
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
                      {/* Seletor de Cor */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="w-4 h-4 rounded-full shadow-xs shrink-0"
                          style={{ backgroundColor: current.color }}
                        />
                        <select
                          value={current.color}
                          onChange={(e) => handleMemberFieldChange(m.id, 'color', e.target.value)}
                          className="text-xs bg-slate-100 rounded-md py-1 px-1.5 border border-slate-200 text-slate-700 cursor-pointer"
                        >
                          {COLOR_PALETTE.map((c) => (
                            <option key={c} value={c}>
                              ● {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Nome Completo */}
                      <div className="flex-1 min-w-[130px]">
                        <input
                          type="text"
                          value={current.name}
                          onChange={(e) => handleMemberFieldChange(m.id, 'name', e.target.value)}
                          placeholder="Nome completo (ex: Flavio Dias Santiago)"
                          className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>

                      {/* Papel */}
                      <select
                        value={current.role}
                        onChange={(e) =>
                          handleMemberFieldChange(m.id, 'role', e.target.value as MemberRole)
                        }
                        className="text-xs font-semibold bg-slate-100 rounded-lg px-2.5 py-1.5 border border-slate-200 text-slate-700 cursor-pointer shrink-0"
                      >
                        <option value="ADMIN">Adulto (Admin)</option>
                        <option value="MEMBER">Adulto (Membro)</option>
                        <option value="CHILD">Criança</option>
                      </select>

                      {/* Ações */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasChanged && (
                          <button
                            type="button"
                            onClick={() => handleSaveMember(m.id)}
                            disabled={savingMemberId === m.id}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
                          >
                            {savingMemberId === m.id ? '...' : 'Salvar'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(m.id, m.name)}
                          className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Remover membro"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Campo Nickname / Como é chamado na casa */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-1 border-t border-slate-100">
                      <label className="text-[11px] font-semibold text-slate-500 shrink-0">
                        Como é chamado(a) na casa? (Apelido ou Primeiro Nome):
                      </label>
                      <input
                        type="text"
                        value={current.nickname || ''}
                        onChange={(e) => handleMemberFieldChange(m.id, 'nickname', e.target.value)}
                        placeholder="Ex: Flávio, Rafa, Pai, Mãe"
                        className="flex-1 text-xs px-2.5 py-1 bg-slate-50/70 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seção: Adicionar Novo Membro */}
          <form
            onSubmit={handleAddNewMember}
            className="p-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 space-y-3"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              + Adicionar Novo Membro
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Flavio Dias Santiago"
                  className="w-full text-xs font-medium px-3 py-2 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Como é chamado(a) na casa? (Apelido ou Primeiro Nome)
                </label>
                <input
                  type="text"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  placeholder="Ex: Flávio, Rafa, Pai, Mãe"
                  className="w-full text-xs font-medium px-3 py-2 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as MemberRole)}
                  className="text-xs font-semibold bg-white rounded-lg px-2.5 py-2 border border-slate-200 text-slate-700 cursor-pointer"
                >
                  <option value="CHILD">Criança</option>
                  <option value="ADMIN">Adulto (Admin)</option>
                  <option value="MEMBER">Adulto (Membro)</option>
                </select>

                <div className="flex items-center gap-1.5 shrink-0 bg-white px-2 py-1 rounded-lg border border-slate-200">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: newColor }} />
                  <select
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="text-xs bg-transparent text-slate-700 border-none outline-none cursor-pointer"
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
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer"
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
                      Plano Atual da Família
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Degustação Ativa (Trial 14 Dias)
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-black text-white">Família Pro IA</h3>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Acesso completo a IA Gemini, sincronização ilimitada e até 10 membros familiares.
                  </p>
                </div>

                <div className="pt-2 border-t border-indigo-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-300">
                  <span>Renovação/Vencimento estimado: em 14 dias</span>
                  <span className="font-semibold text-white">R$ 0,00 no período de testes</span>
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

              {/* Seletor de Forma de Pagamento */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Forma de Pagamento (Gateway Asaas)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PIX')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      paymentMethod === 'PIX'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>Pix Instantâneo (QR Code)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CREDIT_CARD')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      paymentMethod === 'CREDIT_CARD'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-indigo-600" />
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
                    <span>Conectando ao Asaas...</span>
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
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Assinatura Asaas Criada com Sucesso!</span>
                  </div>
                  <p>
                    Código da Assinatura: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-200">{subscriptionSuccess.id}</code>
                  </p>
                  {subscriptionSuccess.paymentLink && (
                    <a
                      href={subscriptionSuccess.paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-indigo-700 underline hover:text-indigo-900"
                    >
                      <span>Abrir Fatura / Link de Pagamento Asaas ↗</span>
                    </a>
                  )}
                  {subscriptionSuccess.pixQrCode && (
                    <div className="p-2.5 bg-white rounded-xl border border-emerald-200 font-mono text-[11px] break-all">
                      {subscriptionSuccess.pixQrCode}
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
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
