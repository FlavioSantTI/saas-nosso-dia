// apps/web/src/lib/alarmAudio.ts
// Controlador de áudio do Alarme com suporte a HTML5 Audio e Web Audio API Synth Fallback

let audioElement: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
let synthIntervalId: any = null;
let isPlaying = false;

/**
 * Dispara um bip duplo melódico usando a Web Audio API sintetizada nativa
 */
function playSynthBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioCtx();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const now = audioContext.currentTime;

    // Primeiro tom (880 Hz - Lá 5)
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Segundo tom (1174.66 Hz - Ré 6)
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.12);
    gain2.gain.setValueAtTime(0.35, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.35);
  } catch (err) {
    console.warn('[AlarmAudio] Erro no sintetizador Web Audio:', err);
  }
}

/**
 * Inicia a reprodução contínua do alarme sonoro
 */
export async function startAlarm(): Promise<void> {
  if (isPlaying) return;
  isPlaying = true;

  // 1. Tenta carregar e tocar o arquivo de áudio estático (/sounds/alarm.mp3)
  try {
    if (!audioElement) {
      audioElement = new Audio('/sounds/alarm.mp3');
      audioElement.loop = true;
    }
    audioElement.currentTime = 0;
    await audioElement.play();
    return;
  } catch (err) {
    console.warn('[AlarmAudio] HTML5 Audio bloqueado ou falhou, ativando Web Audio API Fallback:', err);
  }

  // 2. Fallback: Sintetizador Web Audio API em loop a cada 1 segundo
  playSynthBeep();
  synthIntervalId = setInterval(() => {
    if (!isPlaying) {
      clearInterval(synthIntervalId);
      return;
    }
    playSynthBeep();
  }, 1000);
}

/**
 * Interrompe imediatamente qualquer som de alarme em execução
 */
export function stopAlarm(): void {
  isPlaying = false;

  if (audioElement) {
    try {
      audioElement.pause();
      audioElement.currentTime = 0;
    } catch {}
  }

  if (synthIntervalId) {
    clearInterval(synthIntervalId);
    synthIntervalId = null;
  }

  if (audioContext && audioContext.state !== 'closed') {
    try {
      audioContext.suspend();
    } catch {}
  }
}

export function isAlarmActive(): boolean {
  return isPlaying;
}

