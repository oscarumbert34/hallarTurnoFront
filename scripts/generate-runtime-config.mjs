import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const mode = process.argv[2] ?? 'production';
const fallback =
  mode === 'development'
    ? 'http://localhost:8081/api/v1'
    : 'https://hallarturno-production.up.railway.app/api/v1';
const apiBaseUrl = (process.env.API_BASE_URL || fallback).replace(/\/$/, '');
const googleClientId =
  process.env.GOOGLE_CLIENT_ID ||
  '103683209352-roj3f9mio1mpshe8d0to27a44pmknkvl.apps.googleusercontent.com';
const output = resolve('public/env.js');

mkdirSync(dirname(output), { recursive: true });
writeFileSync(
  output,
  `globalThis.__HALLARTURNO_ENV__ = ${JSON.stringify({
    API_BASE_URL: apiBaseUrl,
    GOOGLE_CLIENT_ID: googleClientId,
  })};\n`,
  'utf8',
);
console.log(`Frontend API configured as ${apiBaseUrl}`);
