// Original procedural audio. No sampled or redistributed Endel content.
export const defaults = { volume: 45, motion: 45, space: 75, warmth: 65, drone: 65, voice: 50, bells: 35, air: 25 };

export function createSoundscape(ctx, values = defaults, seed = Date.now()) {
  const settings = { ...defaults, ...values };
  let state = seed >>> 0;
  const random = () => ((state = (1664525 * state + 1013904223) >>> 0) / 4294967296);
  const sources = [], layers = {}, spatial = [];
  let isMono = false;
  const now = ctx.currentTime;
  const gain = (value) => { const node = ctx.createGain(); node.gain.value = value; return node; };
  const oscillator = (frequency, type = 'sine') => {
    const node = ctx.createOscillator(); node.type = type; node.frequency.value = frequency; sources.push(node); return node;
  };
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18; compressor.knee.value = 20; compressor.ratio.value = 5;
  compressor.attack.value = .015; compressor.release.value = .4;
  const master = gain(0), playbackGate = gain(1), sessionGate = gain(1), tone = ctx.createBiquadFilter(); tone.type = 'lowpass';
  tone.frequency.value = 6500 - settings.warmth * 48;
  const highpass = ctx.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = 35;
  const analyser = ctx.createAnalyser(); analyser.fftSize = 256;
  tone.connect(highpass).connect(compressor).connect(master).connect(playbackGate).connect(sessionGate).connect(analyser).connect(ctx.destination);

  // A short, generated stereo room. Its two tails have different random sequences.
  const reverb = ctx.createConvolver(), impulse = ctx.createBuffer(2, ctx.sampleRate * 3.5, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < data.length; i++) data[i] = (random() * 2 - 1) * Math.pow(1 - i / data.length, 3.5) * .35;
  }
  reverb.buffer = impulse; const wet = gain(settings.space / 100 * .34); reverb.connect(wet).connect(tone);
  const mono = gain(1);
  const channelMerger = ctx.createChannelMerger(2);
  mono.connect(channelMerger, 0, 0); mono.connect(channelMerger, 0, 1);
  // Used only by the mono audition mode, mixed at zero otherwise.
  const monoLevel = gain(0); channelMerger.connect(monoLevel).connect(tone);
  const stereoLevel = gain(1); stereoLevel.connect(tone);

  const orbit = (input, rate, phase, elevation = 0) => {
    const panner = ctx.createPanner(); panner.panningModel = 'HRTF'; panner.distanceModel = 'inverse';
    panner.refDistance = 2; panner.rolloffFactor = .2; panner.positionY.value = elevation;
    panner.positionX.value = 0; panner.positionZ.value = 0;
    const cos = ctx.createPeriodicWave(new Float32Array([0, Math.cos(phase)]), new Float32Array([0, -Math.sin(phase)]));
    const sin = ctx.createPeriodicWave(new Float32Array([0, Math.sin(phase)]), new Float32Array([0, Math.cos(phase)]));
    const speed = rate * (.2 + settings.motion / 100 * 2.2);
    const x = oscillator(speed), z = oscillator(speed); x.setPeriodicWave(sin); z.setPeriodicWave(cos);
    const gx = gain(settings.space / 100 * 2.6), gz = gain(settings.space / 100 * 2.6);
    x.connect(gx).connect(panner.positionX); z.connect(gz).connect(panner.positionZ);
    input.connect(panner); panner.connect(stereoLevel); input.connect(mono); panner.connect(reverb);
    spatial.push({ x, z, gx, gz, rate }); return panner;
  };
  const layer = (name, level) => { const node = gain(settings[name] / 100 * level); layers[name] = { node, level }; return node; };

  // Slow, detuned open fifths and ninths, with independent envelopes and orbits.
  const drone = layer('drone', .18);
  [73.416, 110, 146.832, 164.814, 220].forEach((frequency, index) => {
    const pair = gain(.38), a = oscillator(frequency), b = oscillator(frequency * 1.0017);
    a.connect(pair); b.connect(pair); const breathe = gain(.52);
    pair.connect(breathe); const lfo = oscillator(.027 + index * .009), amount = gain(.13);
    lfo.connect(amount).connect(breathe.gain); breathe.connect(drone);
  });
  orbit(drone, .009, 0, .15);

  const voice = layer('voice', .075), voiceInput = gain(1);
  [146.832, 220.0, 293.664].forEach((frequency, index) => {
    const osc = oscillator(frequency, 'sawtooth'); osc.detune.value = (index - 1) * 4;
    const envelope = gain(.33), lfo = oscillator(.035 + index * .007), depth = gain(.22);
    lfo.connect(depth).connect(envelope.gain); osc.connect(envelope);
    [[450, 5, .32], [1050, 7, .16], [2300, 9, .035]].forEach(([hz, q, amp]) => {
      const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = hz; band.Q.value = q;
      const scale = gain(amp); envelope.connect(band).connect(scale).connect(voiceInput);
    });
  });
  voiceInput.connect(voice); orbit(voice, .018, 2.5, .35);

  const bells = layer('bells', .12), bellTone = ctx.createBiquadFilter(); bellTone.type = 'lowpass'; bellTone.frequency.value = 1800;
  const notes = [293.664, 329.628, 440, 587.328, 659.256];
  // Different phrase lengths keep the small motifs from repeating together.
  [19, 29, 37, 43, 53].forEach((length, index) => {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * length, ctx.sampleRate), data = buffer.getChannelData(0);
    const note = notes[index];
    for (let k = 0; k < 3; k++) {
      const start = Math.floor((1 + random() * (length - 8)) * ctx.sampleRate);
      for (let j = 0; j < ctx.sampleRate * 6 && start + j < data.length; j++) {
        const t = j / ctx.sampleRate, attack = Math.min(1, t / .08), env = attack * Math.exp(-t * 1.25);
        data[start + j] += env * (Math.sin(2 * Math.PI * note * t) * .42 + Math.sin(2 * Math.PI * note * 2.003 * t) * .12);
      }
    }
    const src = ctx.createBufferSource(); src.buffer = buffer; src.loop = true; sources.push(src); src.connect(bellTone);
  });
  bellTone.connect(bells); orbit(bells, .027, 4.1, .6);

  const air = layer('air', .11), noise = ctx.createBuffer(1, ctx.sampleRate * 13, ctx.sampleRate), data = noise.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < data.length; i++) { brown = (brown + (random() * 2 - 1) * .02) / 1.02; data[i] = brown * 3.5; }
  const noiseSrc = ctx.createBufferSource(); noiseSrc.buffer = noise; noiseSrc.loop = true; sources.push(noiseSrc);
  const airFilter = ctx.createBiquadFilter(); airFilter.type = 'lowpass'; airFilter.frequency.value = 1400;
  noiseSrc.connect(airFilter).connect(air); orbit(air, .012, 1.3, -.2);

  sources.forEach(source => source.start(now));
  master.gain.setTargetAtTime(settings.volume / 100 * .65, now, .8);
  return {
    settings, analyser, master, sessionGate, sources, layers,
    update(key, value) {
      settings[key] = Number(value); const time = ctx.currentTime;
      if (key === 'volume') master.gain.setTargetAtTime(value / 100 * .65, time, .12);
      if (key === 'warmth') tone.frequency.setTargetAtTime(6500 - value * 48, time, .2);
      if (layers[key]) layers[key].node.gain.setTargetAtTime(value / 100 * layers[key].level, time, .3);
      if (key === 'space') {
        wet.gain.setTargetAtTime(isMono ? 0 : value / 100 * .34, time, .3);
        spatial.forEach(({ gx, gz }) => { gx.gain.setTargetAtTime(value / 100 * 2.6, time, .3); gz.gain.setTargetAtTime(value / 100 * 2.6, time, .3); });
      }
      if (key === 'motion') spatial.forEach(({ x, z, rate }) => {
        const speed = rate * (.2 + value / 100 * 2.2); x.frequency.setTargetAtTime(speed, time, .3); z.frequency.setTargetAtTime(speed, time, .3);
      });
    },
    setMono(enabled) { isMono = enabled; stereoLevel.gain.setTargetAtTime(enabled ? 0 : 1, ctx.currentTime, .1); monoLevel.gain.setTargetAtTime(enabled ? 1 : 0, ctx.currentTime, .1); wet.gain.setTargetAtTime(enabled ? 0 : settings.space / 100 * .34, ctx.currentTime, .1); },
    scheduleEnd(seconds) {
      const time = ctx.currentTime;
      sessionGate.gain.cancelScheduledValues(time);
      if (seconds !== null && seconds <= 0) { sessionGate.gain.setValueAtTime(0, time); return; }
      sessionGate.gain.setValueAtTime(1, time);
      if (seconds !== null) {
        const end = time + seconds;
        sessionGate.gain.setValueAtTime(1, Math.max(time, end - .8));
        sessionGate.gain.linearRampToValueAtTime(0, end);
      }
    },
    mute() { playbackGate.gain.cancelScheduledValues(ctx.currentTime); playbackGate.gain.setValueAtTime(0, ctx.currentTime); },
    unmute() { playbackGate.gain.cancelScheduledValues(ctx.currentTime); playbackGate.gain.setTargetAtTime(1, ctx.currentTime, .05); },
    fadeOut(seconds = 1) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, seconds / 4); },
    stop() { sources.forEach(source => { try { source.stop(); } catch {} }); }
  };
}
