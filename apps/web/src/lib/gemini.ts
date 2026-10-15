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
  participant: FamilyMember;
  participants?: FamilyMember[];
  responsible: FamilyMember;
  time: string;
  startTime?: string;
  duration: number;
  days: string[];
  location: string;
}

interface RawGeminiOutput {
  title?: string;
  participant_name?: string;
  responsible_name?: string;
  time?: string;
  duration?: number;
  days?: string[];
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
    throw new Error('Chave da API do Google Gemini não configurada. Configure no Painel Super-Admin ou insira sua chave do Google AI Studio.');
  }

  const membersContext = members
    .map((m) => `- Nome: "${m.name}" (Apelido: "${m.nickname || m.name}"), Papel: ${m.role}`)
    .join('\n');

  const systemInstruction = `Você é o assistente inteligente do aplicativo familiar "Nosso Dia".
Sua tarefa é analisar o texto (mensagem de WhatsApp, e-mail) ou a foto de um bilhete/calendário escolar e extrair uma rotina semanal ou compromisso familiar estruturado.

Membros cadastrados na família:
${membersContext}

Regras estritas:
1. Responda EXCLUSIVAMENTE em formato JSON puro, sem markdown e sem explicações adicionais.
2. Formato obrigatório:
{
  "title": "Nome da atividade (ex: Natação, Escola, Futebol, Terapia) com no máximo 80 caracteres",
  "participant_name": "Nome ou apelido do filho/membro que participa da atividade",
  "responsible_name": "Nome ou apelido do adulto responsável por levar/buscar",
  "time": "Horário de início no formato HH:mm (24h, ex: '06:50', '18:00')",
  "duration": 60,
  "days": ["Segunda", "Quarta"],
  "location": "Nome do local (ex: Colégio Madre Clélia, Clube, NEXO)"
}

3. Se o horário for omitido, sugira um horário coerente ou '08:00'.
4. Se o responsável for mencionado de forma implícita (ex: "eu levo", "eu busco"), atribua ao primeiro adulto/ADMIN cadastrado.
5. Se for um evento avulso de um único dia, coloque no array 'days' apenas o dia da semana correspondente.`;

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

  const matchedParticipant =
    members.find((m) => {
      const pName = (parsed.participant_name || '').toLowerCase();
      return (
        m.name.toLowerCase().includes(pName) ||
        (m.nickname && m.nickname.toLowerCase().includes(pName))
      );
    }) ||
    members.find((m) => m.role === 'CHILD') ||
    members[0];

  const matchedResponsible =
    members.find((m) => {
      const rName = (parsed.responsible_name || '').toLowerCase();
      return (
        m.name.toLowerCase().includes(rName) ||
        (m.nickname && m.nickname.toLowerCase().includes(rName))
      );
    }) ||
    members.find((m) => m.role === 'ADMIN') ||
    members[0];

  const cleanTime = (parsed.time || '18:00').trim().slice(0, 5);
  const timeFormatted = cleanTime.length === 5 ? cleanTime : '18:00';

  return {
    title: (parsed.title || 'Atividade').trim().slice(0, 120),
    participant: matchedParticipant,
    participants: [matchedParticipant],
    responsible: matchedResponsible,
    time: timeFormatted,
    startTime: timeFormatted,
    duration: Number(parsed.duration) || 60,
    days: Array.isArray(parsed.days) && parsed.days.length > 0 ? parsed.days : ['Segunda'],
    location: (parsed.location || 'Local a Definir').trim().slice(0, 80)
  };
}
