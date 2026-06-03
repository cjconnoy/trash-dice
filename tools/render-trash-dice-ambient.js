#!/usr/bin/env node

/*
 * Renders the Trash Dice Alpha Complete ambient WebAudio music into standalone
 * audio assets. This intentionally does not modify the game runtime.
 */

const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(REPO_ROOT, 'assets', 'audio');
const BASENAME = 'trash-dice-ambient-alpha';

const CONFIG = {
  source: 'releases/alpha-complete/index.html',
  sourceCommit: 'dc5a995',
  sampleRate: 48000,
  seed: 0x7a1ce,
  musicTargetGain: 0.34,
  musicBeat: 60 / 132,
  musicRoots: [261.63, 349.23, 392.00, 329.63],
  musicMelody: [0, 4, 7, 9, 7, 4, 2, 0, 5, 9, 12, 9, 7, 4, 2, 4]
};

CONFIG.musicBar = CONFIG.musicBeat * 4;
CONFIG.loopBars = CONFIG.musicRoots.length;
CONFIG.duration = CONFIG.musicBar * CONFIG.loopBars;

function parseArgs(argv) {
  const options = {
    encode: true,
    chromePath: process.env.CHROME_PATH || '',
    outDir: OUTPUT_DIR
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--no-encode') {
      options.encode = false;
    } else if (arg === '--chrome') {
      options.chromePath = argv[++i] || '';
    } else if (arg === '--out-dir') {
      options.outDir = path.resolve(argv[++i] || OUTPUT_DIR);
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node tools/render-trash-dice-ambient.js [options]

Options:
  --no-encode          Write only the WAV master.
  --chrome <path>      Use a specific Chrome/Edge executable.
  --out-dir <path>     Output directory. Defaults to assets/audio.
  -h, --help           Show this help.
`);
}

function findBrowser(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.CHROME_PATH,
    path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.PROGRAMFILES || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe')
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  for (const command of ['chrome', 'chrome.exe', 'msedge', 'msedge.exe']) {
    const result = spawnSync('where', [command], { encoding: 'utf8' });
    if (result.status === 0) {
      const found = result.stdout.split(/\r?\n/).find(Boolean);
      if (found && fs.existsSync(found)) return found;
    }
  }

  throw new Error('Could not find Chrome or Edge. Set CHROME_PATH or pass --chrome <path>.');
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(1000, () => {
      req.destroy(new Error(`Timed out requesting ${url}`));
    });
  });
}

async function launchBrowser(chromePath) {
  const port = 53000 + Math.floor(Math.random() * 1000);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trash-dice-audio-render-'));
  const args = [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-renderer-backgrounding',
    'about:blank'
  ];

  const proc = spawn(chromePath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  proc.stderr.on('data', chunk => { stderr += chunk.toString(); });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (proc.exitCode !== null) {
      throw new Error(`Browser exited early.\n${stderr}`);
    }
    try {
      const version = await requestJson(`http://127.0.0.1:${port}/json/version`);
      return { proc, userDataDir, webSocketDebuggerUrl: version.webSocketDebuggerUrl };
    } catch (_) {
      await wait(100);
    }
  }

  proc.kill();
  throw new Error(`Timed out waiting for browser DevTools endpoint.\n${stderr}`);
}

class CdpClient {
  constructor(url) {
    this.url = url;
    this.id = 0;
    this.pending = new Map();
    this.ws = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.addEventListener('open', () => resolve());
      this.ws.addEventListener('error', event => reject(event.error || new Error('WebSocket error')));
      this.ws.addEventListener('message', event => {
        const msg = JSON.parse(event.data);
        if (!msg.id || !this.pending.has(msg.id)) return;
        const { resolve: done, reject: fail } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) fail(new Error(`${msg.error.message}: ${JSON.stringify(msg.error)}`));
        else done(msg.result || {});
      });
    });
  }

  send(method, params = {}, sessionId = undefined) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

function browserRenderFunction(renderConfig) {
  function seededRandom(seed) {
    let state = seed >>> 0;
    return function random() {
      state += 0x6D2B79F5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function writeString(view, offset, value) {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  }

  function encodeWav(buffer) {
    const channels = buffer.numberOfChannels;
    const frames = buffer.length;
    const bytesPerSample = 2;
    const blockAlign = channels * bytesPerSample;
    const dataBytes = frames * blockAlign;
    const output = new ArrayBuffer(44 + dataBytes);
    const view = new DataView(output);
    let offset = 0;
    let peak = 0;

    writeString(view, offset, 'RIFF'); offset += 4;
    view.setUint32(offset, 36 + dataBytes, true); offset += 4;
    writeString(view, offset, 'WAVE'); offset += 4;
    writeString(view, offset, 'fmt '); offset += 4;
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, 1, true); offset += 2;
    view.setUint16(offset, channels, true); offset += 2;
    view.setUint32(offset, buffer.sampleRate, true); offset += 4;
    view.setUint32(offset, buffer.sampleRate * blockAlign, true); offset += 4;
    view.setUint16(offset, blockAlign, true); offset += 2;
    view.setUint16(offset, bytesPerSample * 8, true); offset += 2;
    writeString(view, offset, 'data'); offset += 4;
    view.setUint32(offset, dataBytes, true); offset += 4;

    const data = [];
    for (let channel = 0; channel < channels; channel += 1) {
      data[channel] = buffer.getChannelData(channel);
    }

    for (let frame = 0; frame < frames; frame += 1) {
      for (let channel = 0; channel < channels; channel += 1) {
        const sample = Math.max(-1, Math.min(1, data[channel][frame]));
        peak = Math.max(peak, Math.abs(sample));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }

    let binary = '';
    const bytes = new Uint8Array(output);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }

    return { base64: btoa(binary), peak };
  }

  const random = seededRandom(renderConfig.seed);
  const musicBeat = renderConfig.musicBeat;
  const musicBar = renderConfig.musicBar;
  const roots = renderConfig.musicRoots;
  const melody = renderConfig.musicMelody;
  const duration = renderConfig.duration;
  const sampleRate = renderConfig.sampleRate;
  const ctx = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
  const master = ctx.createGain();
  const musicGain = ctx.createGain();
  master.gain.value = 1;
  musicGain.gain.value = renderConfig.musicTargetGain;
  musicGain.connect(master);
  master.connect(ctx.destination);

  function musicTone(freq, type, gain, at, dur) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const t0 = at;
    const t1 = t0 + dur;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.detune.setValueAtTime((random() * 8) - 4, t0);
    g.gain.setValueAtTime(0.001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.018);
    g.gain.setValueAtTime(gain * 0.82, Math.max(t0 + 0.024, t1 - 0.06));
    g.gain.exponentialRampToValueAtTime(0.001, t1);
    osc.connect(g).connect(musicGain);
    osc.start(t0);
    osc.stop(t1 + 0.04);
  }

  function musicTick(at, gain = 0.012) {
    const frames = Math.max(1, Math.floor(ctx.sampleRate * 0.035));
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (random() * 2 - 1) * Math.pow(1 - i / data.length, 2.4);
    }
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = buf;
    filter.type = 'highpass';
    filter.frequency.value = 4200;
    g.gain.value = gain;
    src.connect(filter).connect(g).connect(musicGain);
    src.start(at);
    src.stop(at + 0.05);
  }

  function scheduleMusicBar(step, start) {
    const root = roots[step % roots.length];
    const nextRoot = roots[(step + 1) % roots.length];
    [0, 2].forEach(beat => {
      musicTone(root * 0.5, 'sine', 0.044, start + beat * musicBeat, musicBeat * 0.88);
    });
    [0, 1.5, 2.5, 3.25].forEach((beat, i) => {
      const chordRoot = i === 3 ? nextRoot : root;
      musicTone(chordRoot, 'triangle', 0.034, start + beat * musicBeat, musicBeat * 0.42);
      musicTone(chordRoot * 1.25, 'sine', 0.022, start + beat * musicBeat + 0.015, musicBeat * 0.36);
      musicTone(chordRoot * 1.5, 'sine', 0.018, start + beat * musicBeat + 0.028, musicBeat * 0.34);
    });
    for (let i = 0; i < 4; i += 1) {
      const semitone = melody[(step * 4 + i) % melody.length];
      const freq = root * 2 * Math.pow(2, semitone / 12);
      musicTone(freq, 'triangle', i === 0 ? 0.052 : 0.04, start + (i + 0.08) * musicBeat, musicBeat * 0.34);
      musicTone(freq * 2, 'sine', i === 0 ? 0.014 : 0.01, start + (i + 0.1) * musicBeat, musicBeat * 0.24);
      if (i === 1 || i === 3) musicTick(start + (i + 0.46) * musicBeat, 0.018);
    }
    musicTick(start + 0.04, 0.026);
    musicTick(start + 2 * musicBeat + 0.04, 0.022);
  }

  for (let step = 0; step < renderConfig.loopBars; step += 1) {
    scheduleMusicBar(step, step * musicBar);
  }

  return ctx.startRendering().then(buffer => {
    const wav = encodeWav(buffer);
    return {
      wavBase64: wav.base64,
      peak: wav.peak,
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
      frames: buffer.length
    };
  });
}

async function renderWav(options) {
  const chromePath = findBrowser(options.chromePath);
  const browser = await launchBrowser(chromePath);
  const client = new CdpClient(browser.webSocketDebuggerUrl);

  try {
    await client.connect();
    const target = await client.send('Target.createTarget', { url: 'about:blank' });
    const attached = await client.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
    const sessionId = attached.sessionId;
    await client.send('Runtime.enable', {}, sessionId);

    const expression = `(${browserRenderFunction.toString()})(${JSON.stringify(CONFIG)})`;
    const result = await client.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    }, sessionId);

    if (result.exceptionDetails) {
      throw new Error(`Browser render failed: ${JSON.stringify(result.exceptionDetails)}`);
    }

    const rendered = result.result.value;
    fs.mkdirSync(options.outDir, { recursive: true });
    const wavPath = path.join(options.outDir, `${BASENAME}.wav`);
    fs.writeFileSync(wavPath, Buffer.from(rendered.wavBase64, 'base64'));

    return { wavPath, rendered, chromePath };
  } finally {
    client.close();
    browser.proc.kill();
    try {
      fs.rmSync(browser.userDataDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

function encodeFormats(wavPath, outDir) {
  const outputs = [];
  const formats = [
    { ext: 'mp3', args: ['-codec:a', 'libmp3lame', '-b:a', '192k'] },
    { ext: 'ogg', args: ['-codec:a', 'libvorbis', '-q:a', '5'] }
  ];

  for (const format of formats) {
    const outPath = path.join(outDir, `${BASENAME}.${format.ext}`);
    const result = spawnSync('ffmpeg', [
      '-hide_banner',
      '-loglevel', 'error',
      '-y',
      '-i', wavPath,
      ...format.args,
      outPath
    ], { encoding: 'utf8' });

    if (result.status !== 0) {
      throw new Error(`ffmpeg failed for ${format.ext}: ${result.stderr || result.stdout}`);
    }
    outputs.push(outPath);
  }

  return outputs;
}

function writeMetadata(outDir, rendered, files) {
  const metadataPath = path.join(outDir, `${BASENAME}.metadata.json`);
  const metadata = {
    name: 'Trash Dice Ambient Alpha',
    source: CONFIG.source,
    sourceCommit: CONFIG.sourceCommit,
    generatedAt: new Date().toISOString(),
    generator: 'tools/render-trash-dice-ambient.js',
    loop: true,
    loopBars: CONFIG.loopBars,
    bpm: 132,
    durationSeconds: Number(rendered.duration.toFixed(6)),
    sampleRate: rendered.sampleRate,
    channels: rendered.channels,
    peak: Number(rendered.peak.toFixed(6)),
    seed: CONFIG.seed,
    files: files.map(file => path.relative(REPO_ROOT, file).replace(/\\/g, '/'))
  };
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
  return metadataPath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { wavPath, rendered, chromePath } = await renderWav(options);
  const files = [wavPath];

  if (options.encode) {
    files.push(...encodeFormats(wavPath, options.outDir));
  }

  const metadataPath = writeMetadata(options.outDir, rendered, files);
  files.push(metadataPath);

  console.log(`Rendered Trash Dice Alpha ambient loop via ${chromePath}`);
  console.log(`Duration: ${rendered.duration.toFixed(3)}s, peak: ${rendered.peak.toFixed(3)}`);
  for (const file of files) {
    const sizeKb = fs.statSync(file).size / 1024;
    console.log(`${path.relative(REPO_ROOT, file)} (${sizeKb.toFixed(1)} KB)`);
  }
}

main().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
