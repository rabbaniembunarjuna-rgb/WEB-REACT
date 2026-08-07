const form = document.querySelector("#reaction-form");
const urlInput = document.querySelector("#post-url");
const reactionInput = document.querySelector("#reaction");
const emojiPreview = document.querySelector("#emoji-preview");
const emojiChips = document.querySelector("#emoji-chips");
const submitButton = document.querySelector("#submit-button");
const buttonText = document.querySelector("#button-text");
const notice = document.querySelector("#notice");
const statusTitle = document.querySelector("#status-title");
const statusText = document.querySelector("#status-text");

const limitPill = document.querySelector("#limit-pill");
const limitMain = document.querySelector("#limit-main");
const limitSub = document.querySelector("#limit-sub");

const successModal = document.querySelector("#success-modal");
const successEmoji = document.querySelector("#success-emoji");
const successReactionText = document.querySelector("#success-reaction-text");
const successCopy = document.querySelector("#success-copy");
const successDone = document.querySelector("#success-done");
const successLimit = document.querySelector("#success-limit");
const successUsed = document.querySelector("#success-used");
const successRemaining = document.querySelector("#success-remaining");
const limitProgressBar = document.querySelector("#limit-progress-bar");

const channelModal = document.querySelector("#channel-modal");
const channelCopy = document.querySelector("#channel-copy");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setBusy(state, text) {
  submitButton.disabled = state;
  submitButton.classList.toggle("loading", state);
  submitButton.setAttribute("aria-busy", state ? "true" : "false");
  buttonText.textContent = text || (state ? "Sedang memproses..." : "Kirim Reaction");
}

function setNotice(type, message) {
  notice.className = `notice ${type}`;
  notice.textContent = message;
}

function clearNotice() {
  notice.className = "notice hidden";
  notice.textContent = "";
}

function reactionList() {
  return reactionInput.value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function currentEmoji() {
  return reactionList()[0] || "❤️";
}

function hasDuplicateEmoji(list = reactionList()) {
  return new Set(list).size !== list.length;
}

function renderEmojiChips() {
  const list = reactionList();
  emojiChips.innerHTML = "";

  if (!list.length) {
    emojiChips.classList.add("hidden");
    return;
  }

  emojiChips.classList.remove("hidden");

  list.forEach((emoji, index) => {
    const chip = document.createElement("span");
    chip.className = "emoji-chip";

    const value = document.createElement("span");
    value.textContent = emoji;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.setAttribute("aria-label", `Hapus ${emoji}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      const next = reactionList().filter((_, i) => i !== index);
      reactionInput.value = next.join(",");
      syncEmoji();
      reactionInput.focus();
    });

    chip.append(value, remove);
    emojiChips.append(chip);
  });
}

function syncEmoji() {
  const list = reactionList();
  emojiPreview.textContent = currentEmoji();

  document.querySelectorAll("[data-emoji]").forEach((button) => {
    button.classList.toggle("active", list.includes(button.dataset.emoji));
  });

  renderEmojiChips();
}

function validChannelPost(value) {
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

async function postJson(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify(body)
  });

  let data;

  try {
    data = await response.json();
  } catch {
    data = {
      status: false,
      message: "Respons server tidak dapat dibaca."
    };
  }

  if (!response.ok || data.status === false) {
    const error = new Error(data.message || "Request gagal diproses.");
    error.data = data;
    throw error;
  }

  return data;
}

function jobState(data) {
  return String(
    data?.data?.job_state ||
    data?.data?.status ||
    data?.job_state ||
    data?.state ||
    ""
  )
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function extractUsage(root) {
  const seen = new Set();
  let result = null;

  function normalize(object) {
    if (!object || typeof object !== "object") return null;

    const limit =
      finiteNumber(object.daily_limit) ??
      finiteNumber(object.dailyLimit) ??
      finiteNumber(object.limit_per_day) ??
      finiteNumber(object.limit);

    const remaining =
      finiteNumber(object.remaining_today) ??
      finiteNumber(object.remainingToday) ??
      finiteNumber(object.remaining);

    const used =
      finiteNumber(object.used_today) ??
      finiteNumber(object.usedToday) ??
      finiteNumber(object.used);

    if (limit === null && remaining === null && used === null) {
      return null;
    }

    let resolvedLimit = limit;
    let resolvedRemaining = remaining;
    let resolvedUsed = used;

    if (resolvedLimit !== null && resolvedUsed === null && resolvedRemaining !== null) {
      resolvedUsed = Math.max(0, resolvedLimit - resolvedRemaining);
    }

    if (resolvedLimit !== null && resolvedRemaining === null && resolvedUsed !== null) {
      resolvedRemaining = Math.max(0, resolvedLimit - resolvedUsed);
    }

    return {
      limit: resolvedLimit,
      remaining: resolvedRemaining,
      used: resolvedUsed,
      mode: String(object.mode || object.limit_mode || "").toLowerCase()
    };
  }

  function walk(value, depth = 0) {
    if (result || depth > 7 || !value || typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);

    if (value.usage && typeof value.usage === "object") {
      const usage = normalize(value.usage);
      if (usage) {
        result = usage;
        return;
      }
    }

    const direct = normalize(value);
    if (
      direct &&
      (
        "daily_limit" in value ||
        "dailyLimit" in value ||
        "remaining_today" in value ||
        "remainingToday" in value ||
        "used_today" in value ||
        "usedToday" in value
      )
    ) {
      result = direct;
      return;
    }

    for (const child of Object.values(value)) {
      walk(child, depth + 1);
      if (result) return;
    }
  }

  walk(root);
  return result;
}

function usageStorageKey() {
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `znn_reaction_usage_${day}`;
}

function saveUsage(usage) {
  if (!usage || usage.limit === null) return;

  try {
    localStorage.setItem(usageStorageKey(), JSON.stringify(usage));
  } catch (_) {}
}

function loadUsage() {
  try {
    const raw = localStorage.getItem(usageStorageKey());
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function renderUsage(usage) {
  if (!usage) return;

  if (usage.mode === "unlimited") {
    limitPill.classList.add("active");
    limitMain.textContent = "Unlimited";
    limitSub.textContent = "Tidak ada batas harian";
    return;
  }

  if (usage.limit === null) return;

  limitPill.classList.add("active");
  limitMain.textContent = `${usage.limit} reaction / hari`;

  if (usage.remaining !== null) {
    limitSub.textContent = `Sisa ${usage.remaining} hari ini`;
  } else if (usage.used !== null) {
    limitSub.textContent = `Terpakai ${usage.used} hari ini`;
  } else {
    limitSub.textContent = "Mengikuti pengaturan Admin";
  }

  saveUsage(usage);
}

function renderSuccessUsage(usage) {
  if (!usage || usage.mode === "unlimited" || usage.limit === null) {
    successLimit.classList.add("hidden");
    return;
  }

  const used =
    usage.used !== null
      ? usage.used
      : usage.remaining !== null
        ? Math.max(0, usage.limit - usage.remaining)
        : null;

  const remaining =
    usage.remaining !== null
      ? usage.remaining
      : used !== null
        ? Math.max(0, usage.limit - used)
        : null;

  if (used === null && remaining === null) {
    successLimit.classList.add("hidden");
    return;
  }

  successUsed.textContent = `${used ?? "–"} / ${usage.limit}`;
  successRemaining.textContent = remaining ?? "–";

  const percent =
    used !== null && usage.limit > 0
      ? Math.max(0, Math.min(100, (used / usage.limit) * 100))
      : 0;

  limitProgressBar.style.width = `${percent}%`;
  successLimit.classList.remove("hidden");
}

async function waitForJob(jobId, usageFromCreate = null) {
  let lastUsage = usageFromCreate;

  for (let attempt = 0; attempt < 45; attempt++) {
    await sleep(attempt === 0 ? 900 : 1500);

    const data = await postJson("/api/status", { job_id: jobId });
    const usage = extractUsage(data);

    if (usage) {
      lastUsage = usage;
      renderUsage(usage);
    }

    const state = jobState(data);
    const progress = Number(data?.data?.progress || data?.progress || 0);

    if (
      state === "completed" ||
      state === "complete" ||
      state === "done" ||
      state === "success"
    ) {
      return { data, usage: usage || lastUsage };
    }

    statusTitle.textContent =
      state === "active"
        ? "Reaction sedang dikirim"
        : "Reaction menunggu worker";

    statusText.textContent =
      progress > 0
        ? `Proses berjalan ${Math.max(0, Math.min(100, progress))}%.`
        : "Jangan tutup halaman sampai proses selesai.";

    setBusy(
      true,
      state === "active"
        ? "Mengirim reaction..."
        : "Menunggu proses..."
    );
  }

  throw new Error(
    "Proses Reaction melewati batas waktu. Coba periksa postingan atau kirim ulang beberapa saat lagi."
  );
}

function openModal(modal) {
  if (!modal || modal.classList.contains("is-open")) return;

  modal.classList.remove("hidden", "is-closing");
  modal.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      modal.classList.add("is-open");
      document.body.classList.add("modal-open");
    });
  });
}

function closeModal(modal) {
  if (!modal || !modal.classList.contains("is-open")) {
    return Promise.resolve();
  }

  modal.classList.remove("is-open");
  modal.classList.add("is-closing");

  return new Promise((resolve) => {
    setTimeout(() => {
      modal.classList.remove("is-closing");
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");

      const anyOpen = [...document.querySelectorAll(".modal-layer")]
        .some((item) => item.classList.contains("is-open"));

      if (!anyOpen) {
        document.body.classList.remove("modal-open");
      }

      resolve();
    }, 240);
  });
}

function openChannelModal(mode = "welcome") {
  channelCopy.textContent =
    mode === "success"
      ? "Reaction selesai. Ikuti saluran znn_id untuk update endpoint, fitur baru, dan info layanan."
      : "Dapatkan update endpoint, fitur baru, dan info layanan langsung dari WhatsApp.";

  openModal(channelModal);
}

function showSuccess(reaction, usage) {
  const emoji = reaction.split(",")[0].trim() || "✅";

  successEmoji.textContent = emoji;
  successReactionText.textContent = reaction;
  successCopy.textContent = "Reaction sudah berhasil diterapkan ke postingan Channel.";

  renderSuccessUsage(usage);
  openModal(successModal);
}

function resetForm() {
  form.reset();
  reactionInput.value = "";
  syncEmoji();
  clearNotice();
  statusTitle.textContent = "Layanan siap digunakan";
  statusText.textContent = "Reaction akan diproses oleh worker ZNN.";
}

reactionInput.addEventListener("input", syncEmoji);

document.querySelectorAll("[data-emoji]").forEach((button) => {
  button.addEventListener("click", () => {
    const emoji = button.dataset.emoji || "";
    const list = reactionList();

    if (!emoji) return;

    if (list.includes(emoji)) {
      setNotice("error", "Emoji yang sama tidak boleh dipilih dua kali.");
      return;
    }

    clearNotice();
    list.push(emoji);
    reactionInput.value = list.join(",");
    syncEmoji();
    reactionInput.focus();
  });
});

document.querySelectorAll("[data-channel-close]").forEach((button) => {
  button.addEventListener("click", () => closeModal(channelModal));
});

successDone.addEventListener("click", async () => {
  await closeModal(successModal);
  await sleep(140);
  openChannelModal("success");
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (channelModal?.classList.contains("is-open")) {
    closeModal(channelModal);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearNotice();

  const url = urlInput.value.trim();
  const reaction = reactionInput.value.trim();

  if (!validChannelPost(url)) {
    setNotice(
      "error",
      "Gunakan link postingan Channel WhatsApp, bukan link utama Channel."
    );
    urlInput.focus();
    return;
  }

  if (!reaction) {
    setNotice("error", "Masukkan emoji reaction.");
    reactionInput.focus();
    return;
  }

  const reactions = reactionList();

  if (reactions.length > 20) {
    setNotice("error", "Maksimal 20 emoji dalam satu request.");
    reactionInput.focus();
    return;
  }

  if (hasDuplicateEmoji(reactions)) {
    setNotice(
      "error",
      "Emoji yang sama tidak boleh diulang. Gunakan emoji berbeda, contoh ❤️,🫶🏻,👍🏻."
    );
    reactionInput.focus();
    return;
  }

  setBusy(true, "Membuat proses...");
  statusTitle.textContent = "Membuat proses Reaction";
  statusText.textContent = "Link dan emoji sedang dikirim ke API.";

  try {
    const createData = await postJson("/api/react", { url, reaction });
    let data = createData;
    let usage = extractUsage(createData);

    if (usage) {
      renderUsage(usage);
    }

    const state = jobState(data);

    if (
      !(
        state === "completed" ||
        state === "complete" ||
        state === "done" ||
        state === "success"
      )
    ) {
      const jobId = String(
        data?.data?.job_id ||
        data?.job_id ||
        ""
      ).trim();

      if (!/^[a-f0-9]{32}$/i.test(jobId)) {
        throw new Error(data.message || "ID proses Reaction tidak ditemukan.");
      }

      const result = await waitForJob(jobId, usage);
      data = result.data;
      usage = result.usage || usage;
    } else {
      usage = extractUsage(data) || usage;
    }

    if (usage) {
      renderUsage(usage);
    }

    statusTitle.textContent = "Reaction berhasil dikirim";
    statusText.textContent = "Proses selesai tanpa error.";
    setNotice("success", "Reaction berhasil dikirim.");

    const finalReaction = String(
      data?.data?.reaction ||
      data?.reaction ||
      reaction
    ).trim() || reaction;

    showSuccess(finalReaction, usage);

    setTimeout(() => {
      resetForm();
    }, 350);
  } catch (error) {
    const errorUsage = extractUsage(error?.data);

    if (errorUsage) {
      renderUsage(errorUsage);
    }

    statusTitle.textContent = "Reaction gagal diproses";
    statusText.textContent = "Periksa link, token, atau limit lalu coba lagi.";
    setNotice(
      "error",
      error?.message || "Reaction gagal diproses."
    );
  } finally {
    setBusy(false);
  }
});

window.addEventListener("load", () => {
  syncEmoji();

  const savedUsage = loadUsage();
  if (savedUsage) {
    renderUsage(savedUsage);
  }

  setTimeout(() => {
    openChannelModal("welcome");
  }, 650);
});
