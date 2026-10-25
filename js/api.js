/* ==========================================================================
   SIM SHAHIB IbadTour — API Helper (gas-pro-api pattern)
   Semua komunikasi ke backend GAS via fetch() + JSON.
   PENTING: POST menggunakan Content-Type: text/plain;charset=utf-8
   agar tidak memicu CORS preflight (GAS doPost tidak bisa membalas
   preflight OPTIONS dengan header CORS).
   ========================================================================== */
(function (global) {
  const CFG = global.SIM_CONFIG;
  let sessionToken = localStorage.getItem("sim_session_token") || null;

  // --- request de-duplication: cegah fetch dobel utk payload identik yg masih berjalan
  const inFlight = new Map();

  function buildKey(action, payload) {
    return action + "::" + JSON.stringify(payload || {});
  }

  async function callApi(action, payload = {}, { useCache = false } = {}) {
    const key = buildKey(action, payload);

    if (inFlight.has(key)) return inFlight.get(key);

    const isGet = ["getKatalog", "getMitraList", "getPengaturan", "pingWarmup"].includes(action);

    const execute = async () => {
      try {
        let res;
        if (isGet) {
          const qs = new URLSearchParams({ action, ...flatten(payload) });
          res = await fetch(`${CFG.GAS_URL}?${qs.toString()}`, { method: "GET" });
        } else {
          const body = JSON.stringify({
            action,
            token: sessionToken,
            data: payload
          });
          res = await fetch(CFG.GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body
          });
        }
        if (!res.ok) throw new Error("HTTP " + res.status);
        const json = await res.json();
        if (json && json.ok === false) {
          throw new ApiError(json.message || "Terjadi kesalahan", json.code);
        }
        return json;
      } finally {
        inFlight.delete(key);
      }
    };

    const promise = execute();
    inFlight.set(key, promise);
    return promise;
  }

  function flatten(obj) {
    const out = {};
    Object.keys(obj || {}).forEach((k) => {
      const v = obj[k];
      out[k] = typeof v === "object" ? JSON.stringify(v) : v;
    });
    return out;
  }

  class ApiError extends Error {
    constructor(message, code) {
      super(message);
      this.code = code;
    }
  }

  function setSessionToken(token) {
    sessionToken = token;
    if (token) localStorage.setItem("sim_session_token", token);
    else localStorage.removeItem("sim_session_token");
  }

  function getSessionToken() {
    return sessionToken;
  }

  // ---- Simple stale-while-revalidate localStorage cache (client-side) ----
  function cacheGet(key) {
    try {
      const raw = localStorage.getItem("simcache_" + key);
      if (!raw) return null;
      const { t, v } = JSON.parse(raw);
      return { value: v, fresh: Date.now() - t < CFG.CLIENT_CACHE_TTL };
    } catch (e) {
      return null;
    }
  }
  function cacheSet(key, value) {
    try {
      localStorage.setItem("simcache_" + key, JSON.stringify({ t: Date.now(), v: value }));
    } catch (e) {
      /* storage full/unavailable — ignore, not critical */
    }
  }

  global.SIM_API = { callApi, ApiError, setSessionToken, getSessionToken, cacheGet, cacheSet };
})(window);
