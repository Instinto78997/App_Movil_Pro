import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';

export const API_BASE_URL = 'https://clinicadental.aplicacionesweb2026.com';

const LIVENESS_SESSION_URL =
  'https://nd7y2nxc6jjr3qk7xvokvt72fa0srqlx.lambda-url.us-east-1.on.aws/';
const LIVENESS_RESULT_URL =
  'https://j7ox5a3vryaornjffihgqf3wha0psckv.lambda-url.us-east-1.on.aws/';

export type ApiUser = {
  id: number;
  nombre: string;
  apellidos: string;
  correo: string;
  rol: string;
  telefono?: string;
  direccion?: string;
  documento_personal?: string;
  edad?: number;
  foto_bytea?: unknown;
};

export type RegisterPayload = {
  nombre: string;
  apellidos: string;
  documento_personal: string;
  correo: string;
  fecha_nacimiento: string;
  edad: number;
  telefono: string;
  direccion: string;
  password: string;
  rol: string;
};

export type LivenessResult = {
  livenessConfidence?: number;
  livenessStatus?: string;
  isMatch?: boolean;
  similarity?: number;
  user?: ApiUser;
  message?: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = await readResponsePayload(response);
  if (!response.ok) {
    throw new Error(responseMessage(payload, `Error HTTP ${response.status}`));
  }
  return payload as T;
}

async function readResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }
  return payload;
}

function responseMessage(payload: unknown, fallback: string): string {
  const body = asObject(payload);
  const message = body.message ?? body.error ?? body.detail;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

function asObject(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, any>;
}

function unwrap(value: unknown): Record<string, any> {
  let current = asObject(value);
  for (let index = 0; index < 4; index += 1) {
    const next = current.user
      ?? current.usuario
      ?? current.perfil
      ?? current.data
      ?? current.body
      ?? current.result
      ?? current.createdUser;
    if (!next || typeof next !== 'object') break;
    current = asObject(next);
  }
  return current;
}

/**
 * The regular API unwrapping helper follows a `user` field because most of
 * the REST endpoints use it as their response envelope. Face Liveness is
 * different: `user` is the matched account while `isMatch`, `similarity` and
 * `message` remain alongside it. Following `user` here discarded the match
 * result and made a successful facial login look like a failed one.
 */
function unwrapLivenessResult(value: unknown): Record<string, any> {
  let current = asObject(value);
  for (let index = 0; index < 4; index += 1) {
    const next = current.data ?? current.body ?? current.result;
    if (typeof next === 'string') {
      try {
        current = asObject(JSON.parse(next));
        continue;
      } catch {
        break;
      }
    }
    if (!next || typeof next !== 'object' || Array.isArray(next)) break;
    current = asObject(next);
  }
  return current;
}

function findNested(value: unknown, key: string, depth = 0): unknown {
  if (depth > 5 || !value || typeof value !== 'object') return undefined;
  const object = value as Record<string, unknown>;
  if (object[key] !== undefined && object[key] !== null) return object[key];
  for (const child of Object.values(object)) {
    const match = findNested(child, key, depth + 1);
    if (match !== undefined) return match;
  }
  return undefined;
}

export function normalizeUser(value: unknown): ApiUser {
  const user = unwrap(value);
  return {
    id: Number(user.id ?? user.id_usuario ?? user.usuario_id ?? 0),
    nombre: String(user.nombre ?? user.nombres ?? user.name ?? ''),
    apellidos: String(user.apellidos ?? user.apellido ?? user.last_name ?? ''),
    correo: String(user.correo ?? user.email ?? ''),
    rol: String(user.rol ?? user.role ?? user.tipo_usuario ?? ''),
    telefono: String(user.telefono ?? user.tel ?? user.phone ?? ''),
    direccion: String(user.direccion ?? user.address ?? ''),
    documento_personal: String(user.documento_personal ?? user.documento ?? user.dpi ?? ''),
    edad: Number(user.edad ?? user.age ?? 0) || undefined,
    foto_bytea: user.foto_bytea ?? user.foto ?? user.photo,
  };
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const payload = await readJson<Record<string, any>>(response);
  const data = unwrap(payload);
  const userSource = findNested(payload, 'user') ?? data;
  const user = normalizeUser(userSource);
  const token = findNested(payload, 'token') ?? '';
  if (!user.id) throw new Error('La respuesta de login no incluyó el ID del usuario.');
  return { user, token: String(token) };
}

export async function registerUser(payload: RegisterPayload) {
  const response = await fetch(`${API_BASE_URL}/api/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await readJson<Record<string, any>>(response);
  return { result, user: normalizeUser(result) };
}

export async function getProfile(id: number): Promise<ApiUser> {
  const response = await fetch(`${API_BASE_URL}/api/users/profile/${id}`, {
    headers: { Accept: 'application/json' },
  });
  return normalizeUser(await readJson(response));
}

export async function updateProfile(id: number, changes: Partial<ApiUser>) {
  const body = { id, ...changes };
  let response = await fetch(`${API_BASE_URL}/api/users/profile/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (response.status === 404 || response.status === 405) {
    response = await fetch(`${API_BASE_URL}/api/users/profile/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  }
  return readJson(response);
}

type PhotoUploadTarget = {
  path: string;
  fieldName: 'foto' | 'photo';
  includeId?: boolean;
};

function createPhotoForm(id: number, uri: string, fieldName: PhotoUploadTarget['fieldName'], includeId = false) {
  const form = new FormData();
  // Expo SDK 58 requires a File instance for a binary FormData part. The URI
  // comes straight from expo-image-picker and multer receives its Buffer.
  form.append(fieldName, new File(uri));
  if (includeId) form.append('id', String(id));
  return form;
}

function shouldTryAnotherPhotoTarget(response: Response, payload: unknown): boolean {
  if ([400, 404, 405, 415, 422].includes(response.status)) return true;
  const message = responseMessage(payload, '').toLowerCase();
  return response.status >= 500 && /(multer|unexpected field|foto|photo|archivo|file)/.test(message);
}

export async function uploadProfilePhoto(id: number, uri: string) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('No se recibiÃ³ un ID de usuario vÃ¡lido para guardar la foto.');
  }
  if (!uri) throw new Error('La cÃ¡mara no devolviÃ³ una imagen vÃ¡lida.');

  const uploadTargets: PhotoUploadTarget[] = [
    { path: `/api/users/photo/${id}`, fieldName: 'foto' },
    { path: `/api/users/photo/${id}`, fieldName: 'photo' },
    { path: `/api/users/${id}/photo`, fieldName: 'foto' },
    { path: `/api/users/${id}/photo`, fieldName: 'photo' },
    { path: `/api/users/upload-photo?id=${id}`, fieldName: 'foto', includeId: true },
    { path: `/api/users/upload-photo?id=${id}`, fieldName: 'photo', includeId: true },
  ];

  const failures: string[] = [];
  for (const target of uploadTargets) {
    let response: Response;
    try {
      response = await expoFetch(`${API_BASE_URL}${target.path}`, {
        method: 'POST',
        body: createPhotoForm(id, uri, target.fieldName, target.includeId),
      });
    } catch (cause) {
      throw new Error(`No se pudo conectar al backend al subir la foto: ${cause instanceof Error ? cause.message : 'error de red'}`);
    }

    const payload = await readResponsePayload(response);
    const rejectedByBody = asObject(payload).success === false;
    if (response.ok && !rejectedByBody) return payload as Record<string, any>;

    const message = responseMessage(payload, `Error HTTP ${response.status}`);
    failures.push(`${target.path} (${target.fieldName}): ${message}`);
    if (!shouldTryAnotherPhotoTarget(response, payload)) throw new Error(message);
  }

  throw new Error(`El backend no aceptÃ³ la foto. ${failures.join(' | ')}`);
}

export async function createLivenessSession(): Promise<string> {
  const response = await fetch(LIVENESS_SESSION_URL, { headers: { Accept: 'application/json' } });
  const text = await response.text();
  if (!response.ok) throw new Error(`No se pudo iniciar la sesión facial (HTTP ${response.status}).`);

  let value: unknown = text.trim();
  try {
    value = JSON.parse(text);
  } catch {
    // Algunas versiones de la Lambda devuelven el sessionId como texto plano.
  }
  if (typeof value === 'string') return value.trim().replace(/^"|"$/g, '');
  const body = unwrap(value);
  const sessionId = body.sessionId ?? body.SessionId;
  if (!sessionId) throw new Error('La Lambda no devolvió un sessionId.');
  return String(sessionId);
}

export async function getLivenessResult(input: {
  sessionId: string;
  identifyAll: boolean;
  profileImageBase64?: string;
}): Promise<LivenessResult> {
  const response = await fetch(LIVENESS_RESULT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await readJson<Record<string, any>>(response);
  const result = unwrapLivenessResult(payload);
  return {
    livenessConfidence: Number(result.livenessConfidence ?? result.confidence ?? 0) || undefined,
    livenessStatus: result.livenessStatus ?? result.status,
    isMatch: result.isMatch ?? result.match ?? result.success,
    similarity: Number(result.similarity ?? 0) || undefined,
    user: result.user ? normalizeUser(result.user) : undefined,
    message: result.message ?? result.error,
  };
}

export function profileImageToBase64(photo: unknown): string | undefined {
  if (typeof photo === 'string') {
    if (photo.startsWith('data:image')) return photo.substring(photo.indexOf(',') + 1);
    if (photo.startsWith('\\x')) {
      const hex = photo.slice(2);
      const bytes = Array.from({ length: Math.floor(hex.length / 2) }, (_, index) => parseInt(hex.slice(index * 2, index * 2 + 2), 16));
      return bytesToBase64(bytes);
    }
    return photo;
  }
  if (Array.isArray(photo)) return bytesToBase64(photo.map(Number));
  const object = asObject(photo);
  if (Array.isArray(object.data)) return profileImageToBase64(object.data);
  return undefined;
}

function bytesToBase64(bytes: number[]): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] & 255;
    const hasB = index + 1 < bytes.length;
    const hasC = index + 2 < bytes.length;
    const b = hasB ? bytes[index + 1] & 255 : 0;
    const c = hasC ? bytes[index + 2] & 255 : 0;
    output += alphabet[a >> 2];
    output += alphabet[((a & 3) << 4) | (b >> 4)];
    output += hasB ? alphabet[((b & 15) << 2) | (c >> 6)] : '=';
    output += hasC ? alphabet[c & 63] : '=';
  }
  return output;
}
