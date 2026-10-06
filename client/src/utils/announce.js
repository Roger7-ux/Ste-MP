// Spoken announcements with the browser's Web Speech API: English first, then
// Hindi. Only the queue number, room and doctor are read out, never a
// patient's name. Change the wording or add a language in ANNOUNCEMENTS.

const ANNOUNCEMENTS = [
  {
    lang: 'en-IN',
    text: ({ token, room, doctor }) =>
      room ? `Token number ${token}. Please proceed to room ${room}, ${doctor}.` : `Token number ${token}. Please proceed to ${doctor}.`,
  },
  {
    lang: 'hi-IN',
    text: ({ token, room }) =>
      room ? `टोकन नंबर ${token}. कृपया कमरा नंबर ${room} में आइए.` : `टोकन नंबर ${token}. कृपया डॉक्टर के पास आइए.`,
  },
];

const ANNOUNCE_KEY = 'clinic_announce';

export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

// Whether the front desk wants calls read aloud. Remembered on this device.
export function announceEnabled() {
  try {
    return localStorage.getItem(ANNOUNCE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setAnnounceEnabled(on) {
  try {
    localStorage.setItem(ANNOUNCE_KEY, on ? 'on' : 'off');
  } catch {
    // The choice then lasts until the page is reloaded.
  }
}

function voiceFor(lang) {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => voice.lang === lang) || voices.find((voice) => voice.lang.startsWith(lang.slice(0, 2)));
}

// A short two-note chime before the voice, so heads turn before the number.
function chime() {
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    const context = new Context();
    [660, 880].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * 0.22;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.45);
    });
    setTimeout(() => context.close(), 1200);
  } catch {
    // No audio output available; the visual alert still shows.
  }
}

// Calls already read out on this page, so a call is never announced twice:
// once when the front desk makes it and again when the board next refreshes.
const announced = new Set();
// A call is known by its appointment ID and the moment it was made; both are
// the same on the staff, patient, tracking and waiting-room screens.
const callKey = (appointment) => `${appointment.appointmentId}:${appointment.timeline?.calledAt || appointment.calledAt}`;

// Remembers a call without announcing it, for calls that were already on
// screen when the page opened.
export function markAnnounced(appointment) {
  announced.add(callKey(appointment));
}

// Announces a call unless this page has already done so. Returns whether it
// was new.
export function announceOnce(appointment, { speak = true } = {}) {
  const key = callKey(appointment);
  if (announced.has(key)) return false;
  announced.add(key);
  if (speak) announceCall(appointment);
  return true;
}

// Announces a called patient. Takes an appointment, or the `lastCalled` entry
// of the waiting-room board. Browsers only allow sound after the person has
// interacted with the page, so screens offer a control that switches it on.
export function announceCall({ tokenNumber, appointmentId, doctorName, room }) {
  chime();
  if (!speechSupported()) return;
  const details = {
    // Before check-in there is no queue number, so the ID is spelled out.
    token: tokenNumber ?? appointmentId.replace(/-/g, ' ').split('').join(' '),
    room,
    doctor: doctorName.replace(/^Dr\.?\s+/i, 'Doctor '),
  };
  const synth = window.speechSynthesis;
  synth.cancel();
  for (const { lang, text } of ANNOUNCEMENTS) {
    const utterance = new SpeechSynthesisUtterance(text(details));
    utterance.lang = lang;
    utterance.rate = 0.9;
    const voice = voiceFor(lang);
    if (voice) utterance.voice = voice;
    synth.speak(utterance);
  }
}
