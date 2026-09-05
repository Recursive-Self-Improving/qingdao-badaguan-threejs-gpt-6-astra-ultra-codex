/** A small, entirely local soundscape. Audio starts only after toggle(). */
export class AmbientAudio {
  constructor() {
    this.enabled = false;
    this.volume = 0.5;
    this.context = null;
    this.master = null;
    this._sources = new Set();
    this._birdTimer = null;
    this._transition = null;
    this._disposed = false;
  }

  _create() {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) throw new Error('這個瀏覽器尚不支援環境音效。');

    const context = new Context();
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = 0;
    this.master.connect(context.destination);

    // Separate, gently filtered noise layers avoid a conspicuous short loop.
    const noise = context.createBuffer(2, context.sampleRate * 9, context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const samples = noise.getChannelData(channel);
      let last = 0;
      for (let index = 0; index < samples.length; index += 1) {
        last = (last + (Math.random() * 2 - 1) * 0.025) / 1.025;
        samples[index] = last * 3.5;
      }
      // Bring both ends to zero so even a quiet loop seam stays inaudible.
      const edge = Math.floor(context.sampleRate * 0.07);
      for (let index = 0; index < edge; index += 1) {
        const taper = index / edge;
        samples[index] *= taper;
        samples[samples.length - index - 1] *= taper;
      }
    }

    this._noiseLayer(noise, 0, 950, 0.33, 0.24, 0.084);
    this._noiseLayer(noise, 3.8, 420, 0.17, 0.09, 0.043);

    // A barely audible upper breeze gives the shoreline a little air.
    const breeze = context.createBufferSource();
    breeze.buffer = noise;
    breeze.loop = true;
    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 550;
    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 2200;
    lowpass.Q.value = 0.4;
    const gain = context.createGain();
    gain.gain.value = 0.065;
    breeze.connect(highpass).connect(lowpass).connect(gain).connect(this.master);
    this._sources.add(breeze);
    breeze.start(0, 1.7);
  }

  _noiseLayer(buffer, offset, cutoff, level, depth, frequency) {
    const context = this.context;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 65;
    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = cutoff;
    lowpass.Q.value = 0.5;
    const swell = context.createGain();
    swell.gain.value = level;
    source.connect(highpass).connect(lowpass).connect(swell).connect(this.master);

    const tide = context.createOscillator();
    tide.frequency.value = frequency;
    const modulation = context.createGain();
    modulation.gain.value = depth;
    tide.connect(modulation).connect(swell.gain);
    this._sources.add(source);
    this._sources.add(tide);
    source.start(0, offset);
    tide.start();
  }

  _scheduleBird() {
    clearTimeout(this._birdTimer);
    this._birdTimer = setTimeout(() => {
      if (!this.enabled || this._disposed) return;
      const context = this.context;
      if (context.state === 'running') {
        const start = context.currentTime + 0.02;
        const pan = typeof context.createStereoPanner === 'function'
          ? context.createStereoPanner()
          : context.createGain();
        if (pan.pan) pan.pan.value = Math.random() * 1.4 - 0.7;
        pan.connect(this.master);
        const count = 2 + Math.floor(Math.random() * 2);
        let remaining = count;
        const pitch = 1600 + Math.random() * 650;
        for (let index = 0; index < count; index += 1) {
          const at = start + index * 0.21;
          const bird = context.createOscillator();
          bird.type = 'sine';
          bird.frequency.setValueAtTime(pitch, at);
          bird.frequency.exponentialRampToValueAtTime(pitch * 1.27, at + 0.05);
          bird.frequency.exponentialRampToValueAtTime(pitch * 0.83, at + 0.15);
          const envelope = context.createGain();
          envelope.gain.setValueAtTime(0, at);
          envelope.gain.linearRampToValueAtTime(0.016, at + 0.025);
          envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.17);
          bird.connect(envelope).connect(pan);
          this._sources.add(bird);
          bird.onended = () => {
            this._sources.delete(bird);
            bird.disconnect();
            envelope.disconnect();
            remaining -= 1;
            if (remaining === 0) pan.disconnect();
          };
          bird.start(at);
          bird.stop(at + 0.2);
        }
      }
      this._scheduleBird();
    }, 11000 + Math.random() * 16000);
  }

  async toggle() {
    if (this._disposed) throw new Error('環境音效已關閉，請重新整理頁面再試。');
    if (this._transition) return this._transition;

    this._transition = (async () => {
      if (!this.context) this._create();
      const context = this.context;
      if (this.enabled) {
        this.enabled = false;
        clearTimeout(this._birdTimer);
        this.master.gain.cancelScheduledValues(context.currentTime);
        this.master.gain.setTargetAtTime(0, context.currentTime, 0.025);
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (context.state !== 'closed') await context.suspend();
      } else {
        // Invoked directly in the click handler, preserving browser permission.
        await context.resume();
        if (this._disposed) return false;
        if (context.state !== 'running') {
          throw new Error('瀏覽器暫時無法播放音效，請再點選一次。');
        }
        this.enabled = true;
        this.master.gain.cancelScheduledValues(context.currentTime);
        this.master.gain.setTargetAtTime(this.volume, context.currentTime, 0.7);
        this._scheduleBird();
      }
      return this.enabled;
    })();

    try {
      return await this._transition;
    } finally {
      this._transition = null;
    }
  }

  setVolume(value) {
    if (!Number.isFinite(value)) return;
    this.volume = Math.min(1, Math.max(0, value));
    if (this.enabled && this.context?.state === 'running') {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.15);
    }
  }

  dispose() {
    this._disposed = true;
    this.enabled = false;
    clearTimeout(this._birdTimer);
    for (const source of this._sources) {
      try { source.stop(); } catch { /* Already completed. */ }
      source.disconnect();
    }
    this._sources.clear();
    this.master?.disconnect();
    if (this.context && this.context.state !== 'closed') {
      void this.context.close().catch(() => {});
    }
  }
}
