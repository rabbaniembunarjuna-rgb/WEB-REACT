// ================================================================
// 1. DOM ELEMENTS
// ================================================================
const form = document.getElementById('reactionForm');
const postUrl = document.getElementById('postUrl');
const reactionInput = document.getElementById('reactionInput');
const emojiPreview = document.getElementById('emojiPreview');
const quickEmojis = document.getElementById('quickEmojis');
const emojiChips = document.getElementById('emojiChips');
const submitBtn = document.getElementById('submitBtn');
const notice = document.getElementById('notice');
const limitUsed = document.getElementById('limitUsed');

// ================================================================
// 2. UPDATE PREVIEW
// ================================================================
reactionInput.addEventListener('input', () => {
    const val = reactionInput.value.trim();
    const first = val.split(',')[0].trim();
    emojiPreview.textContent = first || '❤️';
});

// ================================================================
// 3. QUICK EMOJI
// ================================================================
quickEmojis.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const emoji = btn.dataset.emoji;
    const current = reactionInput.value.trim();
    const list = current ? current.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (!list.includes(emoji)) {
        list.push(emoji);
        reactionInput.value = list.join(',');
        emojiPreview.textContent = emoji;
        renderChips(list);
    }
    quickEmojis.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
});

// ================================================================
// 4. RENDER CHIPS
// ================================================================
function renderChips(list) {
    emojiChips.innerHTML = '';
    list.forEach(e => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.innerHTML = `${e} <button type="button" data-remove="${e}">✕</button>`;
        emojiChips.appendChild(chip);
    });
    emojiChips.querySelectorAll('[data-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
            const em = btn.dataset.remove;
            const current = reactionInput.value.split(',').map(s => s.trim()).filter(Boolean);
            const filtered = current.filter(e => e !== em);
            reactionInput.value = filtered.join(',');
            emojiPreview.textContent = filtered[0] || '❤️';
            renderChips(filtered);
        });
    });
}

// ================================================================
// 5. NOTICE
// ================================================================
function showNotice(msg, type) {
    notice.textContent = msg;
    notice.className = `notice show ${type}`;
}

function hideNotice() {
    notice.className = 'notice';
}

// ================================================================
// 6. SUBMIT (PAKE API DARI REPO ZNN) - TIDAK DIUBAH
// ================================================================
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = postUrl.value.trim();
    const rawEmojis = reactionInput.value.trim();

    if (!url) return showNotice('Masukkan link pesan Channel, bego!', 'error');
    if (!rawEmojis) return showNotice('Isi emoji dulu, kontol!', 'error');

    const emojis = rawEmojis.split(',').map(s => s.trim()).filter(Boolean);
    if (emojis.length === 0) return showNotice('Emoji ga boleh kosong, tolol!', 'error');
    if (new Set(emojis).size !== emojis.length) {
        return showNotice('Emoji yang sama tidak boleh diulang, bangsat!', 'error');
    }

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    hideNotice();

    try {
        // ===== PAKE ENDPOINT REACT.JS DARI REPO =====
        const response = await fetch('/api/react', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                reaction: emojis.join(',')
            })
        });

        const result = await response.json();
        console.log('📦 Result:', result);

        if (response.ok && result.status === true) {
            showNotice(`✅ ${result.message || 'Reaction berhasil dikirim!'}`, 'success');
            if (result.data?.used !== undefined) {
                limitUsed.textContent = result.data.used;
            }
            // TAMBAHAN: Catat history kalau sukses
            const time = new Date().toLocaleTimeString('id', { hour: '2-digit', minute: '2-digit' });
            historyData.push(`${rawEmojis} (${time})`);
            historyList.textContent = historyData.join(' · ');
            historyContainer.style.display = 'block';
        } else {
            showNotice(`❌ ${result.message || 'Gagal mengirim reaction'}`, 'error');
        }
    } catch (err) {
        console.error('❌ Fetch error:', err);
        showNotice(`❌ Network error: ${err.message}`, 'error');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
});

// ================================================================
// 7. AUTO LOAD EXAMPLE
// ================================================================
postUrl.value = 'https://whatsapp.com/channel/0029Vb6jzN97z4keastNq73f/436';
reactionInput.value = '❤️,🫶🏻';
renderChips(['❤️', '🫶🏻']);
emojiPreview.textContent = '❤️';
limitUsed.textContent = '3';

console.log('🔥 AXO AUTO REACT siap, kontol!');

// ================================================================
// 8. TAMBAHAN: THEME TOGGLE (CUMA GANTI WARNA, TIDAK UBAH SISTEM)
// ================================================================
const themeBtn = document.getElementById('themeToggle');
let darkMode = true;

themeBtn?.addEventListener('click', () => {
    darkMode = !darkMode;
    const root = document.body;
    if (darkMode) {
        root.style.background = '#0a0a0f';
        root.style.color = '#fff';
        themeBtn.textContent = '🌙';
        // Reset elemen yang diubah
        document.querySelectorAll('.brand-text strong, .card-heading h2, .guide-card h3, .footer, .guide-steps p strong').forEach(el => {
            el.style.color = '';
        });
        document.querySelectorAll('.subtitle, .field-label, .service-main strong, .guide-card > span, .guide-steps p').forEach(el => {
            el.style.color = '';
        });
        document.querySelectorAll('.guide-steps p').forEach(el => el.style.color = '');
    } else {
        root.style.background = '#f0edf5';
        root.style.color = '#111';
        themeBtn.textContent = '☀️';
        // Ubah warna teks biar keliatan di mode terang
        document.querySelectorAll('.brand-text strong, .card-heading h2, .guide-card h3, .footer').forEach(el => {
            el.style.color = '#111';
        });
        document.querySelectorAll('.subtitle, .field-label, .service-main strong, .guide-card > span').forEach(el => {
            el.style.color = 'rgba(0,0,0,0.4)';
        });
        document.querySelectorAll('.guide-steps p').forEach(el => {
            el.style.color = 'rgba(0,0,0,0.25)';
        });
        document.querySelectorAll('.guide-steps p strong').forEach(el => {
            el.style.color = 'rgba(0,0,0,0.5)';
        });
        document.querySelectorAll('.limit-pill small, .limit-pill span, .service-main p, .card-heading>div>span, .brand-text small, .online-badge, .footer strong').forEach(el => {
            el.style.color = 'rgba(0,0,0,0.2)';
        });
    }
});

// ================================================================
// 9. TAMBAHAN: HISTORY (CUMA TAMPILAN, TIDAK UBAH SISTEM)
// ================================================================
const historyContainer = document.getElementById('history');
const historyList = document.getElementById('historyList');
const historyData = [];