import { supabase } from './supabase';
import {
  BoardChecklistItem,
  BoardItemDetails,
  BoardItemStatus,
  BoardItemType,
  FamilyBoardItem,
  FamilyMember
} from '../types';
import { toLocalDateString } from './dateUtils';

export interface BoardTypeConfig {
  type: BoardItemType;
  label: string;
  shortLabel: string;
  emoji: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  accentColor: string;
  description: string;
}

export const BOARD_TYPE_CONFIGS: Record<BoardItemType, BoardTypeConfig> = {
  EXAM: {
    type: 'EXAM',
    label: 'Avaliação / Prova',
    shortLabel: 'Prova',
    emoji: '📝',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-800',
    badgeBorder: 'border-indigo-200',
    accentColor: '#4F46E5',
    description: 'Provas escolares, simulados e testes com tópicos de estudo e composição da nota.'
  },
  ASSIGNMENT: {
    type: 'ASSIGNMENT',
    label: 'Trabalho / Entrega',
    shortLabel: 'Trabalho',
    emoji: '📚',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-800',
    badgeBorder: 'border-sky-200',
    accentColor: '#0284C7',
    description: 'Trabalhos escolares, leituras de paradidáticos, projetos bimestrais e maquetes.'
  },
  SUPPLY: {
    type: 'SUPPLY',
    label: 'Material / Compra',
    shortLabel: 'Material',
    emoji: '🛒',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-900',
    badgeBorder: 'border-amber-200',
    accentColor: '#D97706',
    description: 'Materiais solicitados pela escola, uniforme, cartolina, livros ou itens de feira.'
  },
  PERMISSION: {
    type: 'PERMISSION',
    label: 'Autorização / Doc',
    shortLabel: 'Autorização',
    emoji: '✍️',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-200',
    accentColor: '#059669',
    description: 'Autorizações de passeio, renovação de matrícula, atestados médicos e pagamentos.'
  },
  NOTE: {
    type: 'NOTE',
    label: 'Recado Geral',
    shortLabel: 'Recado',
    emoji: '💬',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-300',
    accentColor: '#475569',
    description: 'Avisos gerais da casa, lembretes da família ou comunicados sem horário fixo.'
  }
};

export const BOARD_TYPES_LIST: BoardTypeConfig[] = [
  BOARD_TYPE_CONFIGS.EXAM,
  BOARD_TYPE_CONFIGS.ASSIGNMENT,
  BOARD_TYPE_CONFIGS.SUPPLY,
  BOARD_TYPE_CONFIGS.PERMISSION,
  BOARD_TYPE_CONFIGS.NOTE
];

const getLocalCacheKey = (familyId: string) => `nosso_dia_board_items_${familyId}`;

const readLocalBoardCache = (familyId: string): FamilyBoardItem[] => {
  try {
    const raw = localStorage.getItem(getLocalCacheKey(familyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalBoardCache = (familyId: string, items: FamilyBoardItem[]) => {
  try {
    localStorage.setItem(getLocalCacheKey(familyId), JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
};

const enrichBoardItemsWithMembers = (
  items: FamilyBoardItem[],
  members: FamilyMember[]
): FamilyBoardItem[] => {
  const memberMap = new Map<string, FamilyMember>();
  members.forEach((m) => memberMap.set(m.id, m));

  return items.map((item) => ({
    ...item,
    details: item.details || {},
    checklist: Array.isArray(item.checklist) ? item.checklist : [],
    related_member: item.related_member_id ? memberMap.get(item.related_member_id) || null : null,
    assigned_to: item.assigned_to_id ? memberMap.get(item.assigned_to_id) || null : null
  }));
};

const isTableMissingError = (error: any): boolean => {
  if (!error) return false;
  const msg = String(error.message || error.details || error.code || '').toLowerCase();
  return (
    msg.includes('family_board_items') ||
    msg.includes('relation') ||
    msg.includes('does not exist') ||
    msg.includes('42p01') ||
    msg.includes('pgrst205')
  );
};

export async function fetchBoardItems(
  familyId: string,
  members: FamilyMember[] = []
): Promise<FamilyBoardItem[]> {
  if (!familyId) return [];

  const localItems = readLocalBoardCache(familyId);

  try {
    const { data, error } = await supabase
      .from('family_board_items')
      .select('*')
      .eq('family_id', familyId)
      .order('is_pinned', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      if (isTableMissingError(error)) {
        return enrichBoardItemsWithMembers(localItems, members);
      }
      throw error;
    }

    const remoteItems = (data || []) as FamilyBoardItem[];

    // Merge any purely-local items (created while table was offline/unmigrated) if needed
    const remoteIds = new Set(remoteItems.map((i) => i.id));
    const unsyncedLocal = localItems.filter((l) => l.id.startsWith('local-') && !remoteIds.has(l.id));

    const combined = [...unsyncedLocal, ...remoteItems];
    writeLocalBoardCache(familyId, combined);
    return enrichBoardItemsWithMembers(combined, members);
  } catch (err) {
    console.warn('[Board] Usando cache local do Mural:', err);
    return enrichBoardItemsWithMembers(localItems, members);
  }
}

export interface CreateBoardItemInput {
  family_id: string;
  type: BoardItemType;
  title: string;
  notes?: string | null;
  due_date?: string | null;
  related_member_id?: string | null;
  assigned_to_id?: string | null;
  details?: BoardItemDetails;
  checklist?: BoardChecklistItem[];
  status?: BoardItemStatus;
  is_pinned?: boolean;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  attachment_extracted_text?: string | null;
  created_by?: string | null;
}

export async function createBoardItem(
  input: CreateBoardItemInput,
  members: FamilyMember[] = []
): Promise<FamilyBoardItem> {
  const payload = {
    family_id: input.family_id,
    type: input.type,
    title: input.title.trim(),
    notes: input.notes?.trim() || null,
    due_date: input.due_date || null,
    related_member_id: input.related_member_id || null,
    assigned_to_id: input.assigned_to_id || null,
    details: input.details || {},
    checklist: input.checklist || [],
    status: input.status || 'OPEN',
    is_pinned: Boolean(input.is_pinned),
    attachment_path: input.attachment_path || null,
    attachment_name: input.attachment_name || null,
    attachment_mime: input.attachment_mime || null,
    attachment_extracted_text: input.attachment_extracted_text || null,
    created_by: input.created_by || null
  };

  try {
    const { data, error } = await supabase
      .from('family_board_items')
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (isTableMissingError(error)) {
        const fallbackItem: FamilyBoardItem = {
          ...payload,
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: null
        };
        const current = readLocalBoardCache(input.family_id);
        writeLocalBoardCache(input.family_id, [fallbackItem, ...current]);
        return enrichBoardItemsWithMembers([fallbackItem], members)[0];
      }
      throw error;
    }

    const created = data as FamilyBoardItem;
    const current = readLocalBoardCache(input.family_id);
    writeLocalBoardCache(input.family_id, [created, ...current.filter((i) => i.id !== created.id)]);
    return enrichBoardItemsWithMembers([created], members)[0];
  } catch (err) {
    const fallbackItem: FamilyBoardItem = {
      ...payload,
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null
    };
    const current = readLocalBoardCache(input.family_id);
    writeLocalBoardCache(input.family_id, [fallbackItem, ...current]);
    return enrichBoardItemsWithMembers([fallbackItem], members)[0];
  }
}

export async function createBoardItemsBatch(
  inputs: CreateBoardItemInput[],
  members: FamilyMember[] = []
): Promise<FamilyBoardItem[]> {
  if (inputs.length === 0) return [];
  const familyId = inputs[0].family_id;

  const payloads = inputs.map((input) => ({
    family_id: input.family_id,
    type: input.type,
    title: input.title.trim(),
    notes: input.notes?.trim() || null,
    due_date: input.due_date || null,
    related_member_id: input.related_member_id || null,
    assigned_to_id: input.assigned_to_id || null,
    details: input.details || {},
    checklist: input.checklist || [],
    status: input.status || 'OPEN',
    is_pinned: Boolean(input.is_pinned),
    attachment_path: input.attachment_path || null,
    attachment_name: input.attachment_name || null,
    attachment_mime: input.attachment_mime || null,
    attachment_extracted_text: input.attachment_extracted_text || null,
    created_by: input.created_by || null
  }));

  try {
    const { data, error } = await supabase
      .from('family_board_items')
      .insert(payloads)
      .select();

    if (error) {
      if (isTableMissingError(error)) {
        const nowIso = new Date().toISOString();
        const fallbackItems: FamilyBoardItem[] = payloads.map((p, idx) => ({
          ...p,
          id: `local-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          created_at: nowIso,
          updated_at: nowIso,
          completed_at: null
        }));
        const current = readLocalBoardCache(familyId);
        writeLocalBoardCache(familyId, [...fallbackItems, ...current]);
        return enrichBoardItemsWithMembers(fallbackItems, members);
      }
      throw error;
    }

    const createdList = (data || []) as FamilyBoardItem[];
    const current = readLocalBoardCache(familyId);
    writeLocalBoardCache(familyId, [...createdList, ...current]);
    return enrichBoardItemsWithMembers(createdList, members);
  } catch (err) {
    const nowIso = new Date().toISOString();
    const fallbackItems: FamilyBoardItem[] = payloads.map((p, idx) => ({
      ...p,
      id: `local-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: nowIso,
      updated_at: nowIso,
      completed_at: null
    }));
    const current = readLocalBoardCache(familyId);
    writeLocalBoardCache(familyId, [...fallbackItems, ...current]);
    return enrichBoardItemsWithMembers(fallbackItems, members);
  }
}

export async function updateBoardItem(
  itemId: string,
  familyId: string,
  updates: Partial<CreateBoardItemInput> & { completed_at?: string | null },
  members: FamilyMember[] = []
): Promise<FamilyBoardItem | null> {
  const current = readLocalBoardCache(familyId);
  const updatedLocalList = current.map((item) =>
    item.id === itemId
      ? {
          ...item,
          ...updates,
          updated_at: new Date().toISOString()
        }
      : item
  );
  writeLocalBoardCache(familyId, updatedLocalList);
  const localTarget = updatedLocalList.find((i) => i.id === itemId) || null;

  if (itemId.startsWith('local-')) {
    return localTarget ? enrichBoardItemsWithMembers([localTarget], members)[0] : null;
  }

  try {
    const { data, error } = await supabase
      .from('family_board_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      if (isTableMissingError(error)) {
        return localTarget ? enrichBoardItemsWithMembers([localTarget], members)[0] : null;
      }
      throw error;
    }

    const updated = data as FamilyBoardItem;
    const syncedList = updatedLocalList.map((i) => (i.id === itemId ? updated : i));
    writeLocalBoardCache(familyId, syncedList);
    return enrichBoardItemsWithMembers([updated], members)[0];
  } catch {
    return localTarget ? enrichBoardItemsWithMembers([localTarget], members)[0] : null;
  }
}

export async function deleteBoardItem(itemId: string, familyId: string): Promise<boolean> {
  const current = readLocalBoardCache(familyId);
  writeLocalBoardCache(
    familyId,
    current.filter((i) => i.id !== itemId)
  );

  if (itemId.startsWith('local-')) {
    return true;
  }

  try {
    const { error } = await supabase.from('family_board_items').delete().eq('id', itemId);
    if (error && !isTableMissingError(error)) {
      throw error;
    }
    return true;
  } catch {
    return true;
  }
}

export async function uploadBoardAttachment(
  familyId: string,
  file: File,
  fallbackDataUrl?: string
): Promise<{ path: string; name: string; mime: string }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${familyId}/${Date.now()}_${safeName}`;
  const mime = file.type || 'application/octet-stream';

  try {
    const { data, error } = await supabase.storage
      .from('board-attachments')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: mime
      });

    if (!error && data?.path) {
      return {
        path: data.path,
        name: file.name,
        mime
      };
    }
  } catch (err) {
    console.warn('[Board] Storage bucket indisponível, usando Data URL embutido:', err);
  }

  // Fallback para Data URL caso o bucket ainda não tenha sido criado no Supabase remoto
  if (fallbackDataUrl) {
    return {
      path: fallbackDataUrl,
      name: file.name,
      mime
    };
  }

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });

  return {
    path: dataUrl,
    name: file.name,
    mime
  };
}

export async function getBoardAttachmentUrl(attachmentPath?: string | null): Promise<string | null> {
  if (!attachmentPath) return null;
  if (attachmentPath.startsWith('data:') || attachmentPath.startsWith('http')) {
    return attachmentPath;
  }

  try {
    const { data: publicData } = supabase.storage
      .from('board-attachments')
      .getPublicUrl(attachmentPath);
    if (publicData?.publicUrl) {
      return publicData.publicUrl;
    }

    const { data: signedData } = await supabase.storage
      .from('board-attachments')
      .createSignedUrl(attachmentPath, 3600);
    return signedData?.signedUrl || null;
  } catch {
    return null;
  }
}

export type BoardUrgencyGroup = 'pinned' | 'overdue' | 'todayTomorrow' | 'thisWeek' | 'upcoming' | 'completed';

export interface GroupedBoardItems {
  pinned: FamilyBoardItem[];
  overdue: FamilyBoardItem[];
  todayTomorrow: FamilyBoardItem[];
  thisWeek: FamilyBoardItem[];
  upcoming: FamilyBoardItem[];
  completed: FamilyBoardItem[];
}

export function getDaysDiffFromToday(dueDateStr?: string | null): number | null {
  if (!dueDateStr) return null;
  const todayStr = toLocalDateString();
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const [dy, dm, dd] = dueDateStr.slice(0, 10).split('-').map(Number);
  if (!ty || !dy) return null;

  const todayNoon = new Date(ty, tm - 1, td, 12, 0, 0);
  const dueNoon = new Date(dy, dm - 1, dd, 12, 0, 0);
  return Math.round((dueNoon.getTime() - todayNoon.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDueBadgeInfo(item: FamilyBoardItem): {
  label: string;
  tone: 'overdue' | 'urgent' | 'soon' | 'normal' | 'done' | 'none';
} {
  if (item.status === 'DONE') {
    return { label: 'Concluído', tone: 'done' };
  }
  const diff = getDaysDiffFromToday(item.due_date);
  if (diff === null) {
    return { label: 'Sem prazo fixo', tone: 'none' };
  }
  const formatted = formatBoardDateShort(item.due_date!);
  if (diff < 0) {
    const abs = Math.abs(diff);
    return { label: `Atrasado há ${abs}d (${formatted})`, tone: 'overdue' };
  }
  if (diff === 0) {
    return { label: `É HOJE! (${formatted})`, tone: 'urgent' };
  }
  if (diff === 1) {
    return { label: `É AMANHÃ (${formatted})`, tone: 'urgent' };
  }
  if (diff <= 7) {
    return { label: `Faltam ${diff} dias (${formatted})`, tone: 'soon' };
  }
  return { label: `${formatted} (em ${diff} dias)`, tone: 'normal' };
}

export function formatBoardDateShort(dateStr?: string | null): string {
  if (!dateStr) return '';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  const dateObj = new Date(y, m - 1, d, 12, 0, 0);
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const wd = weekDays[dateObj.getDay()] || '';
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')} (${wd})`;
}

export function groupBoardItemsByUrgency(items: FamilyBoardItem[]): GroupedBoardItems {
  const result: GroupedBoardItems = {
    pinned: [],
    overdue: [],
    todayTomorrow: [],
    thisWeek: [],
    upcoming: [],
    completed: []
  };

  for (const item of items) {
    if (item.status === 'DONE' || item.status === 'ARCHIVED') {
      result.completed.push(item);
      continue;
    }

    const diff = getDaysDiffFromToday(item.due_date);

    // Auto-ocultar provas/entregas cujo prazo já passou há mais de 14 dias se não estiverem fixadas
    if (diff !== null && diff < -14 && !item.is_pinned) {
      result.completed.push(item);
      continue;
    }

    if (item.is_pinned) {
      result.pinned.push(item);
      continue;
    }

    if (diff !== null && diff < 0) {
      result.overdue.push(item);
    } else if (diff !== null && diff <= 1) {
      result.todayTomorrow.push(item);
    } else if (diff !== null && diff <= 7) {
      result.thisWeek.push(item);
    } else {
      result.upcoming.push(item);
    }
  }

  return result;
}

