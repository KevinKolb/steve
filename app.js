/* ============================================================
   Steve Hartnett 80th Birthday — RSVP App
   Database: Airtable (free tier)

   SETUP INSTRUCTIONS
   ──────────────────
   1. Go to https://airtable.com and create a free account.
   2. Create a new Base called "Steve 80th Birthday" (or any name).
   3. Create a table named exactly: RSVPs
   4. Add these fields to the table:
        Phone             — Single line text   (primary identifier)
        First Name        — Single line text
        Last Name         — Single line text
        Attending         — Single select      (options: Yes, No, Maybe)
        Additional Guests — Long text          (stores JSON)
        Total Guests      — Number
   5. Generate a Personal Access Token at https://airtable.com/create/tokens
        Scopes needed: data.records:read  and  data.records:write
        Access: your specific base only
   6. Find your Base ID: open your base, the URL is
        https://airtable.com/appXXXXXXXXXXXXXX/...
        The "appXXXX..." part is your Base ID.
   7. Paste Base ID and token into CONFIG below and you're live.
   ============================================================ */

const CONFIG = {
  airtable: {
    baseId: (window.SITE_CONFIG || {}).airtableBaseId || 'YOUR_BASE_ID',
    tableName: 'RSVPs',
    token: (window.SITE_CONFIG || {}).airtableToken  || 'YOUR_PERSONAL_ACCESS_TOKEN',
  },
  // Event date/time — America/Chicago (CDT, UTC-5 in late April)
  eventDate: new Date('2026-04-30T09:00:00-05:00'),
};

/* ============================================================
   AIRTABLE API WRAPPER
   ============================================================ */
const AT = {
  get url() {
    return `https://api.airtable.com/v0/${CONFIG.airtable.baseId}/${encodeURIComponent(CONFIG.airtable.tableName)}`;
  },
  get hdrs() {
    return {
      'Authorization': `Bearer ${CONFIG.airtable.token}`,
      'Content-Type': 'application/json',
    };
  },

  normalize(phone) {
    return phone.replace(/\D/g, '');
  },

  formatDisplay(phone) {
    const d = phone.replace(/\D/g, '');
    if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
    if (d.length === 11 && d[0] === '1') return `+1 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
    return phone;
  },

  async findByPhone(phone) {
    const norm = this.normalize(phone);
    const formula = encodeURIComponent(`({Phone}="${norm}")`);
    const res = await fetch(`${this.url}?filterByFormula=${formula}`, { headers: this.hdrs });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `Search failed (${res.status}). Check your Base ID and token.`);
    if (data.error) throw new Error(data.error.message || 'Airtable error');
    return data.records?.[0] || null;
  },

  async create(fields) {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: this.hdrs,
      body: JSON.stringify({ fields }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Could not save RSVP. Please try again.');
    return data;
  },

  async update(id, fields) {
    const res = await fetch(`${this.url}/${id}`, {
      method: 'PATCH',
      headers: this.hdrs,
      body: JSON.stringify({ fields }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Could not save changes. Please try again.');
    return data;
  },

  async getAttending() {
    const records = [];
    let offset = null;
    do {
      const formula = encodeURIComponent(`OR({Attending}="Yes",{Attending}="Maybe")`);
      let reqUrl = `${this.url}?filterByFormula=${formula}&sort[0][field]=Last+Name&sort[0][direction]=asc`;
      if (offset) reqUrl += `&offset=${offset}`;
      const res = await fetch(reqUrl, { headers: this.hdrs });
      if (!res.ok) break;
      const data = await res.json();
      records.push(...(data.records || []));
      offset = data.offset || null;
    } while (offset);
    return records;
  },
};

/* ============================================================
   HELPERS
   ============================================================ */
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setLoading(btn, on) {
  btn.disabled = on;
  btn.querySelector('.btn-label')?.classList.toggle('hidden', on);
  btn.querySelector('.btn-spin')?.classList.toggle('hidden', !on);
}

function showErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideErr(id) {
  document.getElementById(id)?.classList.add('hidden');
}

/* ============================================================
   VIEWS
   ============================================================ */
const VIEWS = ['view-new', 'view-edit-lookup', 'view-edit-form', 'view-confirmation'];

function showView(id) {
  VIEWS.forEach(v => document.getElementById(v)?.classList.add('hidden'));
  document.getElementById(id)?.classList.remove('hidden');
}

/* ============================================================
   GUEST ENTRY BUILDER
   ============================================================ */
function addGuestEntry(container, data = {}) {
  const idx = container.querySelectorAll('.guest-entry').length;
  const div = document.createElement('div');
  div.className = 'guest-entry';
  div.innerHTML = `
    <div class="guest-entry-header">
      <span class="guest-entry-label">Guest ${idx + 1}</span>
      <button type="button" class="btn-remove" aria-label="Remove guest">Remove</button>
    </div>
    <div class="field-row two-col">
      <div class="field">
        <label>First Name</label>
        <input type="text" value="${esc(data.firstName || '')}" placeholder="First Name" autocomplete="off">
      </div>
      <div class="field">
        <label>Last Name</label>
        <input type="text" value="${esc(data.lastName || '')}" placeholder="Last Name" autocomplete="off">
      </div>
    </div>
    <div class="field">
      <label>Phone <span style="font-weight:400;text-transform:none;letter-spacing:0">(optional)</span></label>
      <input type="tel" inputmode="tel" value="${esc(data.phone || '')}" placeholder="(504) 555-0100" autocomplete="off">
    </div>
  `;
  div.querySelector('.btn-remove').addEventListener('click', () => div.remove());
  container.appendChild(div);
}

function collectGuests(container) {
  const out = [];
  container.querySelectorAll('.guest-entry').forEach(entry => {
    const inputs = entry.querySelectorAll('input');
    const firstName = inputs[0].value.trim();
    const lastName  = inputs[1].value.trim();
    const phone     = AT.normalize(inputs[2].value);
    if (firstName || lastName) out.push({ firstName, lastName, phone });
  });
  return out;
}

/* ============================================================
   TABS
   ============================================================ */
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      showView(btn.dataset.tab === 'new' ? 'view-new' : 'view-edit-lookup');
    });
  });
}

/* ============================================================
   NEW RSVP FORM
   ============================================================ */
function initNewForm() {
  const guestsCont = document.getElementById('guests-new');
  document.getElementById('btn-add-new').addEventListener('click', () => {
    addGuestEntry(guestsCont);
  });

  document.getElementById('form-new').addEventListener('submit', async e => {
    e.preventDefault();
    hideErr('err-new');

    const firstName = document.getElementById('fn').value.trim();
    const lastName  = document.getElementById('ln').value.trim();
    const phone     = AT.normalize(document.getElementById('ph').value);
    const attending = document.querySelector('[name="attending"]:checked')?.value;

    if (!firstName || !lastName) { showErr('err-new', 'Please enter your first and last name.'); return; }
    if (phone.length < 10)       { showErr('err-new', 'Please enter a valid 10-digit phone number.'); return; }
    if (!attending)              { showErr('err-new', 'Please select whether you\'ll attend.'); return; }

    const btn = document.getElementById('submit-new');
    setLoading(btn, true);
    try {
      const existing = await AT.findByPhone(phone);
      if (existing) {
        showErr('err-new',
          `An RSVP already exists for ${AT.formatDisplay(phone)}. ` +
          `Use the "Edit My RSVP" tab to update your response.`);
        return;
      }

      const guests     = collectGuests(guestsCont);
      const totalGuests = 1 + guests.length;

      await AT.create({
        'Phone':             phone,
        'First Name':        firstName,
        'Last Name':         lastName,
        'Attending':         attending,
        'Additional Guests': guests.length ? JSON.stringify(guests) : '',
        'Total Guests':      totalGuests,
      });

      showConfirmation(firstName, attending);
      loadGuestList();
    } catch (err) {
      showErr('err-new', err.message);
    } finally {
      setLoading(btn, false);
    }
  });
}

/* ============================================================
   EDIT RSVP FLOW
   ============================================================ */
let currentRecord = null;

function initEditFlow() {
  // Phone lookup
  document.getElementById('form-lookup').addEventListener('submit', async e => {
    e.preventDefault();
    hideErr('err-lookup');

    const phone = AT.normalize(document.getElementById('lookup-ph').value);
    if (phone.length < 10) { showErr('err-lookup', 'Please enter a valid 10-digit phone number.'); return; }

    const btn = document.getElementById('submit-lookup');
    setLoading(btn, true);
    try {
      const record = await AT.findByPhone(phone);
      if (!record) {
        showErr('err-lookup',
          'No RSVP found for that number. ' +
          'Please check the number or use the "New RSVP" tab.');
        return;
      }
      populateEditForm(record);
    } catch (err) {
      showErr('err-lookup', err.message);
    } finally {
      setLoading(btn, false);
    }
  });

  // Cancel
  document.getElementById('btn-cancel-edit').addEventListener('click', () => {
    document.getElementById('tab-edit').click();
  });

  // Add guest
  document.getElementById('btn-add-edit').addEventListener('click', () => {
    addGuestEntry(document.getElementById('guests-edit'));
  });

  // Edit form submit
  document.getElementById('form-edit').addEventListener('submit', async e => {
    e.preventDefault();
    hideErr('err-edit');

    const firstName = document.getElementById('edit-fn').value.trim();
    const lastName  = document.getElementById('edit-ln').value.trim();
    const attending = document.querySelector('[name="edit-attending"]:checked')?.value;
    const recordId  = document.getElementById('edit-record-id').value;

    if (!firstName || !lastName) { showErr('err-edit', 'Please enter your name.'); return; }
    if (!attending)              { showErr('err-edit', 'Please select whether you\'ll attend.'); return; }

    const btn = document.getElementById('submit-edit');
    setLoading(btn, true);
    try {
      const guests     = collectGuests(document.getElementById('guests-edit'));
      const totalGuests = 1 + guests.length;

      const updated = await AT.update(recordId, {
        'First Name':        firstName,
        'Last Name':         lastName,
        'Attending':         attending,
        'Additional Guests': guests.length ? JSON.stringify(guests) : '',
        'Total Guests':      totalGuests,
      });

      // Keep current record up to date for re-editing
      currentRecord = updated;

      showConfirmation(firstName, attending, true);
      loadGuestList();
    } catch (err) {
      showErr('err-edit', err.message);
    } finally {
      setLoading(btn, false);
    }
  });

  // Edit from confirmation
  document.getElementById('btn-edit-from-conf').addEventListener('click', () => {
    if (currentRecord) {
      populateEditForm(currentRecord);
    } else {
      document.getElementById('tab-edit').click();
    }
  });
}

function populateEditForm(record) {
  currentRecord = record;
  const f = record.fields;

  document.getElementById('edit-record-id').value = record.id;
  document.getElementById('edit-fn').value         = f['First Name'] || '';
  document.getElementById('edit-ln').value         = f['Last Name'] || '';
  document.getElementById('edit-ph').value         = AT.formatDisplay(f['Phone'] || '');
  document.getElementById('edit-name-display').textContent =
    `${f['First Name'] || ''} ${f['Last Name'] || ''}`.trim();

  // Attendance radio
  document.querySelectorAll('[name="edit-attending"]').forEach(r => {
    r.checked = r.value === f['Attending'];
  });

  // Additional guests
  const cont = document.getElementById('guests-edit');
  cont.innerHTML = '';
  if (f['Additional Guests']) {
    try {
      JSON.parse(f['Additional Guests']).forEach(g => addGuestEntry(cont, g));
    } catch (_) { /* ignore malformed JSON */ }
  }

  // Switch tabs
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  const editTab = document.getElementById('tab-edit');
  editTab.classList.add('active');
  editTab.setAttribute('aria-selected', 'true');

  showView('view-edit-form');
}

/* ============================================================
   CONFIRMATION
   ============================================================ */
function showConfirmation(firstName, attending, isEdit = false) {
  const title = document.getElementById('conf-title');
  const body  = document.getElementById('conf-body');

  if (isEdit) {
    title.textContent = 'Changes saved!';
    body.textContent  = attending === 'No'
      ? 'Your RSVP has been updated. Sorry you can\'t make it!'
      : `Your RSVP has been updated. See you April 30th, ${firstName}!`;
  } else {
    title.textContent = attending === 'No' ? 'Got it.' : 'You\'re in!';
    body.textContent  = attending === 'No'
      ? 'Thanks for letting us know. We\'ll miss you!'
      : `See you April 30th, ${firstName}! Meet us outside Liuzza's by the Track at 9 AM — right before Jazz Fest opens.`;
  }
  showView('view-confirmation');
}

/* ============================================================
   GUEST LIST
   ============================================================ */
async function loadGuestList() {
  const grid    = document.getElementById('guest-grid');
  const countEl = document.getElementById('guest-count');

  try {
    const records = await AT.getAttending();

    grid.innerHTML = '';
    let total = 0;

    if (records.length === 0) {
      grid.innerHTML = '<div class="guest-placeholder">Be the first to RSVP!</div>';
      countEl.textContent = '0';
      return;
    }

    records.forEach(record => {
      const f = record.fields;
      total += f['Total Guests'] || 1;

      // Primary RSVP holder
      grid.appendChild(guestCard(f['First Name'], f['Last Name'], f['Attending']));

      // Additional guests (names only — no phones shown)
      if (f['Additional Guests']) {
        try {
          JSON.parse(f['Additional Guests']).forEach(g => {
            if (g.firstName || g.lastName) {
              grid.appendChild(guestCard(g.firstName, g.lastName, 'with', `With ${f['First Name'] || ''}`));
            }
          });
        } catch (_) { /* ignore */ }
      }
    });

    countEl.textContent = total.toString();
  } catch (_) {
    grid.innerHTML = '<div class="guest-placeholder">Unable to load attendees right now.</div>';
  }
}

function shortName(firstName, lastName) {
  const f = (firstName || '').trim();
  const l = (lastName || '').trim();
  return l ? `${f} ${l.charAt(0).toUpperCase()}.` : f;
}

function guestCard(firstName, lastName, status, statusLabel) {
  const div = document.createElement('div');
  div.className = 'guest-card';

  const statusMap = {
    'Yes':   { cls: 'yes',   label: 'Attending' },
    'Maybe': { cls: 'maybe', label: 'Maybe' },
    'No':    { cls: '',      label: '' },
    'with':  { cls: 'with',  label: statusLabel || 'Guest' },
  };
  const s = statusMap[status] || { cls: '', label: '' };

  div.innerHTML = `
    <div class="guest-card-name">${esc(shortName(firstName, lastName))}</div>
    ${s.label ? `<div class="guest-card-status ${s.cls}">${esc(s.label)}</div>` : ''}
  `;
  return div;
}

/* ============================================================
   COUNTDOWN
   ============================================================ */
function tick() {
  const diff = CONFIG.eventDate - Date.now();
  if (diff <= 0) {
    ['cd-days','cd-hours','cd-mins'].forEach(id => {
      document.getElementById(id).textContent = '0';
    });
    return;
  }
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000)  / 60000);
  document.getElementById('cd-days').textContent  = days;
  document.getElementById('cd-hours').textContent = hours;
  document.getElementById('cd-mins').textContent  = mins;
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Warn if not yet configured
  if (CONFIG.airtable.baseId === 'YOUR_BASE_ID') {
    console.warn(
      '%c[RSVP] Airtable not configured yet. ' +
      'Open app.js and fill in CONFIG.airtable.baseId and .token',
      'color: #C9962C; font-weight: bold'
    );
  }

  initTabs();
  initNewForm();
  initEditFlow();
  loadGuestList();
  tick();
  setInterval(tick, 60000);
});
