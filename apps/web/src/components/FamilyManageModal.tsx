import React, { useState } from 'react';
import { Family, FamilyMember, MemberRole } from '../types';

interface FamilyManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  family: Family;
  members: FamilyMember[];
  onUpdateFamily: (name: string) => Promise<void>;
  onAddMember: (member: { name: string; role: MemberRole; color: string }) => Promise<void>;
  onUpdateMember: (member: FamilyMember) => Promise<void>;
  onDeleteMember: (memberId: string) => Promise<void>;
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

export const FamilyManageModal: React.FC<FamilyManageModalProps> = ({
  isOpen,
  onClose,
  family,
  members,
  onUpdateFamily,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
}) => {
  const [familyName, setFamilyName] = useState(family.name);
  const [isUpdatingFamily, setIsUpdatingFamily] = useState(false);
  const [familySuccess, setFamilySuccess] = useState(false);

  // Estado para novo membro
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<MemberRole>('CHILD');
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0]);
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Estados de edição por membro
  const [editingMembers, setEditingMembers] = useState<{ [id: string]: FamilyMember }>(
    () => members.reduce((acc, m) => ({ ...acc, [m.id]: { ...m } }), {})
  );
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

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
        role: newRole,
        color: newColor,
      });
      setNewName('');
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

        {/* Conteúdo com scroll */}
        <div className="overflow-y-auto py-5 space-y-6 flex-1 pr-1">
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

          {/* Seção: Convidar Responsável */}
          {/* Seção: Convidar Responsável */}
          <div className="bg-sky-50/80 p-4 rounded-2xl border border-sky-200/90 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-sky-800">
              Convidar Responsável
            </label>
            <p className="text-xs text-sky-700 mb-2">
              Compartilhe o link abaixo para outro adulto acessar e gerenciar a família.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/?join_family=${family.id}`}
                className="flex-1 text-xs font-mono px-3 py-2 bg-white rounded-xl border border-sky-200 text-sky-950 focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={() => {
                  const inviteUrl = `${window.location.origin}/?join_family=${family.id}`;
                  navigator.clipboard.writeText(inviteUrl);
                  alert('Link de convite copiado com sucesso!');
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
              >
                Copiar Link
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

            <div className="space-y-2.5">
              {members.map((m) => {
                const current = editingMembers[m.id] || m;
                const hasChanged =
                  current.name !== m.name ||
                  current.role !== m.role ||
                  current.color !== m.color;

                return (
                  <div
                    key={m.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 transition-all shadow-2xs"
                  >
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

                    {/* Nome */}
                    <input
                      type="text"
                      value={current.name}
                      onChange={(e) => handleMemberFieldChange(m.id, 'name', e.target.value)}
                      className="flex-1 min-w-[120px] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />

                    {/* Papel */}
                    <select
                      value={current.role}
                      onChange={(e) =>
                        handleMemberFieldChange(m.id, 'role', e.target.value as MemberRole)
                      }
                      className="text-xs font-semibold bg-slate-100 rounded-lg px-2.5 py-1.5 border border-slate-200 text-slate-700 cursor-pointer"
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
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
                        >
                          {savingMemberId === m.id ? '...' : 'Salvar'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id, m.name)}
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Remover membro"
                      >
                        🗑️
                      </button>
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
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome do novo membro"
                className="flex-1 min-w-[140px] text-xs font-medium px-3 py-2 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />

              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as MemberRole)}
                className="text-xs font-semibold bg-white rounded-lg px-2.5 py-2 border border-slate-200 text-slate-700"
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

              <button
                type="submit"
                disabled={isAddingMember || !newName.trim()}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition-all shadow-xs shrink-0"
              >
                {isAddingMember ? 'Adicionando...' : '+ Adicionar'}
              </button>
            </div>
          </form>
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
