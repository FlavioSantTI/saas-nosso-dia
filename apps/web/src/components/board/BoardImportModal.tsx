import React, { useState, useRef, useEffect } from 'react';
import {
  AiQuotaCheckResult,
  BoardItemType,
  FamilyBoardItem,
  FamilyMember
} from '../../types';
import {
  BOARD_TYPES_LIST,
  BOARD_TYPE_CONFIGS,
  CreateBoardItemInput,
  uploadBoardAttachment
} from '../../lib/board';
import {
  ATTACHMENT_ACCEPT,
  PreparedAttachment,
  formatFileSize,
  prepareAttachment
} from '../../lib/documentExtract';
import {
  ExtractedBoardItemDraft,
  extractBoardItemsWithGemini,
  verifyAiQuotaBeforeCall
} from '../../lib/gemini';
import { MemberAvatar } from '../MemberAvatar';
import { getMemberDisplayName } from '../../lib/formatters';
import {
  X,
  Upload,
  FileText,
  Sparkles,
  CheckSquare,
  Square,
  AlertTriangle,
  ArrowLeft,
  Check,
  Calendar,
  ListChecks,
  Paperclip,
  Zap
} from 'lucide-react';

interface BoardImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  members: FamilyMember[];
  currentMember?: FamilyMember | null;
  existingItems: FamilyBoardItem[];
  onOpenUpgrade?: () => void;
  onBatchSave: (inputs: CreateBoardItemInput[]) => Promise<void>;
}

export const BoardImportModal: React.FC<BoardImportModalProps> = ({
  isOpen,
  onClose,
  familyId,
  members,
  currentMember,
  existingItems,
  onOpenUpgrade,
  onBatchSave
}) => {
  const defaultChild = members.find((m) => m.role === 'CHILD') || members[0];
  const defaultAdult = currentMember || members.find((m) => m.role === 'ADMIN') || members[0];

  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preparedDoc, setPreparedDoc] = useState<PreparedAttachment | null>(null);
  const [manualText, setManualText] = useState('');
  const [relatedMemberId, setRelatedMemberId] = useState<string>(defaultChild?.id || '');
  const [assignedToId, setAssignedToId] = useState<string>(defaultAdult?.id || '');
  const [attachOriginalToCards, setAttachOriginalToCards] = useState(true);

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<ExtractedBoardItemDraft[]>([]);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<AiQuotaCheckResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen || !familyId) return;
    verifyAiQuotaBeforeCall(familyId, 'BOARD_IMPORT', 'PDF')
      .then((res) => setQuotaInfo(res))
      .catch(() => {});
  }, [isOpen, familyId]);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setStep('upload');
    setSelectedFile(null);
    setPreparedDoc(null);
    setManualText('');
    setExtractError(null);
    setDrafts([]);
    onClose();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtractError(null);
    try {
      const prep = await prepareAttachment(file);
      setSelectedFile(file);
      setPreparedDoc(prep);
    } catch (err: any) {
      setExtractError(err?.message || 'Não foi possível ler este arquivo.');
    }
  };

  const handleAnalyzeWithAI = async () => {
    if (!preparedDoc && !manualText.trim()) {
      setExtractError('Envie um arquivo (PDF, Word ou Imagem) ou cole o texto do comunicado.');
      return;
    }

    setIsExtracting(true);
    setExtractError(null);

    try {
      const results = await extractBoardItemsWithGemini(manualText, preparedDoc, {
        familyId,
        memberId: currentMember?.id || null
      });
      if (results.length === 0) {
        setExtractError(
          'A IA não encontrou provas, trabalhos ou avisos estruturados neste documento. Tente complementar com instruções em texto.'
        );
        return;
      }
      setDrafts(results);
      setStep('preview');
    } catch (err: any) {
      setExtractError(err?.message || 'Falha ao analisar documento com a IA.');
    } finally {
      setIsExtracting(false);
    }
  };

  const isDuplicateDraft = (draft: ExtractedBoardItemDraft): boolean => {
    const cleanDraftTitle = draft.title.toLowerCase().trim();
    return existingItems.some((ex) => {
      if (ex.status === 'ARCHIVED') return false;
      const sameDate = Boolean(draft.due_date && ex.due_date && ex.due_date.slice(0, 10) === draft.due_date);
      const cleanExTitle = ex.title.toLowerCase().trim();
      const titleOverlap =
        cleanExTitle === cleanDraftTitle ||
        (draft.subject &&
          ex.details?.subject &&
          ex.details.subject.toLowerCase().trim() === draft.subject.toLowerCase().trim() &&
          ex.type === draft.type);
      return sameDate && Boolean(titleOverlap);
    });
  };

  const toggleDraftSelection = (id: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d))
    );
  };

  const updateDraftField = (
    id: string,
    field: keyof ExtractedBoardItemDraft,
    value: any
  ) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const selectedDrafts = drafts.filter((d) => d.selected);

  const handleConfirmBatchImport = async () => {
    if (selectedDrafts.length === 0) return;

    setIsSavingBatch(true);
    try {
      let uploadedPath: string | null = null;
      let uploadedName: string | null = null;
      let uploadedMime: string | null = null;

      if (attachOriginalToCards && selectedFile) {
        const up = await uploadBoardAttachment(
          familyId,
          selectedFile,
          preparedDoc?.previewUrl?.startsWith('data:') ? preparedDoc.previewUrl : undefined
        );
        uploadedPath = up.path;
        uploadedName = up.name;
        uploadedMime = up.mime;
      }

      const inputs: CreateBoardItemInput[] = selectedDrafts.map((d) => ({
        family_id: familyId,
        type: d.type,
        title: d.title.trim() || 'Aviso Escolar',
        notes: d.notes || null,
        due_date: d.due_date || null,
        related_member_id: relatedMemberId || null,
        assigned_to_id: assignedToId || null,
        details: {
          subject: d.subject || undefined,
          grade_composition: d.grade_composition || undefined,
          study_tips: d.study_tips || undefined,
          delivery_format: d.delivery_format || undefined,
          estimated_cost: d.estimated_cost || undefined
        },
        checklist: d.checklist,
        status: 'OPEN',
        is_pinned: false,
        attachment_path: uploadedPath,
        attachment_name: uploadedName,
        attachment_mime: uploadedMime,
        attachment_extracted_text: preparedDoc?.text || null,
        created_by: currentMember?.id || null
      }));

      await onBatchSave(inputs);
      resetAndClose();
    } finally {
      setIsSavingBatch(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-gradient-to-r from-sky-50/80 via-indigo-50/50 to-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                {step === 'upload'
                  ? 'Importar Comunicado / Roteiro de Provas (IA)'
                  : `Revisar ${drafts.length} Aviso(s) Identificado(s)`}
              </h2>
              <p className="text-xs text-slate-600 truncate">
                {step === 'upload'
                  ? 'Envie o PDF, Word ou foto do calendário escolar e crie todos os cards de uma vez'
                  : 'Confira as provas, checklists de capítulos e trabalhos embutidos antes de salvar'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetAndClose}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {step === 'upload' ? (
            <>
              {/* Faixa de Saldo de Créditos & Regra de Degustação / Plano */}
              {quotaInfo && (
                <div
                  className={`px-3.5 py-2.5 rounded-2xl border flex items-center justify-between gap-2 flex-wrap text-xs font-bold ${
                    !quotaInfo.allowed
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : quotaInfo.plan_slug === 'trial'
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                      : 'bg-sky-50/80 border-sky-200 text-sky-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 shrink-0" />
                    {quotaInfo.plan_slug === 'trial' ? (
                      <span>
                        🎁 <strong>Degustação:</strong>{' '}
                        {Math.max(0, 1 - (quotaInfo.board_imports_used || 0))} de 1 importação gratuita de PDF/Foto disponível
                      </span>
                    ) : quotaInfo.plan_slug === 'essencial' ? (
                      <span>
                        📄 <strong>Plano Essencial:</strong>{' '}
                        {Math.max(0, 2 - (quotaInfo.board_imports_used || 0))} de 2 importações no mês disponíveis
                      </span>
                    ) : (
                      <span>
                        ✨ <strong>{quotaInfo.plan_name || 'Pro IA'}:</strong> Importações ilimitadas de PDF/Word/Foto no Mural
                      </span>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-white/90 border border-slate-200 text-[11px] font-extrabold text-slate-700">
                    ⚡ {Math.max(0, (quotaInfo.credits_limit || 60) - (quotaInfo.credits_used || 0))}/{quotaInfo.credits_limit || 60} créditos (PDF = 5 créd.)
                  </span>
                </div>
              )}

              {/* Área de Upload de Documento */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all cursor-pointer ${
                  selectedFile
                    ? 'border-sky-400 bg-sky-50/40'
                    : 'border-slate-300 hover:border-sky-400 bg-slate-50/60 hover:bg-sky-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ATTACHMENT_ACCEPT}
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mx-auto">
                      <FileText className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-extrabold text-slate-900 break-all">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatFileSize(selectedFile.size)} • Pronto para leitura inteligente
                    </p>
                    <span className="inline-block text-xs font-bold text-sky-700 underline pt-1">
                      Trocar arquivo
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-200/70 text-slate-600 flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      Toque para enviar o PDF, Word (.docx) ou Foto do Comunicado
                    </p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      A IA identifica automaticamente cada data de prova, aglutina disciplinas do mesmo dia, monta o checklist de capítulos e separa os trabalhos embutidos na nota.
                    </p>
                  </div>
                )}
              </div>

              {/* Opção de colar texto ou dar instruções extras */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ou cole o texto do comunicado / instruções extras (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Você também pode colar aqui o texto copiado do WhatsApp/agenda escolar ou escrever uma instrução (ex: 'Importar apenas as provas de novembro')..."
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 focus:bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>

              {/* Seleção do Filho / Aluno e Adulto Responsável para o lote */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    👦 De qual filho é este calendário/comunicado?
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
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
                    🦸 Adulto responsável pelo acompanhamento
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
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

              {selectedFile && (
                <label className="flex items-center gap-2.5 px-3.5 py-2.5 bg-sky-50/70 border border-sky-200/80 rounded-2xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attachOriginalToCards}
                    onChange={(e) => setAttachOriginalToCards(e.target.checked)}
                    className="w-4 h-4 rounded border-sky-300 text-sky-600 focus:ring-sky-500"
                  />
                  <Paperclip className="w-4 h-4 text-sky-700 shrink-0" />
                  <span className="text-xs font-semibold text-sky-950">
                    Manter o arquivo original (<strong>{selectedFile.name}</strong>) anexado em todos os cards gerados para consulta rápida (&ldquo;📎 Ver original&rdquo;)
                  </span>
                </label>
              )}

              {extractError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium space-y-2.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{extractError}</span>
                  </div>
                  {onOpenUpgrade &&
                    (extractError.toLowerCase().includes('upgrade') ||
                      extractError.toLowerCase().includes('crédito') ||
                      extractError.toLowerCase().includes('degustação') ||
                      extractError.toLowerCase().includes('limite')) && (
                      <button
                        type="button"
                        onClick={() => {
                          resetAndClose();
                          onOpenUpgrade();
                        }}
                        className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        🚀 Fazer Upgrade de Plano para Importar Sem Limites
                      </button>
                    )}
                </div>
              )}
            </>
          ) : (
            /* STEP 2: PREVIEW INTERATIVO DOS CARDS EXTRAÍDOS */
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">
                  ✅ {selectedDrafts.length} de {drafts.length} item(ns) marcado(s) para importação
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDrafts((prev) => prev.map((d) => ({ ...d, selected: true })))
                    }
                    className="text-xs font-bold text-sky-700 hover:underline cursor-pointer"
                  >
                    Marcar todos
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() =>
                      setDrafts((prev) => prev.map((d) => ({ ...d, selected: false })))
                    }
                    className="text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
                  >
                    Desmarcar todos
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {drafts.map((draft) => {
                  const cfg = BOARD_TYPE_CONFIGS[draft.type] || BOARD_TYPE_CONFIGS.EXAM;
                  const duplicate = isDuplicateDraft(draft);

                  return (
                    <div
                      key={draft.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        draft.selected
                          ? 'bg-white border-sky-200 shadow-2xs'
                          : 'bg-slate-50/70 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleDraftSelection(draft.id)}
                          className="mt-1 text-sky-600 hover:text-sky-700 cursor-pointer shrink-0"
                        >
                          {draft.selected ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0 space-y-2.5">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            {/* Seletor rápido de tipo (EXAM vs ASSIGNMENT etc.) */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <select
                                value={draft.type}
                                onChange={(e) =>
                                  updateDraftField(
                                    draft.id,
                                    'type',
                                    e.target.value as BoardItemType
                                  )
                                }
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} cursor-pointer focus:outline-none`}
                              >
                                {BOARD_TYPES_LIST.map((t) => (
                                  <option key={t.type} value={t.type}>
                                    {t.emoji} {t.label}
                                  </option>
                                ))}
                              </select>

                              {duplicate && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <AlertTriangle className="w-3 h-3" />
                                  Já existe similar no Mural
                                </span>
                              )}
                            </div>

                            {/* Data editável */}
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="date"
                                value={draft.due_date || ''}
                                onChange={(e) =>
                                  updateDraftField(
                                    draft.id,
                                    'due_date',
                                    e.target.value || null
                                  )
                                }
                                className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white"
                              />
                            </div>
                          </div>

                          {/* Título editável */}
                          <input
                            type="text"
                            value={draft.title}
                            onChange={(e) =>
                              updateDraftField(draft.id, 'title', e.target.value)
                            }
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-600"
                          />

                          {/* Composição da nota / Dicas */}
                          {draft.grade_composition && (
                            <p className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/80">
                              📊 <strong>Nota:</strong> {draft.grade_composition}
                            </p>
                          )}

                          {/* Resumo do Checklist */}
                          {draft.checklist.length > 0 && (
                            <div className="space-y-1 pt-0.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-800">
                                <ListChecks className="w-3.5 h-3.5" />
                                <span>
                                  {draft.checklist.length} tópico(s) de estudo / etapas extraídos:
                                </span>
                              </div>
                              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-1">
                                {draft.checklist.slice(0, 6).map((chk) => (
                                  <li
                                    key={chk.id}
                                    className="text-[11px] text-slate-600 truncate flex items-center gap-1.5"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                                    <span className="truncate">{chk.text}</span>
                                  </li>
                                ))}
                                {draft.checklist.length > 6 && (
                                  <li className="text-[11px] font-semibold text-slate-400">
                                    + {draft.checklist.length - 6} outro(s) tópico(s)...
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          {step === 'preview' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="min-h-[44px] px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>

              <button
                type="button"
                disabled={isSavingBatch || selectedDrafts.length === 0}
                onClick={handleConfirmBatchImport}
                className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isSavingBatch
                    ? 'Importando para o Mural...'
                    : `Importar ${selectedDrafts.length} Aviso(s) para o Mural`}
                </span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={resetAndClose}
                className="min-h-[44px] px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isExtracting}
                onClick={handleAnalyzeWithAI}
                className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                {isExtracting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Lendo documento com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extrair Provas e Trabalhos com IA</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
