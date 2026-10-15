import { FamilyMember } from '../types';
import { supabase } from './supabase';

export function getFallbackGeminiApiKey(): string {
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

/**
 * Obtém a chave ativa da API do Gemini:
 * 1. Obtém a chave corporativa descriptografada em memória (RAM) via RPC do Supabase
 *    armazenada com OpenPGP AES-256 na tabela platform_settings.
 * 2. Em caso de fallback (modo dev local), utiliza a variável de ambiente VITE_GEMINI_API_KEY.
 */
export async function getGeminiApiKey(): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('get_active_ai_key', { p_provider: 'gemini' });
    if (!error && data && typeof data === 'string' && data.trim()) {
      return data.trim();
    }
  } catch (err) {
    // Silencioso se offline ou não autenticado
  }

  return getFallbackGeminiApiKey();
}

export interface ExtractedRoutineData {
  title: string;
  type: 'RECURRING' | 'SINGLE';
  date_str?: string | null;
  days: string[];
  startTime: string;
  time: string;
  duration: number;
  is_all_day: boolean;
  participant?: FamilyMember;
  participants: FamilyMember[];
  responsible: FamilyMember | null;
  location: string;
}

interface RawGeminiOutput {
  title?: string;
  type?: 'RECURRING' | 'SINGLE';
  date_str?: string;
  days?: string[];
  is_all_day?: boolean;
  participant_names?: string[];
  participant_name?: string;
  responsible_name?: string;
  time?: string;
  duration?: number;
  location?: string;
}

export async function extractRoutineWithGemini(
  promptText: string,
  imageBase64: string | null,
  imageMimeType: string | null,
  members: FamilyMember[]
): Promise<ExtractedRoutineData> {
  const apiKey = await getGeminiApiKey();

  if (!apiKey) {
    throw new Error('Chave da API do Google Gemini não configurada. Configure no Painel Super-Admin.');
  }

  const now = new Date();
  const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const currentDayName = dayNames[now.getDay()];
  const currentDateStr = now.toISOString().split('T')[0]; // ex: 2026-10-14

  const membersContext = members
    .map((m) => `- Nome: "${m.name}" (Apelido: "${m.nickname || m.name}"), Papel: ${m.role}`)
    .join('\n');

  const systemInstruction = `Você é o assistente inteligente do aplicativo familiar "Nosso Dia".
Sua tarefa é analisar o texto (mensagem de WhatsApp, áudio ou bilhete escolar) e extrair os dados estruturados do compromisso familiar.

CONTEXTO TEMPORAL DE HOJE:
- Hoje é: ${currentDayName}, data: ${currentDateStr}.
- Se o usuário disser "hoje", use a data ${currentDateStr}.
- Se o usuário disser "amanhã", calcule exatamente o dia seguinte (+1 dia).
- Se o usuário disser um dia da semana específico (ex: "nesta sexta", "sábado que vem"), calcule a data YYYY-MM-DD correspondente mais próxima.

Membros cadastrados na família:
${membersContext}

REGRAS DE CLASSIFICAÇÃO:
1. "type":
   - "SINGLE" para compromissos pontuais/avulsos com data específica (ex: "dentista amanhã", "consulta médica dia 20", "festa no sábado").
   - "RECURRING" para atividades com repetição semanal frequente (ex: "natação toda terça e quinta", "escola de segunda a sexta").
2. "date_str":
   - Se type for "SINGLE", retorne OBRIGATORIAMENTE a data calculada no formato "YYYY-MM-DD".
   - Se type for "RECURRING", retorne null.
3. "days":
   - Se type for "RECURRING", retorne array com os identificadores dos dias da semana: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].
   - Se type for "SINGLE", retorne [].
4. "is_all_day":
   - true se for dia inteiro (aniversário, feriado, viagem), caso contrário false.
5. "participant_names":
   - Array com o nome ou apelido de todos os membros que participam da atividade (pode ser um filho, o pai, a mãe, ou múltiplos membros).
6. "responsible_name":
   - Adulto (pai ou mãe / ADMIN) responsável por levar, buscar ou acompanhar. Se não explícito e um adulto falar "eu vou / meu nome é X", atribua a esse adulto.

Formato OBRIGATÓRIO de saída (JSON puro):
{
  "title": "Nome da atividade (ex: Dentista, Natação, Aniversário) com até 80 chars",
  "type": "SINGLE" | "RECURRING",
  "date_str": "YYYY-MM-DD" | null,
  "days": ["mon", "wed"],
  "is_all_day": false,
  "participant_names": ["Flávio"],
  "responsible_name": "Flávio",
  "time": "14:00",
  "duration": 60,
  "location": "Bertoal Odontologia Avançada"
}`;

  const parts: any[] = [];
  const fullText = `${systemInstruction}\n\nConteúdo a analisar:\n"${promptText || 'Analise a imagem anexa e extraia a rotina escolar.'}"`;
  parts.push({ text: fullText });

  if (imageBase64 && imageMimeType) {
    parts.push({
      inline_data: {
        mime_type: imageMimeType,
        data: imageBase64
      }
    });
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1
    }
  };

  // Modelos suportados em ordem de preferência e modernidade (evita erros 404 de descontinuação)
  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash'
  ];

  let result: any = null;
  let lastErrorMessage = '';

  for (const model of candidateModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        result = await response.json();
        break; // Modelo respondeu com sucesso!
      }

      const errorData = await response.json().catch(() => ({}));
      lastErrorMessage = errorData?.error?.message || `Erro na API do Gemini (${response.status}: ${response.statusText})`;

      // Se não for erro 404 (modelo inexistente nesta versão), aborta para não mascarar erro de auth/cota
      if (response.status !== 404) {
        throw new Error(lastErrorMessage);
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('not found') && !err.message.includes('404')) {
        throw err;
      }
      lastErrorMessage = err.message;
    }
  }

  if (!result) {
    throw new Error(lastErrorMessage || 'Nenhum dos modelos disponíveis do Gemini respondeu à requisição.');
  }
  const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const cleanJson = rawText.replace(/```json\n?|```/g, '').trim();

  let parsed: RawGeminiOutput;
  try {
    parsed = JSON.parse(cleanJson);
  } catch {
    throw new Error('A IA não conseguiu estruturar a resposta em JSON válido.');
  }

  // Identifica participantes
  const identifiedParticipants: FamilyMember[] = [];
  const rawNames = Array.isArray(parsed.participant_names) && parsed.participant_names.length > 0
    ? parsed.participant_names
    : [parsed.participant_name || ''];

  for (const name of rawNames) {
    if (!name) continue;
    const cleanN = name.toLowerCase().trim();
    const found = members.find(
      (m) => m.name.toLowerCase().includes(cleanN) || (m.nickname && m.nickname.toLowerCase().includes(cleanN))
    );
    if (found && !identifiedParticipants.some((p) => p.id === found.id)) {
      identifiedParticipants.push(found);
    }
  }

  if (identifiedParticipants.length === 0) {
    identifiedParticipants.push(members[0]);
  }

  // Identifica responsável adulto
  let matchedResponsible: FamilyMember | null = null;
  if (parsed.responsible_name) {
    const cleanR = parsed.responsible_name.toLowerCase().trim();
    matchedResponsible =
      members.find(
        (m) => (m.name.toLowerCase().includes(cleanR) || (m.nickname && m.nickname.toLowerCase().includes(cleanR))) && m.role === 'ADMIN'
      ) ||
      members.find((m) => m.name.toLowerCase().includes(cleanR) || (m.nickname && m.nickname.toLowerCase().includes(cleanR))) ||
      null;
  }
  if (!matchedResponsible) {
    matchedResponsible = members.find((m) => m.role === 'ADMIN') || members[0] || null;
  }

  const cleanTime = (parsed.time || '14:00').trim().slice(0, 5);
  const timeFormatted = cleanTime.length === 5 ? cleanTime : '14:00';

  // Normaliza dias da semana para os códigos ('mon', 'tue', etc.)
  const dayCodeMap: { [k: string]: string } = {
    'seg': 'mon', 'segunda': 'mon', 'mon': 'mon',
    'ter': 'tue', 'terça': 'tue', 'tue': 'tue',
    'qua': 'wed', 'quarta': 'wed', 'wed': 'wed',
    'qui': 'thu', 'quinta': 'thu', 'thu': 'thu',
    'sex': 'fri', 'sexta': 'fri', 'fri': 'fri',
    'sab': 'sat', 'sáb': 'sat', 'sábado': 'sat', 'sat': 'sat',
    'dom': 'sun', 'domingo': 'sun', 'sun': 'sun'
  };

  const normalizedDays: string[] = [];
  if (Array.isArray(parsed.days)) {
    for (const d of parsed.days) {
      const k = String(d).toLowerCase().trim().replace('-feira', '');
      if (dayCodeMap[k] && !normalizedDays.includes(dayCodeMap[k])) {
        normalizedDays.push(dayCodeMap[k]);
      }
    }
  }

  const activityType: 'RECURRING' | 'SINGLE' =
    parsed.type === 'SINGLE' || (!parsed.type && Boolean(parsed.date_str))
      ? 'SINGLE'
      : 'RECURRING';

  return {
    title: (parsed.title || 'Atividade').trim().slice(0, 100),
    type: activityType,
    date_str: parsed.date_str || (activityType === 'SINGLE' ? currentDateStr : null),
    days: normalizedDays,
    startTime: timeFormatted,
    time: timeFormatted,
    duration: Number(parsed.duration) || 60,
    is_all_day: Boolean(parsed.is_all_day),
    participant: identifiedParticipants[0],
    participants: identifiedParticipants,
    responsible: matchedResponsible,
    location: (parsed.location || '').trim().slice(0, 100)
  };
}
