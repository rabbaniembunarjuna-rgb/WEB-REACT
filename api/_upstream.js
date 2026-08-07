const DEFAULT_API_BASE = "https://api.znn.my.id/channel-reaction";

function cleanText(value, maximum = 500) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maximum);
}

function tokenValue() {
  const raw = cleanText(process.env.REACTION_TOKEN, 4096);

  if (!raw) {
    const error = new Error("REACTION_TOKEN belum diatur di Vercel Environment Variables.");
    error.statusCode = 500;
    throw error;
  }

  return /^Bearer\s+/i.test(raw) ? raw : `Bearer ${raw}`;
}

function apiBase() {
  const raw = cleanText(process.env.REACTION_API_BASE, 2048) || DEFAULT_API_BASE;

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") throw new Error();
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    const error = new Error("REACTION_API_BASE tidak valid.");
    error.statusCode = 500;
    throw error;
  }
}

function sanitize(value, depth = 0) {
  if (depth > 8 || value == null) return value;

  if (typeof value === "string") {
    return value.replace(/rxn_[a-f0-9]{64}/gi, "[REDACTED]");
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, depth + 1));
  }

  if (typeof value === "object") {
    const output = {};

    for (const [key, item] of Object.entries(value)) {
      if (/(token|secret|api[_-]?key|authorization)/i.test(key)) continue;
      output[key] = sanitize(item, depth + 1);
    }

    return output;
  }

  return value;
}

export async function requestReaction(params) {
  const url = new URL(apiBase());

  for (const [key, value] of Object.entries(params || {})) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: tokenValue(),
      "user-agent": "znn-channel-reaction-web/1.0"
    },
    redirect: "follow",
    signal: AbortSignal.timeout(28000)
  });

  const raw = await response.text();
  let body;

  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {
      status: false,
      message: raw.slice(0, 800) || "Respons API Reaction tidak dapat dibaca."
    };
  }

  return {
    ok: response.ok && body?.status !== false,
    status: response.status,
    body: sanitize(body)
  };
}

export function publicError(error) {
  return {
    status: false,
    message: cleanText(error?.message, 300) || "Layanan Channel Reaction sedang bermasalah."
  };
      }

