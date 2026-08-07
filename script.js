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
// 6. SUBMIT (PAKE API DARI REPO ZNN)
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
            // Reset form (opsional, di-uncomment kalo mau)
            // postUrl.value = '';
            // reactionInput.value = '';
            // emojiChips.innerHTML = '';
            // emojiPreview.textContent = '❤️';
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