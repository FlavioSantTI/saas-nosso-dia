import React, { useState } from 'react';
import { MemberRole } from '../types';

interface OnboardingMember {
  id: string;
  name: string;
  role: MemberRole;
  color: string;
}

interface OnboardingProps {
  onComplete: (data: {
    familyName: string;
    members: Array<{ name: string; role: MemberRole; color: string }>;
  }) => Promise<void>;
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

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [familyName, setFamilyName] = useState('Família Santiago');
  const [members, setMembers] = useState<OnboardingMember[]>([
    { id: '1', name: 'Flávio', role: 'ADMIN', color: '#0284C7' },
    { id: '2', name: 'Silvia', role: 'ADMIN', color: '#EA580C' },
    { id: '3', name: 'Rafael', role: 'CHILD', color: '#059669' },
  ]);

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<MemberRole>('CHILD');
  const [newMemberColor, setNewMemberColor] = useState(COLOR_PALETTE[4]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const newMember: OnboardingMember = {
      id: `temp_${Date.now()}`,
      name: newMemberName.trim(),
      role: newMemberRole,
      color: newMemberColor,
    };
    setMembers([...members, newMember]);
    setNewMemberName('');
    // Altera a cor padrão para a próxima do picker
    const nextColorIndex = (COLOR_PALETTE.indexOf(newMemberColor) + 1) % COLOR_PALETTE.length;
    setNewMemberColor(COLOR_PALETTE[nextColorIndex]);
  };

  const handleRemoveMember = (id: string) => {
    setMembers(members.filter((m) => m.id !== id));
  };

  const handleMemberChange = (id: string, field: keyof OnboardingMember, value: any) => {
    setMembers(
      members.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!familyName.trim()) {
      setErrorMsg('Por favor, informe o nome da sua família.');
      return;
    }

    if (members.length === 0) {
      setErrorMsg('Adicione pelo menos um membro para sua família.');
      return;
    }

    const invalidMembers = members.some((m) => !m.name.trim());
    if (invalidMembers) {
      setErrorMsg('Todos os membros precisam ter um nome preenchido.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onComplete({
        familyName: familyName.trim(),
        members: members.map((m) => ({
          name: m.name.trim(),
          role: m.role,
          color: m.color,
        })),
      });
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (msg.includes('Failed to fetch') || msg.includes('fetch')) {
        setErrorMsg(
          'Erro de Conexão: Não foi possível alcançar o banco de dados Supabase. Verifique se o VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo apps/web/.env estão preenchidos com a URL e chave do seu projeto Supabase.'
        );
      } else {
        setErrorMsg(err?.message || 'Ocorreu um erro ao salvar os dados da família.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 to-slate-800 text-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-10 border border-slate-100 flex flex-col">
        {/* Header de Boas-Vindas */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            ND
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Bem-vindo ao Nosso Dia! 📅
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Vamos configurar sua família para sincronizar as rotinas, atividades e responsáveis em um só lugar.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome da Família */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Nome da Família (Tenant)
            </label>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="Ex: Família Santiago, Família Silva..."
              className="w-full text-base font-semibold px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-slate-50/50"
              required
            />
          </div>

          {/* Membros da Família */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Membros da Família ({members.length})
              </label>
              <span className="text-[11px] text-slate-400">
                Defina adultos (responsáveis) e dependentes
              </span>
            </div>

            {/* Lista de Membros Cadastrados */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 sm:gap-3 p-3 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all"
                >
                  {/* Cor do avatar */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="w-4 h-4 rounded-full shadow-xs shrink-0"
                      style={{ backgroundColor: m.color }}
                    />
                    <select
                      value={m.color}
                      onChange={(e) => handleMemberChange(m.id, 'color', e.target.value)}
                      className="text-xs bg-slate-100 rounded-md py-1 px-1.5 border border-slate-200 text-slate-700 cursor-pointer"
                    >
                      {COLOR_PALETTE.map((c) => (
                        <option key={c} value={c}>
                          ● {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Nome */}
                  <input
                    type="text"
                    value={m.name}
                    onChange={(e) => handleMemberChange(m.id, 'name', e.target.value)}
                    placeholder="Nome do membro"
                    className="flex-1 text-sm font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    required
                  />

                  {/* Papel */}
                  <select
                    value={m.role}
                    onChange={(e) => handleMemberChange(m.id, 'role', e.target.value as MemberRole)}
                    className="text-xs font-semibold bg-slate-100 rounded-lg px-2.5 py-2 border border-slate-200 text-slate-700 cursor-pointer"
                  >
                    <option value="ADMIN">Adulto (Admin)</option>
                    <option value="MEMBER">Adulto (Membro)</option>
                    <option value="CHILD">Criança (Dependente)</option>
                  </select>

                  {/* Remover */}
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(m.id)}
                    className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    title="Remover membro"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Adicionar Novo Membro Rápido */}
            <div className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 flex flex-wrap sm:flex-nowrap items-center gap-2">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMember();
                  }
                }}
                placeholder="+ Novo membro (ex: Cecília)"
                className="flex-1 min-w-[140px] text-xs font-medium px-3 py-2 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />

              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as MemberRole)}
                className="text-xs font-semibold bg-white rounded-lg px-2 py-2 border border-slate-200 text-slate-700"
              >
                <option value="CHILD">Criança</option>
                <option value="ADMIN">Adulto (Admin)</option>
                <option value="MEMBER">Adulto</option>
              </select>

              <button
                type="button"
                onClick={handleAddMember}
                disabled={!newMemberName.trim()}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all shrink-0"
              >
                + Adicionar
              </button>
            </div>
          </div>

          {/* Botão de Conclusão */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSubmitting || members.length === 0 || !familyName.trim()}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Criando Família no Supabase...</span>
                </>
              ) : (
                <>
                  <span>🚀 Salvar e Iniciar Semana</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
