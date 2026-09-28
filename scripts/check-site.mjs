import { readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, extname, join, normalize, relative } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const origin = 'https://nationelleintelligence.com';
const articlePath = '/technology/reachable-is-not-recoverable-time-machine-backup-review/';
const requiredFiles = [
  'index.html',
  'technology/reachable-is-not-recoverable-time-machine-backup-review/index.html',
  'assets/site.css',
  'assets/reachable-is-not-recoverable-backup-review-1600x900.jpg',
  'favicon.svg',
  'site.webmanifest',
  'robots.txt',
  'sitemap.xml',
  '404.html',
  'vercel.json',
  '.vercelignore',
  'IMAGE_PROVENANCE.md',
];

const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const text = (file) => readFileSync(join(root, file), 'utf8');

for (const file of requiredFiles) check(existsSync(join(root, file)), `Missing required file: ${file}`);

const htmlFiles = [
  'index.html',
  'technology/reachable-is-not-recoverable-time-machine-backup-review/index.html',
  '404.html',
];

function routeToFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  if (clean === '/') return 'index.html';
  const relativePath = clean.replace(/^\//, '');
  if (clean.endsWith('/')) return join(relativePath, 'index.html');
  if (extname(relativePath)) return relativePath;
  const direct = normalize(relativePath);
  if (existsSync(join(root, direct))) return direct;
  return join(relativePath, 'index.html');
}

for (const file of htmlFiles) {
  const source = text(file);
  check(/^<!doctype html>/i.test(source), `${file}: missing HTML doctype`);
  check(/<html\s+lang="en"/i.test(source), `${file}: missing English language declaration`);
  check(/<meta\s+name="viewport"/i.test(source), `${file}: missing viewport metadata`);
  check(/<title>[^<]{8,}<\/title>/i.test(source), `${file}: missing meaningful title`);
  check((source.match(/<h1(?:\s|>)/gi) ?? []).length === 1, `${file}: expected exactly one h1`);

  for (const match of source.matchAll(/(?:href|src)="([^"]+)"/gi)) {
    const value = match[1];
    if (/^(?:https?:|mailto:|tel:|#|data:)/i.test(value)) continue;
    const resolved = value.startsWith('/')
      ? routeToFile(value)
      : normalize(join(dirname(file), value));
    check(existsSync(join(root, resolved)), `${file}: unresolved internal reference ${value} -> ${resolved}`);
  }
}

for (const file of htmlFiles.slice(0, 2)) {
  const source = text(file);
  for (const needle of [
    'name="description"',
    'rel="canonical"',
    'property="og:title"',
    'property="og:description"',
    'property="og:url"',
    'property="og:image"',
    'name="twitter:card"',
  ]) check(source.includes(needle), `${file}: missing ${needle}`);

  const jsonLdBlocks = [...source.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  check(jsonLdBlocks.length === 1, `${file}: expected one JSON-LD block`);
  for (const block of jsonLdBlocks) {
    try { JSON.parse(block[1]); } catch (error) { errors.push(`${file}: invalid JSON-LD (${error.message})`); }
  }
}

const home = text('index.html');
const article = text('technology/reachable-is-not-recoverable-time-machine-backup-review/index.html');
check(home.includes(`href="${articlePath}"`), 'Homepage does not link to the article route');
check(article.includes(`rel="canonical" href="${origin}${articlePath}"`), 'Article canonical URL is incorrect');
check(article.includes(`property="og:url" content="${origin}${articlePath}"`), 'Article Open Graph URL is incorrect');
check(article.includes(`"mainEntityOfPage": "${origin}${articlePath}"`), 'Article schema URL is incorrect');
check(article.includes('article:published_time'), 'Article is missing published-time metadata');
check(article.includes('AI-assisted original illustration: Nationelle Intelligence'), 'Article is missing accurate image credit');

const robots = text('robots.txt');
const sitemap = text('sitemap.xml');
const vercelIgnore = text('.vercelignore');
check(robots.includes(`Sitemap: ${origin}/sitemap.xml`), 'robots.txt points to the wrong sitemap origin');
check(sitemap.includes(`<loc>${origin}/</loc>`), 'sitemap.xml is missing the homepage');
check(sitemap.includes(`<loc>${origin}${articlePath}</loc>`), 'sitemap.xml is missing the article');
check((sitemap.match(/<url>/g) ?? []).length === 2, 'sitemap.xml should contain exactly two real routes');
for (const excluded of ['.playwright-cli/', 'README.md', 'IMAGE_PROVENANCE.md', 'scripts/']) {
  check(vercelIgnore.split(/\r?\n/).includes(excluded), `.vercelignore must exclude ${excluded}`);
}

const allPublicText = requiredFiles
  .filter((file) => ['.html', '.css', '.svg', '.json', '.txt', '.xml'].includes(extname(file)))
  .map((file) => `${file}\n${text(file)}`)
  .join('\n');

for (const pattern of [
  /lorem ipsum/i,
  /\bTODO\b/,
  /\bTBD\b/,
  /example\.com/i,
  /\/Users\//,
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
  /\b\d+(?:\.\d+)?\s*(?:GiB|TiB)\b/i,
]) check(!pattern.test(allPublicText), `Public output contains banned or private pattern: ${pattern}`);

const imageFile = join(root, 'assets/reachable-is-not-recoverable-backup-review-1600x900.jpg');
if (existsSync(imageFile)) {
  const image = readFileSync(imageFile);
  check(statSync(imageFile).size <= 300_000, 'Hero image exceeds 300 KB');

  let width;
  let height;
  let offset = 2;
  while (offset < image.length) {
    if (image[offset] !== 0xff) { offset += 1; continue; }
    const marker = image[offset + 1];
    const segmentLength = image.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      height = image.readUInt16BE(offset + 5);
      width = image.readUInt16BE(offset + 7);
      break;
    }
    if (!segmentLength || marker === 0xda) break;
    offset += 2 + segmentLength;
  }
  check(width === 1600 && height === 900, `Hero image must be 1600x900; found ${width ?? '?'}x${height ?? '?'}`);
}

try { JSON.parse(text('site.webmanifest')); } catch (error) { errors.push(`Invalid site.webmanifest: ${error.message}`); }
try { JSON.parse(text('vercel.json')); } catch (error) { errors.push(`Invalid vercel.json: ${error.message}`); }

if (errors.length) {
  console.error(`Site validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Site validation passed.');
console.log(`Checked ${requiredFiles.length} required files, ${htmlFiles.length} HTML documents, metadata, structured data, links, crawl files, privacy patterns, and the 1600x900 hero asset.`);
