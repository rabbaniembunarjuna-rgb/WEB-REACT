import { publicError, requestReaction } from "./_upstream.js";

function text(value, maximum = 200) {
  return String(value ?? "").trim().slice(0, maximum);
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

  const jobId = text(req.body?.job_id, 64).toLowerCase();

  if (!/^[a-f0-9]{32}$/.test(jobId)) {
    return res.status(422).json({
      status: false,
      message: "ID proses reaction tidak valid."
    });
  }

  try {
    const upstream = await requestReaction({
      action: "status",
      job_id: jobId
    });

    const status = upstream.status || (upstream.ok ? 200 : 502);
    return res.status(status).json(upstream.body);
  } catch (error) {
    return res.status(error?.statusCode || 502).json(publicError(error));
  }
}
