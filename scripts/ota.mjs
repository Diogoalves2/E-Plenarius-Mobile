#!/usr/bin/env node
/**
 * Atualizações OTA (Expo Updates, protocolo v1) servidas como arquivos estáticos pela VPS.
 *
 *   node scripts/ota.mjs lock    → grava ota-native-lock.json (rodado pelo build-apk.sh ao gerar APK)
 *   node scripts/ota.mjs build   → exporta o JS, monta e ASSINA o manifesto, gera ota-out/update.tar.gz
 *
 * A assinatura (RSA-SHA256) é feita aqui, fora da VPS: OTA_PRIVATE_KEY (conteúdo PEM) ou
 * OTA_PRIVATE_KEY_FILE. O app só aceita manifestos assinados pela chave do certs/certificate.pem.
 *
 * Trava nativa: se dependências nativas / app.json / certificado mudaram desde o último APK,
 * o build é recusado — essa mudança exige APK novo (e runtimeVersion novo).
 */
import { createHash, createPrivateKey, sign } from 'node:crypto';
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOCK = join(ROOT, 'ota-native-lock.json');
const BASE_URL = process.env.OTA_BASE_URL ?? 'https://eplenarius.2-25-152-184.sslip.io/updates';
const PLATFORM = 'android';
const BOUNDARY = 'eplenarius-ota-boundary';

const sha256 = (b) => createHash('sha256').update(b).digest();
const md5hex = (b) => createHash('md5').update(b).digest('hex');
const b64url = (b) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const die = (m) => { console.error(`\n✗ ${m}\n`); process.exit(1); };

/** Tudo que vai para dentro do APK e não pode mudar por OTA. */
function nativeFingerprint() {
  const pkg = readJson(join(ROOT, 'package.json'));
  const app = readJson(join(ROOT, 'app.json')).expo;
  const nativeDeps = Object.fromEntries(
    Object.entries(pkg.dependencies ?? {})
      .filter(([n]) => /^(expo|react-native|@react-native|@expo\/|react$)/.test(n))
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  const { version, ...appNative } = app; // versão de exibição não é nativa
  if (appNative.android) { const { versionCode, ...a } = appNative.android; appNative.android = a; }
  const cert = readFileSync(join(ROOT, 'certs', 'certificate.pem'), 'utf8').replace(/\r\n/g, '\n').trim();
  return { runtimeVersion: app.runtimeVersion, nativeHash: sha256(canonical({ nativeDeps, appNative, cert })).toString('hex') };
}

/** JSON com chaves ordenadas em todos os níveis (hash estável entre máquinas). */
function canonical(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
}

function lock() {
  const fp = nativeFingerprint();
  if (!fp.runtimeVersion || typeof fp.runtimeVersion !== 'string') die('app.json sem expo.runtimeVersion (string)');
  writeFileSync(LOCK, JSON.stringify({ ...fp, lockedAt: new Date().toISOString() }, null, 2) + '\n');
  console.log(`✔ lock nativo gravado: runtime ${fp.runtimeVersion} (${fp.nativeHash.slice(0, 12)})`);
}

const MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  ttf: 'font/ttf', otf: 'font/otf', wav: 'audio/wav', mp3: 'audio/mpeg', m4a: 'audio/mp4', json: 'application/json',
};

function build() {
  if (!existsSync(LOCK)) die('ota-native-lock.json não existe: gere o APK com scripts/build-apk.sh primeiro.');
  const locked = readJson(LOCK);
  const fp = nativeFingerprint();
  if (fp.runtimeVersion !== locked.runtimeVersion || fp.nativeHash !== locked.nativeHash) {
    die(`Mudança NATIVA desde o último APK (runtime ${locked.runtimeVersion}).\n`
      + '  Atualização OTA bloqueada para não quebrar os tablets.\n'
      + '  → Suba "runtimeVersion" no app.json, gere APK novo (scripts/build-apk.sh) e instale nos tablets.');
  }

  const pem = process.env.OTA_PRIVATE_KEY
    ?? (process.env.OTA_PRIVATE_KEY_FILE ? readFileSync(process.env.OTA_PRIVATE_KEY_FILE, 'utf8') : null);
  if (!pem) die('Defina OTA_PRIVATE_KEY ou OTA_PRIVATE_KEY_FILE (chave privada de assinatura).');
  const key = createPrivateKey(pem);

  const dist = join(ROOT, 'dist-ota');
  rmSync(dist, { recursive: true, force: true });
  console.log('▶ expo export (android)…');
  execSync(`npx expo export --platform ${PLATFORM} --output-dir dist-ota`, { cwd: ROOT, stdio: 'inherit' });

  const metaRaw = readFileSync(join(dist, 'metadata.json'));
  const meta = JSON.parse(metaRaw).fileMetadata[PLATFORM];
  const rt = fp.runtimeVersion;
  const idHex = sha256(Buffer.concat([metaRaw, Buffer.from(rt)])).toString('hex');
  const id = `${idHex.slice(0, 8)}-${idHex.slice(8, 12)}-${idHex.slice(12, 16)}-${idHex.slice(16, 20)}-${idHex.slice(20, 32)}`;
  const urlFor = (rel) => `${BASE_URL}/${encodeURIComponent(rt)}/${PLATFORM}/${id}/${rel.split('/').map(encodeURIComponent).join('/')}`;

  const asset = (rel, ext, contentType) => {
    const buf = readFileSync(join(dist, rel));
    return { hash: b64url(sha256(buf)), key: md5hex(buf), fileExtension: `.${ext}`, contentType, url: urlFor(rel) };
  };

  const expoClient = JSON.parse(execSync('npx expo config --type public --json', { cwd: ROOT, encoding: 'utf8' }));
  const manifest = {
    id,
    createdAt: new Date().toISOString(),
    runtimeVersion: rt,
    launchAsset: { ...asset(meta.bundle, 'bundle', 'application/javascript') },
    assets: meta.assets.map((a) => asset(a.path, a.ext, MIME[a.ext] ?? 'application/octet-stream')),
    metadata: {},
    extra: { expoClient },
  };
  const manifestStr = JSON.stringify(manifest);
  const sig = sign('RSA-SHA256', Buffer.from(manifestStr, 'utf8'), key).toString('base64');

  const extensions = JSON.stringify({ assetRequestHeaders: {} });
  const multipart = [
    `--${BOUNDARY}`,
    'Content-Disposition: form-data; name="manifest"',
    'Content-Type: application/json; charset=utf-8',
    `expo-signature: sig="${sig}", keyid="main"`,
    '',
    manifestStr,
    `--${BOUNDARY}`,
    'Content-Disposition: form-data; name="extensions"',
    'Content-Type: application/json',
    '',
    extensions,
    `--${BOUNDARY}--`,
    '',
  ].join('\r\n');

  const out = join(ROOT, 'ota-out');
  const pkgDir = join(out, id);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(pkgDir, { recursive: true });
  cpSync(join(dist, '_expo'), join(pkgDir, '_expo'), { recursive: true });
  if (existsSync(join(dist, 'assets'))) cpSync(join(dist, 'assets'), join(pkgDir, 'assets'), { recursive: true });
  writeFileSync(join(pkgDir, 'manifest.multipart'), multipart);
  writeFileSync(join(pkgDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  execSync(`tar czf update.tar.gz -C "${pkgDir}" .`, { cwd: out, stdio: 'inherit' });
  writeFileSync(join(out, 'release.env'), `OTA_RUNTIME=${rt}\nOTA_UPDATE_ID=${id}\n`);
  console.log(`✔ atualização ${id} (runtime ${rt}, ${manifest.assets.length} assets) → ota-out/update.tar.gz`);
}

const mode = process.argv[2];
if (mode === 'lock') lock();
else if (mode === 'build') build();
else die('uso: node scripts/ota.mjs lock|build');
