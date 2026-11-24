import { createSoundscape, defaults } from './sound-engine.js';
const $ = id => document.getElementById(id);
const settings = { ...defaults };
const presets = { drift: defaults, deep: { ...defaults, motion: 20, space: 55, warmth: 90, drone: 85, voice: 30, bells: 10, air: 40 }, shimmer: { ...defaults, motion: 65, space: 90, warmth: 35, drone: 45, voice: 65, bells: 65, air: 15 } };
let context, engine, playing = false, busy = false, elapsed = 0, began = 0, deadline = 0;
function renderControls() {
  for (const [key, value] of Object.entries(settings)) { $(key).value = value; $(`${key}-out`).value = `${value}%`; }
  document.querySelector('.orbital').style.setProperty('--speed', settings.motion);
}
function showState(message) {
  document.body.classList.toggle('playing', playing); $('status').textContent = message;
  $('play').setAttribute('aria-label', playing ? 'Pause soundscape' : 'Start soundscape');
  $('play-text').textContent = playing ? 'Pause listening' : 'Start listening';
  $('play-icon').innerHTML = playing ? '<path d="M7 5h4v14H7zm7 0h4v14h-4z"/>' : '<path d="m9 5 11 7-11 7Z"/>';
  document.querySelectorAll('.orbit-dot').forEach(dot => { dot.style.animationPlayState = document.hidden || !playing ? 'paused' : 'running'; });
}
async function pause(message = 'Take your time') {
  if (!playing) return;
  busy = true; $('play').disabled = true;
  engine.fadeOut(.7);
  await new Promise(resolve => setTimeout(resolve, 750));
  elapsed += (context.currentTime - began); if (deadline) elapsed = Math.min(elapsed, deadline); playing = false;
  engine.mute(); await context.suspend(); busy = false; $('play').disabled = false; showState(message);
}
function scheduleTimer() { engine?.scheduleEnd(deadline ? Math.max(0, deadline - elapsed - (playing ? context.currentTime - began : 0)) : null); }
function setDeadline() { const minutes = Number($('timer').value); deadline = minutes ? elapsed + minutes * 60 : 0; scheduleTimer(); }
$('play').addEventListener('click', async () => {
  if (busy) return;
  if (playing) { await pause(); return; }
  busy = true; $('play').disabled = true; $('status').textContent = 'Preparing your soundscape…';
  try {
    if (!context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('This browser does not support Web Audio. Try Chrome, Safari or Firefox.');
      context = new Audio(); await context.resume(); engine = createSoundscape(context, settings);
      context.addEventListener('statechange', () => {
        if ((context.state === 'interrupted' || context.state === 'suspended') && playing && !busy) {
          engine.mute(); elapsed += context.currentTime - began; if (deadline) elapsed = Math.min(elapsed, deadline);
          playing = false; showState('Audio interrupted. Tap to resume.');
        }
      });
    } else { await context.resume(); engine.update('volume', settings.volume); }
    engine.unmute(); engine.setMono($('mono').checked); began = context.currentTime; playing = true;
    if (deadline && elapsed >= deadline) { elapsed = 0; setDeadline(); }
    scheduleTimer();
    showState($('mono').checked ? 'Listening in mono' : 'Sound in motion');
  } catch (error) {
    playing = false; $('status').textContent = error.message || 'Audio could not start. Please try again.';
    if (context) await context.close().catch(() => {}); context = null; engine = null;
  } finally { busy = false; $('play').disabled = false; }
});
for (const key of Object.keys(defaults)) $(key).addEventListener('input', event => {
  settings[key] = Number(event.target.value); $(`${key}-out`).value = `${settings[key]}%`; engine?.update(key, settings[key]);
  document.querySelectorAll('[data-preset]').forEach(button => { button.classList.remove('selected'); button.setAttribute('aria-pressed','false'); });
});
function applyPreset(name) {
  const volume = settings.volume; Object.assign(settings, presets[name], { volume }); renderControls();
  if (engine) for (const [key, value] of Object.entries(settings)) engine.update(key, value);
  document.querySelectorAll('[data-preset]').forEach(button => { const active = button.dataset.preset === name; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); });
}
document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => applyPreset(button.dataset.preset)));
$('reset').addEventListener('click', () => { settings.volume = defaults.volume; applyPreset('drift'); $('mono').checked = false; engine?.setMono(false); if (playing) showState('Sound in motion'); });
$('mono').addEventListener('change', event => { engine?.setMono(event.target.checked); if (playing) showState(event.target.checked ? 'Listening in mono' : 'Sound in motion'); });
$('timer').addEventListener('change', () => { if (playing) elapsed += context.currentTime - began; if (playing) began = context.currentTime; setDeadline(); });
setInterval(() => {
  let total = elapsed + (playing ? context.currentTime - began : 0); if (deadline) total = Math.min(total, deadline);
  $('elapsed').textContent = `${Math.floor(total / 60).toString().padStart(2,'0')}:${Math.floor(total % 60).toString().padStart(2,'0')}`;
  if (playing && !busy && deadline && total >= deadline) pause('Session complete. A moment well spent.');
}, 500);
document.addEventListener('visibilitychange', () => { document.querySelectorAll('.orbit-dot').forEach(dot => { dot.style.animationPlayState = document.hidden || !playing ? 'paused' : 'running'; }); });
window.addEventListener('pagehide', () => { engine?.stop(); context?.close().catch(() => {}); context = null; engine = null; playing = false; busy = false; $('play').disabled = false; showState('Ready when you are'); });
