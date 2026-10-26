// API helper — pola gas-pro-api: fetch() + JSON murni ke GAS Web App.
// POST pakai Content-Type: text/plain;charset=utf-8 agar tidak memicu
// CORS preflight (GAS tidak bisa membalas preflight OPTIONS).
import { CONFIG } from "./config.js";

let sessionToken = localStorage.getItem("sim_session_token") || null;
const inFlight = new Map();

export class ApiError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

function flatten(obj) {
  const out = {};
  Object.keys(obj || {}).forEach((k) => {
    const v = obj[k];
    out[k] = typeof v === "object" ? JSON.stringify(v) : v;
  });
  return out;
}

const GET_ACTIONS = ["getKatalog", "getMitraList", "getPengaturan", "pingWarmup"];

export async function callApi(action, payload = {}) {
  const key = action + "::" + JSON.stringify(payload || {});
  if (inFlight.has(key)) return inFlight.get(key);

  const execute = async () => {
    try {
      let res;
      if (GET_ACTIONS.includes(action)) {
        const qs = new URLSearchParams({ action, ...flatten(payload) });
        res = await fetch(`${CONFIG.GAS_URL}?${qs.toString()}`, { method: "GET" });
      } else {
        res = await fetch(CONFIG.GAS_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action, token: sessionToken, data: payload })
        });
      }
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      if (json && json.ok === false) throw new ApiError(json.message || "Terjadi kesalahan", json.code);
      return json;
    } finally {
      inFlight.delete(key);
    }
  };

  const promise = execute();
  inFlight.set(key, promise);
  return promise;
}

export function setSessionToken(token) {
  sessionToken = token;
  if (token) localStorage.setItem("sim_session_token", token);
  else localStorage.removeItem("sim_session_token");
}
export function getSessionToken() {
  return sessionToken;
}

export function cacheGet(key) {
  try {
    const raw = localStorage.getItem("simcache_" + key);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw);
    return { value: v, fresh: Date.now() - t < CONFIG.CLIENT_CACHE_TTL };
  } catch (e) {
    return null;
  }
}
export function cacheSet(key, value) {
  try {
    localStorage.setItem("simcache_" + key, JSON.stringify({ t: Date.now(), v: value }));
  } catch (e) { /* storage unavailable — non-fatal */ }
}
