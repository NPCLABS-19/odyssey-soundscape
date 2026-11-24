# 8D Odyssey: public-player study and original interpretation

Studied on 24 November 2026. Reference: [Endel 8D Odyssey](https://app.endel.io/player/8d-odyssey).

## What was verified

The browser player presents **8D Odyssey**, an hour-dependent context label, a session timer, play/pause, shuffle and volume. Its central abstract visual is a video animation, separate from audio playback.

The public mode configuration in [the player JavaScript bundle](https://app.endel.io/_next/static/chunks/1ai9auqscxiq0.js) identifies:

```js
{
  id: '8d-odyssey',
  modality: 'relax',
  soundBankId: '8d_voice',
  isHasTunepad: false,
  isPremium: true
}
```

The client creates an HTML Audio element and uses HLS.js, or native HLS for Safari. It constructs an `/api/pacific` request with `mode`, `hour`, and `hlsjs`. The non-premium client path also supplies `duration=10`. Mode changes fade the old audio before pausing and destroying its HLS player.

A normal unauthenticated request with the parameters produced by that client returned an HTTP 200 HLS playlist: ten 60-second `.aac` segments for the selected hour. A request for the first listed audio segment returned **HTTP 403**. No further attempt was made to obtain restricted audio.

These observations support a **server-prepared stream selected by mode and hour**, rather than an exposed browser synthesizer. They do not establish how the server composes the sound, whether every session is newly generated, the decoded channel layout, or the proprietary mixing parameters. The sound-bank name suggests a voice-related bank, but is not proof of its audible content.

## What remains unknown

No waveform, spectrum, musical key, tempo, voice sample, rotation period, binaural processing method, or exact signal chain was recovered. Listening-based similarity was not evaluated because audio access was restricted. Endel's [public soundscape directory](https://endel.io/soundscapes) describes 8D Odyssey as an immersive sound experience; it does not publish its DSP design.

## A workable independent design

The following is an original implementation choice, **not a claim about Endel's internal engine**:

1. **Harmonic bed:** sine oscillators at 73.416, 110, 146.832, 164.814 and 220 Hz, with slight detuning and slow amplitude modulation.
2. **Vocal tones:** original sawtooth oscillators through parallel resonant band-pass filters around 450, 1050 and 2300 Hz. This produces vowel-like color without speech or recordings.
3. **Soft chimes:** synthesized partials at pentatonic-related pitches, with slow attacks and decaying envelopes. Phrases of 19, 29, 37, 43 and 53 seconds overlap.
4. **Air:** generated brown noise through a low-pass filter.
5. **Space:** each layer enters an HRTF PannerNode following its own circular path around a virtual listener. Audio-rate sine and cosine modulators drive positionX and positionZ; moving the sound does not depend on a visual render loop.
6. **Room and output:** a generated stereo impulse response, adjustable low-pass warmth, subsonic filtering, a compressor, and smooth master fades.

The “8D” effect is interpreted here as a spatial impression presented over headphones, not eight output channels. Browser [PannerNode documentation](https://developer.mozilla.org/en-US/docs/Web/API/PannerNode) describes the 3D audio-positioning mechanism used in this recreation. The browser and headphones affect the resulting spatial impression.

## Scope and assets

All audio in Orbit is synthesized locally. It uses no Endel audio, video, artwork, account credentials or playback service. The reference informed the investigation; the composition, implementation, interface and adjustable layer mix are original. No health or clinical-effect claim is made.

The sound layer source is [sound-engine.js](./sound-engine.js). The playable interface is [app.js](./app.js). The original service remains [Endel](https://app.endel.io/player/8d-odyssey).
