import { readFileSync } from 'fs';
import { createSign } from 'crypto';

// Parse .env
const env = {};
for (const line of readFileSync('.env', 'utf-8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[key] = val;
}

const PROJECT_ID = env.FIREBASE_ADMIN_PROJECT_ID;
const CLIENT_EMAIL = env.FIREBASE_CLIENT_EMAIL;
const PRIVATE_KEY = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

function base64url(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(PRIVATE_KEY, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const jwt = `${header}.${payload}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const data = await res.json();
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

const indexes = JSON.parse(readFileSync('firestore.indexes.json', 'utf-8'));

async function deployIndexes() {
  const token = await getAccessToken();
  console.log('✓ Authenticated\n');

  for (const index of indexes.indexes) {
    const { collectionGroup, queryScope, fields } = index;
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/collectionGroups/${collectionGroup}/indexes`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryScope, fields }),
    });

    const data = await res.json();

    if (res.status === 409) {
      console.log(`  ✓ ${collectionGroup} [${fields.map(f => f.fieldPath).join(', ')}] — already exists`);
    } else if (res.ok) {
      console.log(`  ⏳ ${collectionGroup} [${fields.map(f => f.fieldPath).join(', ')}] — building...`);
    } else {
      console.log(`  ✗ ${collectionGroup} — ${data.error?.message ?? JSON.stringify(data)}`);
    }
  }

  console.log('\nIndexes are building. Takes ~1-2 minutes to become active.');
}

deployIndexes().catch((err) => { console.error(err); process.exit(1); });
