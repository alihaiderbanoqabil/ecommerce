/**
 * Notification ki chhoti si "ding" — Web Audio API se banti hai, koi mp3 file
 * ya library nahi.
 *
 * AudioContext ek hi banta hai aur reuse hota rehta hai: browsers har page par
 * gine chune contexts (~6) allow karte hain, is liye har notification par naya
 * banana kuch der baad chup chaap fail karne lagta hai.
 *
 * Autoplay policy: jab tak user ne page par ek dafa click/type na kiya ho,
 * context "suspended" rehta hai aur awaaz nahi aati. Ye error nahi hai —
 * browse/scroll/click karte hue pehla interaction ho hi chuka hota hai, aur us
 * se pehle chup rehna hi theek hai.
 */

let audioContext = null;

// Seedha start/stop karne se "click"/"pop" ki awaaz aati hai — is liye chhota
// sa fade-in aur exponential fade-out.
const beep = (context, frequency, startAt, duration) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(0.12, startAt + 0.012);
  // exponentialRampToValueAtTime kabhi 0 par nahi ja sakta, is liye 0.0001
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain).connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration);
};

export const playNotificationSound = () => {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();

    // Tab background mein rahi ho ya pehla gesture abhi hua ho to context
    // suspended hota hai. resume() reject bhi kar sakta hai (koi gesture nahi
    // hua) — us soorat mein bas khamoshi, koi unhandled rejection nahi.
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});

    const now = audioContext.currentTime;
    beep(audioContext, 880, now, 0.18); // A5
    beep(audioContext, 1174.66, now + 0.11, 0.22); // D6 — do sur "ding" bana dete hain
  } catch {
    // Awaaz optional hai: purana browser ya blocked audio notification ko
    // rokta nahi — toast aur bell phir bhi kaam karte hain.
  }
};
