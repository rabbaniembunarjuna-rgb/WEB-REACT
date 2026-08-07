import crypto from "node:crypto";
import { publicError, requestReaction } from "./_upstream.js";

function text(value, maximum = 2000) {
  return String(value ?? "").trim().slice(0, maximum);
}

function validPostUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    return (
      url.protocol === "https:" &&
      host === "whatsapp.com" &&
      /^\/channel\/[A-Za-z0-9_-]+\/\d+\/?$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function memberId(req) {
  const forwarded = text(req.headers["x-forwarded-for"], 400)
    .split(",")[0]
    .trim();

  const ip =
    forwarded ||
    text(req.headers["x-real-ip"], 200) ||
    text(req.socket?.remoteAddress, 200) ||
    "unknown";

  const ua = text(req.headers["user-agent"], 500) || "browser";
  const digest = crypto
    .createHash("sha256")
    .update(`znn-reaction-web|${ip}|${ua}`)
    .digest("hex");

  return `web_${digest.slice(0, 56)}`;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      status: false,
      message: "Method tidak didukung."
    });
  }

  const url = text(req.body?.url, 4096);
  const reaction = text(req.body?.reaction, 2000);

  if (!validPostUrl(url)) {
    return res.status(422).json({
      status: false,
      message: "Gunakan link postingan Channel WhatsApp, contoh https://whatsapp.com/channel/ID/436."
    });
  }

  if (!reaction) {
    return res.status(422).json({
      status: false,
      message: "Emoji reaction wajib diisi."
    });
  }

  const parts = reaction
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!parts.length || parts.length > 20) {
    return res.status(422).json({
      status: false,
      message: "Jumlah reaction harus antara 1 sampai 20."
    });
  }

  if (new Set(parts).size !== parts.length) {
    return res.status(422).json({
      status: false,
      message: "Emoji yang sama tidak boleh diulang. Gunakan emoji berbeda, contoh ❤️,🫶🏻,👍🏻."
    });
  }

  try {
    const upstream = await requestReaction({
      url,
      reaction: parts.join(","),
      member_id: memberId(req)
    });

    const status = upstream.status || (upstream.ok ? 200 : 502);
    return res.status(status).json(upstream.body);
  } catch (error) {
    return res.status(error?.statusCode || 502).json(publicError(error));
  }
}
