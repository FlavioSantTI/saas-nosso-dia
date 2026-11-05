import React from 'react';
import { AVATAR_ICONS, AvatarIconDef } from '../constants/avatars';
import { X, Check } from 'lucide-react';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAvatarId: string | null | undefined;
  memberColor: string;
  memberName?: string;
  onSelectAvatar: (avatarId: string | null) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  family: '👨‍👩‍👧‍👦 Família & Pessoas',
  learning: '🎓 Estudos & Criatividade',
  sports: '⚽ Esportes & Lazer',
  symbols: '🐾 Símbolos & Pets'
};

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  onClose,
  selectedAvatarId,
  memberColor,
  memberName = 'Membro',
  onSelectAvatar
}) => {
  if (!isOpen) return null;

  const categories = ['family', 'learning', 'sports', 'symbols'] as const;
  const initial = memberName.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-[60] animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-sky-100 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Escolher Ícone de Perfil
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalize o ícone de <strong className="text-slate-700">{memberName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de Ícones com Scroll */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
          {/* Opção Inicial (Padrão) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Padrão
            </span>
            <button
              type="button"
              onClick={() => {
                onSelectAvatar(null);
                onClose();
              }}
              className={`w-full p-2.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                !selectedAvatarId
                  ? 'border-sky-500 bg-sky-50/60 ring-2 ring-sky-200'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-2xs"
                  style={{ backgroundColor: memberColor }}
                >
                  {initial}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800">
                    Inicial do Nome ({initial})
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Exibe a letra inicial com o fundo colorido
                  </p>
                </div>
              </div>
              {!selectedAvatarId && (
                <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </button>
          </div>

          {/* Categorias de Ícones Font Awesome */}
          {categories.map((cat) => {
            const icons = AVATAR_ICONS.filter((i) => i.category === cat);
            return (
              <div key={cat} className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {CATEGORY_LABELS[cat] || cat}
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {icons.map((icon: AvatarIconDef) => {
                    const isSelected = selectedAvatarId === icon.id;
                    return (
                      <button
                        key={icon.id}
                        type="button"
                        onClick={() => {
                          onSelectAvatar(icon.id);
                          onClose();
                        }}
                        title={icon.name}
                        className={`group relative p-2 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-200 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-2xs transition-transform group-hover:scale-105"
                          style={{ backgroundColor: memberColor }}
                        >
                          <svg
                            viewBox={icon.viewBox}
                            className="w-5 h-5 fill-current"
                            aria-hidden="true"
                          >
                            <path d={icon.path} />
                          </svg>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600 text-center line-clamp-1 leading-tight">
                          {icon.name}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé */}
        <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
