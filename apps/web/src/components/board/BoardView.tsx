import React, { useState } from 'react';
import {
  BoardChecklistItem,
  BoardItemType,
  FamilyBoardItem,
  FamilyMember
} from '../../types';
import {
  BOARD_TYPES_LIST,
  BOARD_TYPE_CONFIGS,
  getBoardAttachmentUrl,
  getDueBadgeInfo,
  groupBoardItemsByUrgency
} from '../../lib/board';
import { MemberAvatar } from '../MemberAvatar';
import { getMemberDisplayName } from '../../lib/formatters';
import {
  Plus,
  Sparkles,
  Pin,
  CheckCircle2,
  Circle,
  Paperclip,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Pencil,
  RotateCcw,
  FileText,
  Image as ImageIcon,
  Download,
  X,
  ClipboardList
} from 'lucide-react';

interface BoardViewProps {
  items: FamilyBoardItem[];
  members: FamilyMember[];
  selectedMemberId: string | null;
  onSelectMember: (memberId: string | null) => void;
  onOpenCreateModal: (initialType?: BoardItemType) => void;
  onOpenEditModal: (item: FamilyBoardItem) => void;
  onOpenImportModal: () => void;
  onToggleChecklistItem: (item: FamilyBoardItem, checklistItemId: string) => void;
  onTogglePin: (item: FamilyBoardItem) => void;
  onToggleComplete: (item: FamilyBoardItem) => void;
  onOpenBalanceView?: () => void;
}

export const BoardView: React.FC<BoardViewProps> = ({
  items,
  members,
  selectedMemberId,
  onSelectMember,
  onOpenCreateModal,
  onOpenEditModal,
  onOpenImportModal,
  onToggleChecklistItem,
  onTogglePin,
  onToggleComplete,
  onOpenBalanceView
}) => {
  const [selectedType, setSelectedType] = useState<BoardItemType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'DONE'>('ACTIVE');
  const [expandedChecklists, setExpandedChecklists] = useState<Record<string, boolean>>({});
  const [viewingAttachmentItem, setViewingAttachmentItem] = useState<FamilyBoardItem | null>(null);
  const [viewingAttachmentUrl, setViewingAttachmentUrl] = useState<string | null>(null);

  const handleOpenAttachmentViewer = async (item: FamilyBoardItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setViewingAttachmentItem(item);
    if (item.attachment_path) {
      const url = await getBoardAttachmentUrl(item.attachment_path);
      setViewingAttachmentUrl(url);
    } else {
      setViewingAttachmentUrl(null);
    }
  };

  const toggleExpandChecklist = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedChecklists((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Filtragem por membro e por categoria
  const filteredItems = items.filter((item) => {
    if (selectedMemberId) {
      const matchesMember =
        item.related_member_id === selectedMemberId ||
        item.assigned_to_id === selectedMemberId;
      if (!matchesMember) return false;
    }
    if (selectedType !== 'ALL' && item.type !== selectedType) {
      return false;
    }
    return true;
  });

  const grouped = groupBoardItemsByUrgency(filteredItems);

  const activeTotalCount =
    grouped.pinned.length +
    grouped.overdue.length +
    grouped.todayTomorrow.length +
    grouped.thisWeek.length +
    grouped.upcoming.length;

  const urgentCount = grouped.overdue.length + grouped.todayTomorrow.length;

  const renderCard = (item: FamilyBoardItem) => {
    const cfg = BOARD_TYPE_CONFIGS[item.type] || BOARD_TYPE_CONFIGS.NOTE;
    const dueInfo = getDueBadgeInfo(item);
    const isDone = item.status === 'DONE';
    const checklist: BoardChecklistItem[] = Array.isArray(item.checklist) ? item.checklist : [];
    const doneCheckCount = checklist.filter((c) => c.done).length;
    const totalCheckCount = checklist.length;
    const progressPct = totalCheckCount > 0 ? Math.round((doneCheckCount / totalCheckCount) * 100) : 0;
    const isChecklistExpanded = expandedChecklists[item.id] ?? totalCheckCount <= 5;

    const toneBadgeClass =
      dueInfo.tone === 'overdue'
        ? 'bg-rose-100 text-rose-800 border-rose-300'
        : dueInfo.tone === 'urgent'
        ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
        : dueInfo.tone === 'soon'
        ? 'bg-sky-100 text-sky-900 border-sky-200'
        : dueInfo.tone === 'done'
        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
        : 'bg-slate-100 text-slate-600 border-slate-200';

    return (
      <div
        key={item.id}
        className={`rounded-3xl border p-4 transition-all shadow-2xs flex flex-col justify-between gap-3 ${
          isDone
            ? 'bg-slate-50/80 border-slate-200 opacity-75'
            : dueInfo.tone === 'overdue'
            ? 'bg-white border-rose-300 ring-1 ring-rose-200'
            : dueInfo.tone === 'urgent'
            ? 'bg-white border-amber-300 ring-1 ring-amber-200'
            : item.is_pinned
            ? 'bg-amber-50/20 border-amber-200/90'
            : 'bg-white border-slate-200 hover:border-sky-200'
        }`}
      >
        <div className="space-y-2.5">
          {/* Top Row: Category Badge + Countdown Badge + Actions */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-[11px] font-extrabold border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}`}
              >
                <span>{cfg.emoji}</span>
                <span>{cfg.label}</span>
              </span>

              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-xl text-[11px] font-extrabold border ${toneBadgeClass}`}
              >
                {dueInfo.label}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {(item.attachment_path || item.attachment_extracted_text) && (
                <button
                  type="button"
                  onClick={(e) => handleOpenAttachmentViewer(item, e)}
                  className="min-h-[32px] px-2.5 py-1 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Ver comunicado / documento original"
                >
                  <Paperclip className="w-3 h-3" />
                  <span>Ver original</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onTogglePin(item)}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                  item.is_pinned
                    ? 'bg-amber-100 border-amber-300 text-amber-800'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700'
                }`}
                title={item.is_pinned ? 'Desafixar do topo' : 'Fixar no topo'}
              >
                <Pin className={`w-3.5 h-3.5 ${item.is_pinned ? 'fill-amber-600' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => onOpenEditModal(item)}
                className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                title="Editar aviso"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Title & Subject */}
          <div
            onClick={() => onOpenEditModal(item)}
            className="cursor-pointer group"
          >
            <h3
              className={`text-sm sm:text-base font-extrabold leading-snug group-hover:text-sky-700 transition-colors ${
                isDone ? 'line-through text-slate-500' : 'text-slate-900'
              }`}
            >
              {item.title}
            </h3>

            {item.details?.subject && (
              <p className="text-xs font-bold text-indigo-700 mt-0.5">
                📖 Disciplina: {item.details.subject}
              </p>
            )}
          </div>

          {/* Metadata Pills (Grade composition, Study tips, Delivery format, Cost) */}
          {(item.details?.grade_composition ||
            item.details?.study_tips ||
            item.details?.delivery_format ||
            item.details?.estimated_cost ||
            item.details?.store_or_link ||
            item.details?.event_location ||
            item.notes) && (
            <div className="space-y-1.5 text-xs bg-slate-50/90 p-2.5 rounded-2xl border border-slate-200/70">
              {item.details?.grade_composition && (
                <p className="text-slate-700 leading-relaxed">
                  <strong className="text-slate-900">📊 Composição da Nota:</strong>{' '}
                  {item.details.grade_composition}
                </p>
              )}
              {item.details?.study_tips && (
                <p className="text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">💡 Dicas de Estudo:</strong>{' '}
                  {item.details.study_tips}
                </p>
              )}
              {item.details?.delivery_format && (
                <p className="text-slate-600">
                  <strong className="text-slate-800">📦 Formato:</strong>{' '}
                  {item.details.delivery_format}
                </p>
              )}
              {item.details?.estimated_cost && (
                <p className="text-amber-900 font-semibold">
                  <strong>💰 Valor / Custo:</strong> {item.details.estimated_cost}
                </p>
              )}
              {(item.details?.store_or_link || item.details?.event_location) && (
                <p className="text-slate-600">
                  <strong>📍 Local / Onde:</strong>{' '}
                  {item.details.store_or_link || item.details.event_location}
                </p>
              )}
              {item.notes && (
                <p className="text-slate-600 whitespace-pre-line">{item.notes}</p>
              )}
            </div>
          )}

          {/* Interactive Checklist */}
          {totalCheckCount > 0 && (
            <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-[11px] font-extrabold text-slate-700">
                    {item.type === 'EXAM'
                      ? '📚 Tópicos de Estudo'
                      : item.type === 'SUPPLY'
                      ? '🛒 Lista de Itens'
                      : '✅ Etapas'}
                  </span>
                  <span className="text-[11px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full shrink-0">
                    {doneCheckCount}/{totalCheckCount} ({progressPct}%)
                  </span>
                </div>

                {totalCheckCount > 3 && (
                  <button
                    type="button"
                    onClick={(e) => toggleExpandChecklist(item.id, e)}
                    className="text-[11px] font-bold text-sky-700 hover:text-sky-900 flex items-center gap-0.5 cursor-pointer shrink-0"
                  >
                    {isChecklistExpanded ? (
                      <>
                        <span>Recolher</span>
                        <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <span>Ver todos ({totalCheckCount})</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Barra de Progresso */}
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Lista de itens do Checklist */}
              <div className="space-y-1 pt-0.5">
                {(isChecklistExpanded ? checklist : checklist.slice(0, 3)).map((chk) => (
                  <button
                    key={chk.id}
                    type="button"
                    onClick={() => onToggleChecklistItem(item, chk.id)}
                    className={`w-full text-left flex items-start gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                      chk.done
                        ? 'bg-emerald-50/70 text-slate-500 line-through'
                        : 'bg-white hover:bg-sky-50/50 text-slate-800 border border-slate-200/60'
                    }`}
                  >
                    {chk.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <span className="font-medium leading-snug break-words">{chk.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Row: Member Chips & Complete Action */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {item.related_member ? (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold text-white shadow-2xs"
                style={{ backgroundColor: item.related_member.color || '#0284C7' }}
              >
                <MemberAvatar member={item.related_member} size="xs" className="!w-3.5 !h-3.5" />
                <span>{getMemberDisplayName(item.related_member)}</span>
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                👨‍👩‍👧‍👦 Família
              </span>
            )}

            {item.assigned_to && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                <span>Apoio:</span>
                <strong className="text-slate-800">
                  {getMemberDisplayName(item.assigned_to)}
                </strong>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onToggleComplete(item)}
            className={`min-h-[34px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isDone
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}
          >
            {isDone ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reabrir</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Concluir</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderSection = (
    title: string,
    subtitle: string,
    sectionItems: FamilyBoardItem[],
    accentClass: string
  ) => {
    if (sectionItems.length === 0) return null;
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider ${accentClass}`}>
              {title}
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
              {sectionItems.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">{subtitle}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {sectionItems.map(renderCard)}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header do Mural */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Mural da Família & Escola
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800">
                  {activeTotalCount} ativo(s)
                </span>
                {urgentCount > 0 && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    ⚡ {urgentCount} urgente(s)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Provas, trabalhos escolares, compras de materiais e autorizações sem poluir os horários da agenda.
              </p>
            </div>
          </div>

          {/* Botões de Ação Principal */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {onOpenBalanceView && (
              <button
                type="button"
                onClick={onOpenBalanceView}
                className="min-h-[40px] px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Abrir Balanço Semanal da Família"
              >
                <BarChart3 className="w-4 h-4 text-sky-700" />
                <span>Balanço</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenImportModal}
              className="min-h-[40px] px-3.5 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Importar PDF / Doc (IA)</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenCreateModal('EXAM')}
              className="min-h-[40px] px-4 py-2 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Aviso</span>
            </button>
          </div>
        </div>

        {/* Filtros por Membro e por Categoria */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filtro de Membros */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => onSelectMember(null)}
              className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer shrink-0 ${
                selectedMemberId === null
                  ? 'bg-sky-700 text-white font-bold shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold'
              }`}
            >
              Toda a Família
            </button>
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectMember(m.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  selectedMemberId === m.id
                    ? 'text-white font-bold ring-2 ring-sky-600 shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold'
                }`}
                style={{ backgroundColor: selectedMemberId === m.id ? m.color : undefined }}
              >
                <MemberAvatar member={m} size="xs" />
                <span>{getMemberDisplayName(m)}</span>
              </button>
            ))}
          </div>

          {/* Toggle Ativos vs Concluídos */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ativos ({activeTotalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('DONE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'DONE'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Concluídos ({grouped.completed.length})
            </button>
          </div>
        </div>

        {/* Pílulas de Categoria */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5">
          <button
            type="button"
            onClick={() => setSelectedType('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 ${
              selectedType === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Todos os Tipos
          </button>
          {BOARD_TYPES_LIST.map((cfg) => {
            const active = selectedType === cfg.type;
            return (
              <button
                key={cfg.type}
                type="button"
                onClick={() => setSelectedType(cfg.type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  active
                    ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} ring-2 ring-sky-500/30`
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{cfg.emoji}</span>
                <span>{cfg.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Listagem Agrupada por Urgência */}
      {statusFilter === 'DONE' ? (
        grouped.completed.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-2">
            <p className="text-sm font-bold text-slate-700">Nenhum aviso concluído ainda</p>
            <p className="text-xs text-slate-500">
              Conforme as provas e entregas forem passando, marque-as como concluídas para arquivá-las aqui.
            </p>
          </div>
        ) : (
          renderSection(
            '✅ Concluídos e Passados',
            'Histórico de provas, trabalhos e recados finalizados',
            grouped.completed,
            'text-emerald-700'
          )
        )
      ) : activeTotalCount === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center mx-auto text-2xl">
            📌
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-extrabold text-slate-900">
              O Mural da Família está em dia!
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Adicione calendários de provas, trabalhos escolares, listas de materiais ou importe diretamente o PDF enviado pela escola com 1 clique.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2.5 flex-wrap pt-1">
            <button
              type="button"
              onClick={onOpenImportModal}
              className="min-h-[42px] px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Importar Roteiro de Provas (PDF / Foto)</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenCreateModal('EXAM')}
              className="min-h-[42px] px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Manualmente</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {renderSection(
            '📌 Fixados no Topo',
            'Avisos prioritários destacados pela família',
            grouped.pinned,
            'text-amber-800'
          )}
          {renderSection(
            '🔴 Atrasados / Pendentes',
            'Prazos anteriores a hoje que ainda não foram marcados como concluídos',
            grouped.overdue,
            'text-rose-700'
          )}
          {renderSection(
            '🟠 Atenção Máxima: Hoje e Amanhã',
            'Provas e entregas das próximas 48 horas',
            grouped.todayTomorrow,
            'text-amber-700'
          )}
          {renderSection(
            '🟡 Esta Semana (Próximos 7 dias)',
            'Bom momento para revisar capítulos e adiantar trabalhos',
            grouped.thisWeek,
            'text-sky-800'
          )}
          {renderSection(
            '⚪ Próximas Semanas / Sem Data Fixa',
            'No radar para planejamento tranquilo',
            grouped.upcoming,
            'text-slate-600'
          )}
        </div>
      )}

      {/* Modal de Visualização Rápida do Anexo Original direto do Card */}
      {viewingAttachmentItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 max-h-[90dvh] flex flex-col overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
              <div className="flex items-center gap-2 min-w-0">
                {viewingAttachmentItem.attachment_mime?.startsWith('image/') ? (
                  <ImageIcon className="w-4 h-4 text-sky-600 shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                )}
                <span className="text-xs font-bold text-slate-900 truncate">
                  {viewingAttachmentItem.attachment_name || viewingAttachmentItem.title}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {viewingAttachmentUrl && (
                  <a
                    href={viewingAttachmentUrl}
                    download={viewingAttachmentItem.attachment_name || 'comunicado'}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-[34px] px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar / Abrir</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setViewingAttachmentItem(null);
                    setViewingAttachmentUrl(null);
                  }}
                  className="w-8 h-8 rounded-xl bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-100 flex flex-col items-center justify-center min-h-[300px]">
              {viewingAttachmentItem.attachment_mime?.startsWith('image/') && viewingAttachmentUrl ? (
                <img
                  src={viewingAttachmentUrl}
                  alt={viewingAttachmentItem.attachment_name || 'Anexo'}
                  className="max-w-full max-h-[72dvh] object-contain rounded-xl shadow-md bg-white"
                />
              ) : viewingAttachmentItem.attachment_mime === 'application/pdf' && viewingAttachmentUrl ? (
                <iframe
                  src={viewingAttachmentUrl}
                  title={viewingAttachmentItem.attachment_name || 'PDF'}
                  className="w-full h-[70dvh] rounded-xl bg-white border border-slate-200"
                />
              ) : viewingAttachmentItem.attachment_extracted_text ? (
                <div className="w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span>
                      Texto extraído do documento ({viewingAttachmentItem.attachment_name})
                    </span>
                  </div>
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {viewingAttachmentItem.attachment_extracted_text}
                  </pre>
                </div>
              ) : (
                <div className="text-center p-6 text-slate-600 space-y-2">
                  <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold">Documento anexado</p>
                  <p className="text-xs text-slate-500">
                    Clique em &ldquo;Baixar / Abrir&rdquo; acima para visualizar o arquivo completo.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

