import { FamilyMember } from '../types';

export function getGeminiApiKey(): string {
  return (
    import.meta.env.VITE_GEMINI_API_KEY ||
    localStorage.getItem('nosso_dia_gemini_key') ||
    ''
  );
}

export function setGeminiApiKey(key: string): void {
  localStorage.setItem('nosso_dia_gemini_key', key.trim());
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
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error('Chave da API do Google Gemini não configurada. Insira sua chave gratuita do Google AI Studio.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Erro na API do Gemini (${response.status}: ${response.statusText})`
    );
  }

  const result = await response.json();
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
