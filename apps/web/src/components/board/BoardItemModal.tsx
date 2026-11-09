import React, { useState, useEffect, useRef } from 'react';
import {
  BoardChecklistItem,
  BoardItemDetails,
  BoardItemType,
  FamilyBoardItem,
  FamilyMember
} from '../../types';
import {
  BOARD_TYPES_LIST,
  BOARD_TYPE_CONFIGS,
  CreateBoardItemInput,
  getBoardAttachmentUrl,
  uploadBoardAttachment
} from '../../lib/board';
import {
  ATTACHMENT_ACCEPT,
  formatFileSize,
  prepareAttachment
} from '../../lib/documentExtract';
import { MemberAvatar } from '../MemberAvatar';
import { getMemberDisplayName } from '../../lib/formatters';
import {
  X,
  Plus,
  Trash2,
  Pin,
  CheckCircle2,
  Paperclip,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Calendar,
  Sparkles,
  Download
} from 'lucide-react';

interface BoardItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  members: FamilyMember[];
  currentMember?: FamilyMember | null;
  editingItem?: FamilyBoardItem | null;
  initialType?: BoardItemType;
  onSave: (input: CreateBoardItemInput, existingId?: string) => Promise<void>;
  onDelete?: (itemId: string) => Promise<void>;
}

export const BoardItemModal: React.FC<BoardItemModalProps> = ({
  isOpen,
  onClose,
  familyId,
  members,
  currentMember,
  editingItem,
  initialType = 'EXAM',
  onSave,
  onDelete
}) => {
  const [type, setType] = useState<BoardItemType>(initialType);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [relatedMemberId, setRelatedMemberId] = useState<string>('');
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [isPinned, setIsPinned] = useState(false);
  const [notes, setNotes] = useState('');

  // Details JSONB
  const [subject, setSubject] = useState('');
  const [gradeComposition, setGradeComposition] = useState('');
  const [studyTips, setStudyTips] = useState('');
  const [deliveryFormat, setDeliveryFormat] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [storeOrLink, setStoreOrLink] = useState('');
  const [eventLocation, setEventLocation] = useState('');

  // Checklist
  const [checklist, setChecklist] = useState<BoardChecklistItem[]>([]);
  const [newCheckText, setNewCheckText] = useState('');

  // Attachment
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPath, setAttachmentPath] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentMime, setAttachmentMime] = useState<string | null>(null);
  const [attachmentExtractedText, setAttachmentExtractedText] = useState<string | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
  const [isViewingAttachment, setIsViewingAttachment] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setConfirmDelete(false);
    setIsViewingAttachment(false);
    setAttachmentFile(null);

    if (editingItem) {
      setType(editingItem.type);
      setTitle(editingItem.title || '');
      setDueDate(editingItem.due_date ? editingItem.due_date.slice(0, 10) : '');
      setRelatedMemberId(editingItem.related_member_id || '');
      setAssignedToId(editingItem.assigned_to_id || '');
      setIsPinned(Boolean(editingItem.is_pinned));
      setNotes(editingItem.notes || '');

      const det = editingItem.details || {};
      setSubject(det.subject || '');
      setGradeComposition(det.grade_composition || '');
      setStudyTips(det.study_tips || '');
      setDeliveryFormat(det.delivery_format || '');
      setEstimatedCost(det.estimated_cost || '');
      setStoreOrLink(det.store_or_link || '');
      setEventLocation(det.event_location || '');

      setChecklist(Array.isArray(editingItem.checklist) ? [...editingItem.checklist] : []);
      setAttachmentPath(editingItem.attachment_path || null);
      setAttachmentName(editingItem.attachment_name || null);
      setAttachmentMime(editingItem.attachment_mime || null);
      setAttachmentExtractedText(editingItem.attachment_extracted_text || null);

      if (editingItem.attachment_path) {
        getBoardAttachmentUrl(editingItem.attachment_path).then((url) => {
          setAttachmentPreviewUrl(url);
        });
      } else {
        setAttachmentPreviewUrl(null);
      }
    } else {
      setType(initialType);
      setTitle('');
      setDueDate('');
      const defaultChild = members.find((m) => m.role === 'CHILD') || members[0];
      const defaultAdult =
        currentMember || members.find((m) => m.role === 'ADMIN') || members[0];
      setRelatedMemberId(defaultChild?.id || '');
      setAssignedToId(defaultAdult?.id || '');
      setIsPinned(false);
      setNotes('');
      setSubject('');
      setGradeComposition('');
      setStudyTips('');
      setDeliveryFormat('');
      setEstimatedCost('');
      setStoreOrLink('');
      setEventLocation('');
      setChecklist([]);
      setAttachmentPath(null);
      setAttachmentName(null);
      setAttachmentMime(null);
      setAttachmentExtractedText(null);
      setAttachmentPreviewUrl(null);
    }
    setNewCheckText('');
  }, [isOpen, editingItem, initialType, members, currentMember]);

  if (!isOpen) return null;

  const activeConfig = BOARD_TYPE_CONFIGS[type];

  const handleAddChecklistItem = () => {
    const trimmed = newCheckText.trim();
    if (!trimmed) return;
    setChecklist((prev) => [
      ...prev,
      {
        id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: trimmed,
        done: false
      }
    ]);
    setNewCheckText('');
  };

  const handleToggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c))
    );
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist((prev) => prev.filter((c) => c.id !== id));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const prepared = await prepareAttachment(file);
      setAttachmentFile(file);
      setAttachmentName(file.name);
      setAttachmentMime(prepared.mimeType || file.type || 'application/octet-stream');
      setAttachmentExtractedText(prepared.text || null);
      if (prepared.previewUrl) {
        setAttachmentPreviewUrl(prepared.previewUrl);
      } else {
        const objectUrl = URL.createObjectURL(file);
        setAttachmentPreviewUrl(objectUrl);
      }
    } catch (err: any) {
      alert(err?.message || 'Não foi possível anexar este arquivo.');
    }
  };

  const handleRemoveAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPath(null);
    setAttachmentName(null);
    setAttachmentMime(null);
    setAttachmentExtractedText(null);
    setAttachmentPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle =
      title.trim() ||
      (type === 'EXAM' && subject.trim()
        ? `Prova de ${subject.trim()}`
        : type === 'ASSIGNMENT' && subject.trim()
        ? `Trabalho de ${subject.trim()}`
        : '');

    if (!finalTitle) return;

    setIsSaving(true);
    try {
      let finalPath = attachmentPath;
      let finalName = attachmentName;
      let finalMime = attachmentMime;

      // Se o usuário digitou algo no campo de novo item do checklist e não apertou "+", adiciona automaticamente
      const finalChecklist = [...checklist];
      if (newCheckText.trim()) {
        finalChecklist.push({
          id: `chk-${Date.now()}`,
          text: newCheckText.trim(),
          done: false
        });
      }

      if (attachmentFile) {
        const uploaded = await uploadBoardAttachment(
          familyId,
          attachmentFile,
          attachmentPreviewUrl?.startsWith('data:') ? attachmentPreviewUrl : undefined
        );
        finalPath = uploaded.path;
        finalName = uploaded.name;
        finalMime = uploaded.mime;
      }

      const details: BoardItemDetails = {};
      if (subject.trim()) details.subject = subject.trim();
      if (gradeComposition.trim()) details.grade_composition = gradeComposition.trim();
      if (studyTips.trim()) details.study_tips = studyTips.trim();
      if (deliveryFormat.trim()) details.delivery_format = deliveryFormat.trim();
      if (estimatedCost.trim()) details.estimated_cost = estimatedCost.trim();
      if (storeOrLink.trim()) details.store_or_link = storeOrLink.trim();
      if (eventLocation.trim()) details.event_location = eventLocation.trim();

      await onSave(
        {
          family_id: familyId,
          type,
          title: finalTitle,
          notes: notes.trim() || null,
          due_date: dueDate || null,
          related_member_id: relatedMemberId || null,
          assigned_to_id: assignedToId || null,
          details,
          checklist: finalChecklist,
          is_pinned: isPinned,
          attachment_path: finalPath,
          attachment_name: finalName,
          attachment_mime: finalMime,
          attachment_extracted_text: attachmentExtractedText,
          created_by: currentMember?.id || null
        },
        editingItem?.id
      );
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!editingItem || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(editingItem.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl shrink-0">{activeConfig.emoji}</span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                {editingItem ? 'Editar Aviso do Mural' : 'Novo Aviso no Mural'}
              </h2>
              <p className="text-xs text-slate-500 truncate">{activeConfig.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsPinned((prev) => !prev)}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                isPinned
                  ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Fixar no topo do Mural"
            >
              <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-600 text-amber-700' : ''}`} />
              <span className="hidden sm:inline">{isPinned ? 'Fixado' : 'Fixar'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Seletor de Tipo de Aviso */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Categoria do Aviso
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {BOARD_TYPES_LIST.map((cfg) => {
                const selected = type === cfg.type;
                return (
                  <button
                    key={cfg.type}
                    type="button"
                    onClick={() => setType(cfg.type)}
                    className={`min-h-[42px] px-2.5 py-2 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      selected
                        ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} ring-2 ring-sky-600/30 shadow-2xs`
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base">{cfg.emoji}</span>
                    <span className="truncate">{cfg.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título e Data Limite / Data de Aplicação */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {type === 'EXAM'
                  ? 'Título da Avaliação *'
                  : type === 'ASSIGNMENT'
                  ? 'Título do Trabalho / Entrega *'
                  : type === 'SUPPLY'
                  ? 'O que precisa comprar / enviar? *'
                  : type === 'PERMISSION'
                  ? 'Qual autorização ou documento? *'
                  : 'Título do Recado *'}
              </label>
              <input
                type="text"
                required={!subject.trim()}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  type === 'EXAM'
                    ? 'Ex: Prova de Matemática - 4ª Etapa'
                    : type === 'ASSIGNMENT'
                    ? 'Ex: Trabalho Paradidático: As aventuras de Petit'
                    : type === 'SUPPLY'
                    ? 'Ex: Comprar 2 cartolinas brancas e tinta guache'
                    : type === 'PERMISSION'
                    ? 'Ex: Assinar autorização do passeio ao Museu'
                    : 'Ex: Reunião de pais ou aviso geral'
                }
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 focus:bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                <span>{type === 'EXAM' ? 'Data da Prova' : 'Data Limite / Prazo'}</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 focus:bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>
          </div>

          {/* Membro Relacionado (Criança / Aluno) e Adulto Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                👦 Para quem é? (Filho / Membro)
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setRelatedMemberId('')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    !relatedMemberId
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Família
                </button>
                {members.map((m) => {
                  const active = relatedMemberId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setRelatedMemberId(m.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                        active
                          ? 'text-white border-transparent shadow-2xs ring-2 ring-offset-1 ring-sky-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                      style={{ backgroundColor: active ? m.color : undefined }}
                    >
                      <MemberAvatar member={m} size="xs" />
                      <span>{getMemberDisplayName(m)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                🦸 Quem acompanha / resolve?
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setAssignedToId('')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    !assignedToId
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Qualquer adulto
                </button>
                {members.map((m) => {
                  const active = assignedToId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAssignedToId(m.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                        active
                          ? 'bg-sky-700 text-white border-sky-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <MemberAvatar member={m} size="xs" />
                      <span>{getMemberDisplayName(m)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Campos Específicos por Tipo */}
          {(type === 'EXAM' || type === 'ASSIGNMENT') && (
            <div className="space-y-3.5 bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Disciplina / Matéria
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Matemática, História e Geografia..."
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>

                {type === 'ASSIGNMENT' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Formato de Entrega
                    </label>
                    <input
                      type="text"
                      value={deliveryFormat}
                      onChange={(e) => setDeliveryFormat(e.target.value)}
                      placeholder="Ex: Livro Paradidático, Cartaz, Portal SAS..."
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sugestões de Estudo
                    </label>
                    <input
                      type="text"
                      value={studyTips}
                      onChange={(e) => setStudyTips(e.target.value)}
                      placeholder="Ex: Livro, suplemento, caderno e Eureka"
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Composição da Nota / Pontuação
                </label>
                <input
                  type="text"
                  value={gradeComposition}
                  onChange={(e) => setGradeComposition(e.target.value)}
                  placeholder="Ex: Avaliação: 4,0 pts | Simulado: 2,0 pts | Ativ. Sala: 2,0 pts | Eureka: 1,0 pt"
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
            </div>
          )}

          {(type === 'SUPPLY' || type === 'PERMISSION') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/40 p-4 rounded-2xl border border-amber-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor / Custo Estimado (Opcional)
                </label>
                <input
                  type="text"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  placeholder="Ex: R$ 45,00"
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {type === 'SUPPLY' ? 'Onde comprar / Especificação' : 'Local do Passeio / Secretaria'}
                </label>
                <input
                  type="text"
                  value={type === 'SUPPLY' ? storeOrLink : eventLocation}
                  onChange={(e) =>
                    type === 'SUPPLY'
                      ? setStoreOrLink(e.target.value)
                      : setEventLocation(e.target.value)
                  }
                  placeholder={
                    type === 'SUPPLY'
                      ? 'Ex: Papelaria Kalunga / Livraria'
                      : 'Ex: Entregar assinado na coordenação'
                  }
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
            </div>
          )}

          {/* Checklist de Conteúdo Programático / Etapas / Itens */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                <span>
                  {type === 'EXAM'
                    ? 'Conteúdo da Prova / Tópicos para Estudar'
                    : type === 'SUPPLY'
                    ? 'Lista de Itens para Comprar / Separar'
                    : 'Checklist de Etapas / Subtarefas'}
                </span>
              </label>
              {checklist.length > 0 && (
                <span className="text-[11px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">
                  {checklist.filter((c) => c.done).length}/{checklist.length} concluídos
                </span>
              )}
            </div>

            {/* Input para adicionar tópico */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCheckText}
                onChange={(e) => setNewCheckText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                placeholder={
                  type === 'EXAM'
                    ? 'Adicionar capítulo ou tópico (ex: Cap. 12: Porcentagem e frações)...'
                    : 'Adicionar item ao checklist e pressionar Enter...'
                }
                className="flex-1 min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="min-h-[40px] px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>

            {checklist.length > 0 && (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs transition-all ${
                      item.done
                        ? 'bg-emerald-50/60 border-emerald-200 text-slate-500 line-through'
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <label className="flex items-center gap-2.5 flex-1 cursor-pointer min-w-0">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => handleToggleChecklistItem(item.id)}
                        className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer shrink-0"
                      />
                      <span className="font-medium break-words">{item.text}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Remover tópico"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observações Livres */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Observações / Detalhes Adicionais
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações extras, orientações da professora, páginas do livro..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 focus:bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>

          {/* Anexo do Comunicado Original (PDF, DOCX, Imagem) */}
          <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                <Paperclip className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {attachmentName ? attachmentName : 'Anexar Comunicado / Roteiro Original'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {attachmentFile
                    ? `Arquivo selecionado (${formatFileSize(attachmentFile.size)})`
                    : attachmentName
                    ? 'Documento original vinculado a este aviso'
                    : 'Aceita PDF, Word (.docx) ou Foto (.png, .jpg)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                onChange={handleFileChange}
                className="hidden"
              />

              {(attachmentPreviewUrl || attachmentExtractedText) && (
                <button
                  type="button"
                  onClick={() => setIsViewingAttachment(true)}
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver original</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                {attachmentName ? 'Trocar' : 'Escolher arquivo'}
              </button>

              {attachmentName && (
                <button
                  type="button"
                  onClick={handleRemoveAttachment}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Remover anexo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            {editingItem && onDelete ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleConfirmDelete}
                    className="min-h-[42px] px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {isDeleting ? 'Excluindo...' : 'Confirmar exclusão'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="min-h-[42px] px-3 py-2 bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="min-h-[42px] px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir</span>
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                {isSaving ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Publicar no Mural'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal Interno de Visualização do Documento Original */}
      {isViewingAttachment && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 max-h-[90dvh] flex flex-col overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
              <div className="flex items-center gap-2 min-w-0">
                {attachmentMime?.startsWith('image/') ? (
                  <ImageIcon className="w-4 h-4 text-sky-600 shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                )}
                <span className="text-xs font-bold text-slate-900 truncate">
                  {attachmentName || 'Documento Original'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {attachmentPreviewUrl && (
                  <a
                    href={attachmentPreviewUrl}
                    download={attachmentName || 'documento'}
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
                  onClick={() => setIsViewingAttachment(false)}
                  className="w-8 h-8 rounded-xl bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-100 flex flex-col items-center justify-center min-h-[300px]">
              {attachmentMime?.startsWith('image/') && attachmentPreviewUrl ? (
                <img
                  src={attachmentPreviewUrl}
                  alt={attachmentName || 'Anexo'}
                  className="max-w-full max-h-[72dvh] object-contain rounded-xl shadow-md bg-white"
                />
              ) : attachmentMime === 'application/pdf' && attachmentPreviewUrl ? (
                <iframe
                  src={attachmentPreviewUrl}
                  title={attachmentName || 'PDF'}
                  className="w-full h-[70dvh] rounded-xl bg-white border border-slate-200"
                />
              ) : attachmentExtractedText ? (
                <div className="w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Texto extraído do documento ({attachmentName})</span>
                  </div>
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {attachmentExtractedText}
                  </pre>
                </div>
              ) : (
                <div className="text-center p-6 text-slate-600 space-y-3">
                  <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold">Pré-visualização direta indisponível para este formato</p>
                  <p className="text-xs text-slate-500">
                    Use o botão &ldquo;Baixar / Abrir&rdquo; acima para visualizar o arquivo original.
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
