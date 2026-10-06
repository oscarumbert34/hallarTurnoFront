import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const mode = process.argv[2] ?? 'production';
const fallback =
  mode === 'development'
    ? 'http://localhost:8080/api/v1'
    : 'https://hallarturno-production.up.railway.app/api/v1';
const apiBaseUrl = (process.env.API_BASE_URL || fallback).replace(/\/$/, '');
const output = resolve('public/env.js');

mkdirSync(dirname(output), { recursive: true });
writeFileSync(
  output,
  `globalThis.__HALLARTURNO_ENV__ = ${JSON.stringify({ API_BASE_URL: apiBaseUrl })};\n`,
  'utf8',
);
console.log(`Frontend API configured as ${apiBaseUrl}`);
