/* ─── Room definitions ──────────────────────────────────────── */
const ROOMS = [
  { id: 1, name: 'Room 1', cap: 4,  color: '#dbeafe', emoji: '🔵', accentColor: '#0ea5e9', features: ['TV Screen'],          disabled: false },
  { id: 2, name: 'Room 2', cap: 4,  color: '#fce7f3', emoji: '🟣', accentColor: '#a855f7', features: ['TV Screen'],          disabled: false },
  { id: 3, name: 'Room 3', cap: 10, color: '#d1fae5', emoji: '🟢', accentColor: '#22c55e', features: ['TV Screen', 'Couch'], disabled: false },
  { id: 4, name: 'Room 4', cap: 0,  color: '#e5e7eb', emoji: '⬜', accentColor: '#9ca3af', features: [],                    disabled: true  },
  { id: 5, name: 'Room 5', cap: 0,  color: '#e5e7eb', emoji: '⬜', accentColor: '#9ca3af', features: [],                    disabled: true  },
  { id: 6, name: 'Room 6', cap: 0,  color: '#e5e7eb', emoji: '⬜', accentColor: '#9ca3af', features: [],                    disabled: true  },
];

/* ─── State ─────────────────────────────────────────────────── */
const state = {
  date:         null,
  time:         null,
  durationMins: null,
  room:         null,
  scriptUrl:    'https://script.google.com/a/macros/zenithtoinvest.com/s/AKfycbyBVM13PN_NvG45RwF-lfPcYnMusn31Y771nUiNzv-yqEvRq2BCBRYpAuhVlX8FLe7g/exec',
  demoMode:     false,
  bookedSlots:  {},   // { "YYYY-MM-DD|roomId": ["HH:MM", ...] }
  allBookings:  [],   // full booking objects for the calendar view
};

/* ─── Helpers ───────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

function showStep(id) {
  document.querySelectorAll('#view-book .step').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $(id).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  $('tab-' + id.replace('view-', '')).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function dateStr(d) { return d.toISOString().slice(0, 10); }

function fmtDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtDateShort(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtDuration(mins) {
  if (mins < 60) return `${mins} min`;
  if (mins % 60 === 0) return `${mins / 60} hour${mins > 60 ? 's' : ''}`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function calcEndTime(startTime, durationMins) {
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m + durationMins;
  return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
}

function slotKey(date, roomId) { return `${dateStr(date)}|${roomId}`; }

function occupiedSlots(startTime, durationMins) {
  const slots = [];
  const [h, m] = startTime.split(':').map(Number);
  let cur = h * 60 + m;
  for (let i = 0; i < durationMins; i += 30) {
    slots.push(`${String(Math.floor(cur/60)).padStart(2,'0')}:${String(cur%60).padStart(2,'0')}`);
    cur += 30;
  }
  return slots;
}

function isAvailable(room, startTime, durationMins) {
  if (room.disabled) return false;
  const [h, m] = startTime.split(':').map(Number);
  if (h * 60 + m + durationMins > 20 * 60) return false;
  const key    = slotKey(state.date, room.id);
  const booked = state.bookedSlots[key] || [];
  return occupiedSlots(startTime, durationMins).every(s => !booked.includes(s));
}

function buildTimeSlots() {
  const slots = [];
  for (let h = 8; h < 20; h++) {
    slots.push(`${String(h).padStart(2,'0')}:00`);
    slots.push(`${String(h).padStart(2,'0')}:30`);
  }
  return slots;
}
const ALL_TIMES = buildTimeSlots();

/* ─── Left panel summary ─────────────────────────────────────── */
function syncSummary() {
  const d   = state.date ? fmtDate(state.date) : '';
  const end = state.time && state.durationMins ? calcEndTime(state.time, state.durationMins) : '';
  const timeRange = state.time ? (end ? `${state.time} – ${end}` : state.time) : '';
  const dur = state.durationMins ? fmtDuration(state.durationMins) : '';

  if ($('sl-date'))     $('sl-date').textContent     = d;
  if ($('sd-date'))     $('sd-date').textContent     = d;
  if ($('sd-time'))     $('sd-time').textContent     = state.time || '';
  if ($('sr-date'))     $('sr-date').textContent     = d;
  if ($('sr-time'))     $('sr-time').textContent     = timeRange;
  if ($('sr-duration')) $('sr-duration').textContent = dur;
  if ($('sf-date'))     $('sf-date').textContent     = d;
  if ($('sf-time'))     $('sf-time').textContent     = timeRange;
  if ($('sf-duration')) $('sf-duration').textContent = dur;
  if ($('sf-cap') && state.room) $('sf-cap').textContent = `Up to ${state.room.cap} people`;
  if ($('form-room-name') && state.room) $('form-room-name').textContent = state.room.name;
  if ($('form-avatar') && state.room) {
    $('form-avatar').textContent       = state.room.emoji;
    $('form-avatar').style.background  = state.room.color;
  }
}

/* ══════════════════════════════════════════════════════════════
   NAV TABS
   ══════════════════════════════════════════════════════════════ */
$('tab-book').addEventListener('click', () => showView('view-book'));
$('tab-bookings').addEventListener('click', () => {
  showView('view-bookings');
  bvRenderCalendar(bvViewDate);
  if (bvSelectedDate) bvLoadDay(bvSelectedDate);
  else bvLoadDay(new Date());
});
$('view-all-bookings-btn').addEventListener('click', () => {
  showView('view-bookings');
  bvRenderCalendar(bvViewDate);
  bvLoadDay(new Date());
});

/* ══════════════════════════════════════════════════════════════
   STEP 0 — Date picker
   ══════════════════════════════════════════════════════════════ */
let calViewDate = new Date();

function renderCalendar(viewDate) {
  calViewDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const today   = new Date(); today.setHours(0,0,0,0);
  const maxDate = new Date(today); maxDate.setDate(today.getDate() + 60);

  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  $('cal-month-label').textContent = `${MONTHS[calViewDate.getMonth()]} ${calViewDate.getFullYear()}`;

  const firstDay    = calViewDate.getDay();
  const daysInMonth = new Date(calViewDate.getFullYear(), calViewDate.getMonth()+1, 0).getDate();

  let html = '';
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const thisDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth(), d);
    const past   = thisDate < today;
    const tooFar = thisDate > maxDate;
    const isToday = thisDate.getTime() === today.getTime();
    const isSel   = state.date && thisDate.getTime() === state.date.getTime();
    let cls = 'cal-day';
    if (past || tooFar) cls += ' disabled';
    else if (isSel)     cls += ' selected';
    else if (isToday)   cls += ' today';
    html += `<div class="${cls}" data-date="${dateStr(thisDate)}">${d}</div>`;
  }
  $('cal-days').innerHTML = html;

  $('cal-days').querySelectorAll('.cal-day:not(.disabled):not(.empty)').forEach(node => {
    node.addEventListener('click', () => {
      const [y,m,d] = node.dataset.date.split('-').map(Number);
      state.date = new Date(y, m-1, d);
      renderCalendar(calViewDate);
      syncSummary();
      renderTimeSlots();
      showStep('step-time');
    });
  });
}

$('cal-prev').addEventListener('click', () => {
  const today = new Date(); today.setHours(0,0,0,0);
  const prev  = new Date(calViewDate.getFullYear(), calViewDate.getMonth()-1, 1);
  if (prev < new Date(today.getFullYear(), today.getMonth(), 1)) return;
  renderCalendar(prev);
});
$('cal-next').addEventListener('click', () => renderCalendar(new Date(calViewDate.getFullYear(), calViewDate.getMonth()+1, 1)));

/* ══════════════════════════════════════════════════════════════
   STEP 1 — Time picker
   ══════════════════════════════════════════════════════════════ */
function renderTimeSlots() {
  const list = $('time-slots-list');
  list.innerHTML = ALL_TIMES.map(t =>
    `<button class="slot-btn" data-time="${t}">${t}</button>`
  ).join('');

  list.querySelectorAll('.slot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      list.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.time = btn.dataset.time;
      syncSummary();
      showStep('step-duration');
    });
  });
}

$('back-date').addEventListener('click', () => { state.time = null; showStep('step-date'); });

/* ══════════════════════════════════════════════════════════════
   STEP 2 — Duration picker
   ══════════════════════════════════════════════════════════════ */
document.querySelectorAll('.duration-card').forEach(card => {
  card.addEventListener('click', () => {
    const mins = card.dataset.mins;
    document.querySelectorAll('.duration-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');

    if (mins === 'custom') {
      $('custom-dur-wrap').classList.remove('hidden');
      $('dur-continue').classList.remove('hidden');
      $('custom-mins').focus();
      return;
    }
    $('custom-dur-wrap').classList.add('hidden');
    $('dur-continue').classList.add('hidden');
    state.durationMins = parseInt(mins);
    syncSummary();
    goToRooms();
  });
});

$('dur-continue').addEventListener('click', () => {
  const val = parseInt($('custom-mins').value);
  if (!val || val < 15 || val > 480) {
    $('custom-mins').style.borderColor = '#ef4444';
    return;
  }
  $('custom-mins').style.borderColor = '';
  state.durationMins = val;
  syncSummary();
  goToRooms();
});

$('back-time').addEventListener('click', () => {
  state.durationMins = null;
  document.querySelectorAll('.duration-card').forEach(c => c.classList.remove('selected'));
  $('custom-dur-wrap').classList.add('hidden');
  $('dur-continue').classList.add('hidden');
  showStep('step-time');
});

/* ══════════════════════════════════════════════════════════════
   STEP 3 — Room selection
   ══════════════════════════════════════════════════════════════ */
async function goToRooms() {
  await loadAllRoomBookings();
  renderRooms();
  showStep('step-rooms');
}

async function loadAllRoomBookings() {
  if (!state.scriptUrl || state.demoMode) return;
  const ds = dateStr(state.date);
  await Promise.all(ROOMS.map(async r => {
    try {
      const res  = await fetch(`${state.scriptUrl}?action=get&date=${ds}&room=${r.id}`);
      const data = await res.json();
      if (data.booked) state.bookedSlots[slotKey(state.date, r.id)] = data.booked;
    } catch(e) {}
  }));
}

function renderRooms() {
  const avail   = ROOMS.filter(r => !r.disabled && isAvailable(r, state.time, state.durationMins));
  const unavail = ROOMS.filter(r => r.disabled  || !isAvailable(r, state.time, state.durationMins));

  $('rooms-avail-note').textContent =
    `${avail.length} of ${ROOMS.filter(r=>!r.disabled).length} rooms available for ${fmtDuration(state.durationMins)}`;

  const list = $('rooms-list');
  list.innerHTML = '';

  [...avail, ...unavail].forEach(r => {
    const available  = !r.disabled && isAvailable(r, state.time, state.durationMins);
    const rowClass   = `room-row${available ? '' : ' unavailable'}${r.disabled ? ' permanently-off' : ''}`;
    const row        = document.createElement('div');
    row.className    = rowClass;
    row.innerHTML    = `
      <div class="room-row-icon" style="background:${r.color}">${r.emoji}</div>
      <div class="room-row-info">
        <h4>${r.name}</h4>
        ${r.cap > 0 ? `<p>Up to ${r.cap} people</p>` : '<p>Not available</p>'}
        <div class="room-badges">
          ${r.features.map(f => `<span class="badge">${f}</span>`).join('')}
          ${!available && !r.disabled ? `<span class="badge unavail">Booked</span>` : ''}
        </div>
      </div>
      <span class="room-row-arrow">→</span>`;
    if (available) {
      row.addEventListener('click', () => { state.room = r; syncSummary(); showStep('step-form'); });
    }
    list.appendChild(row);
  });
}

$('back-duration').addEventListener('click', () => {
  state.room = null;
  document.querySelectorAll('.duration-card').forEach(c => c.classList.remove('selected'));
  $('custom-dur-wrap').classList.add('hidden');
  $('dur-continue').classList.add('hidden');
  showStep('step-duration');
});

/* ══════════════════════════════════════════════════════════════
   STEP 4 — Booking form
   ══════════════════════════════════════════════════════════════ */
$('back-rooms').addEventListener('click', () => { state.room = null; renderRooms(); showStep('step-rooms'); });

$('booking-form').addEventListener('submit', async e => {
  e.preventDefault();
  const name = $('f-name').value.trim();
  if (!name) { $('f-name').classList.add('invalid'); return; }
  $('f-name').classList.remove('invalid');

  const end = calcEndTime(state.time, state.durationMins);
  const payload = {
    action:       'book',
    room:         state.room.name,
    roomId:       state.room.id,
    date:         dateStr(state.date),
    time:         state.time,
    endTime:      end,
    durationMins: state.durationMins,
    name,
    email:        $('f-email').value.trim(),
    team:         $('f-team').value.trim(),
    attendees:    $('f-attendees').value.trim(),
    purpose:      $('f-purpose').value.trim(),
  };

  $('submit-btn').disabled = true;
  $('submit-label').textContent = 'Saving…';
  $('submit-spinner').classList.remove('hidden');

  if (!state.demoMode && state.scriptUrl) {
    try {
      const res  = await fetch(state.scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.error === 'slot_taken') {
        // Someone else just grabbed this slot — refresh and send back to rooms
        $('submit-btn').disabled = false;
        $('submit-label').textContent = 'Confirm Booking';
        $('submit-spinner').classList.add('hidden');
        alert(`Sorry, ${state.room.name} at ${state.time} was just booked by someone else. Please choose another slot.`);
        await loadAllRoomBookings();
        renderRooms();
        showStep('step-rooms');
        return;
      }
    } catch(e) {
      // Network error — still show confirmation (booking may have saved)
    }
  }

  // Cache locally
  const key = slotKey(state.date, state.room.id);
  state.bookedSlots[key] = [...(state.bookedSlots[key]||[]), ...occupiedSlots(state.time, state.durationMins)];
  state.allBookings.push(payload);

  $('submit-btn').disabled = false;
  $('submit-label').textContent = 'Confirm Booking';
  $('submit-spinner').classList.add('hidden');

  $('confirm-summary').innerHTML =
    `<strong>${name}</strong> has booked <strong>${state.room.name}</strong><br>` +
    `on <strong>${fmtDate(state.date)}</strong><br>` +
    `from <strong>${state.time}</strong> to <strong>${end}</strong> (${fmtDuration(state.durationMins)}).`;
  showStep('step-confirm');
});

$('book-another').addEventListener('click', resetBookingFlow);

function resetBookingFlow() {
  $('booking-form').reset();
  state.date = state.time = state.durationMins = state.room = null;
  document.querySelectorAll('.duration-card').forEach(c => c.classList.remove('selected'));
  $('custom-dur-wrap').classList.add('hidden');
  $('dur-continue').classList.add('hidden');
  renderCalendar(new Date());
  showStep('step-date');
}

/* ══════════════════════════════════════════════════════════════
   BOOKINGS CALENDAR VIEW
   ══════════════════════════════════════════════════════════════ */
let bvViewDate     = new Date();
let bvSelectedDate = null;

/* ── Mini calendar ── */
function bvRenderCalendar(viewDate) {
  bvViewDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const today = new Date(); today.setHours(0,0,0,0);

  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  $('bv-cal-month').textContent = `${MONTHS[bvViewDate.getMonth()]} ${bvViewDate.getFullYear()}`;

  const firstDay    = bvViewDate.getDay();
  const daysInMonth = new Date(bvViewDate.getFullYear(), bvViewDate.getMonth()+1, 0).getDate();

  // Figure out which dates have bookings this month
  const bookingsByDate = {};
  state.allBookings.forEach(b => {
    if (!bookingsByDate[b.date]) bookingsByDate[b.date] = new Set();
    bookingsByDate[b.date].add(b.roomId);
  });

  let html = '';
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const thisDate = new Date(bvViewDate.getFullYear(), bvViewDate.getMonth(), d);
    const ds       = dateStr(thisDate);
    const isToday  = thisDate.getTime() === today.getTime();
    const isSel    = bvSelectedDate && thisDate.getTime() === bvSelectedDate.getTime();
    let cls = 'cal-day';
    if (isSel)    cls += ' selected';
    else if (isToday) cls += ' today';

    // Dots for booked rooms
    let dots = '';
    if (bookingsByDate[ds]) {
      const colors = [...bookingsByDate[ds]].map(rid => {
        const r = ROOMS.find(r => r.id === parseInt(rid));
        return r ? r.accentColor : '#6b7280';
      });
      dots = `<span class="day-dots">${colors.map(c=>`<span class="dot" style="background:${c}"></span>`).join('')}</span>`;
    }

    html += `<div class="${cls}" data-date="${ds}">${d}${dots}</div>`;
  }
  $('bv-cal-days').innerHTML = html;

  $('bv-cal-days').querySelectorAll('.cal-day:not(.empty)').forEach(node => {
    node.addEventListener('click', () => {
      const [y,m,d] = node.dataset.date.split('-').map(Number);
      bvSelectedDate = new Date(y, m-1, d);
      bvRenderCalendar(bvViewDate);
      bvLoadDay(bvSelectedDate);
    });
  });
}

$('bv-cal-prev').addEventListener('click', () =>
  bvRenderCalendar(new Date(bvViewDate.getFullYear(), bvViewDate.getMonth()-1, 1)));
$('bv-cal-next').addEventListener('click', () =>
  bvRenderCalendar(new Date(bvViewDate.getFullYear(), bvViewDate.getMonth()+1, 1)));

/* ── Day bookings panel ── */
async function bvLoadDay(date) {
  bvSelectedDate = date;
  const ds = dateStr(date);

  $('bv-day-title').textContent = fmtDate(date);
  $('bv-day-sub').textContent   = 'Loading…';
  $('bv-loading').classList.remove('hidden');
  $('bv-empty').classList.add('hidden');
  $('bv-cards').innerHTML = '';

  // Fetch from sheets if connected
  if (state.scriptUrl && !state.demoMode) {
    try {
      $('bv-refresh').classList.add('spinning');
      const res  = await fetch(`${state.scriptUrl}?action=getDay&date=${ds}`);
      const data = await res.json();
      if (data.bookings) {
        // Merge fetched bookings into local state (avoid duplicates)
        data.bookings.forEach(b => {
          const exists = state.allBookings.some(
            x => x.date === b.date && x.roomId == b.roomId && x.time === b.time
          );
          if (!exists) state.allBookings.push(b);
        });
        bvRenderCalendar(bvViewDate);
      }
    } catch(e) {}
    $('bv-refresh').classList.remove('spinning');
  }

  $('bv-loading').classList.add('hidden');

  const dayBookings = state.allBookings
    .filter(b => b.date === ds)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (dayBookings.length === 0) {
    $('bv-day-sub').textContent = 'No bookings';
    $('bv-empty').classList.remove('hidden');
    return;
  }

  $('bv-day-sub').textContent = `${dayBookings.length} booking${dayBookings.length > 1 ? 's' : ''}`;
  bvRenderCards(dayBookings);
}

function bvRenderCards(bookings) {
  const container = $('bv-cards');
  container.innerHTML = '';

  bookings.forEach(b => {
    const room = ROOMS.find(r => r.id === parseInt(b.roomId)) || ROOMS[0];
    const end  = b.endTime || calcEndTime(b.time, b.durationMins || 60);
    const dur  = b.durationMins ? fmtDuration(b.durationMins) : '';

    const card = document.createElement('div');
    card.className = 'bv-card-item';
    card.innerHTML = `
      <div class="bv-card-accent" style="background:${room.accentColor}"></div>
      <div class="bv-card-body">
        <div class="bv-card-icon" style="background:${room.color}">${room.emoji}</div>
        <div class="bv-card-info">
          <div class="bv-card-room">${room.name}</div>
          <div class="bv-card-meta">
            <span>👤 ${b.name || '—'}</span>
            ${b.team      ? `<span>🏢 ${b.team}</span>`      : ''}
            ${b.attendees ? `<span>👥 ${b.attendees} people</span>` : ''}
            ${b.purpose   ? `<span>📝 ${b.purpose}</span>`   : ''}
          </div>
        </div>
        <div class="bv-card-time">
          ${b.time} – ${end}
          <small>${dur}</small>
        </div>
      </div>`;
    container.appendChild(card);
  });
}

$('bv-refresh').addEventListener('click', () => {
  if (bvSelectedDate) bvLoadDay(bvSelectedDate);
});

/* ══════════════════════════════════════════════════════════════
   CONFIG MODAL
   ══════════════════════════════════════════════════════════════ */
$('cfg-save').addEventListener('click', () => {
  const url = $('cfg-url').value.trim();
  if (!url.startsWith('https://script.google.com')) {
    alert('Please paste a valid Google Apps Script URL.');
    return;
  }
  state.scriptUrl = url;
  localStorage.setItem('scriptUrl', url);
  $('config-overlay').classList.add('hidden');
});

$('cfg-demo').addEventListener('click', () => {
  state.demoMode = true;
  $('config-overlay').classList.add('hidden');
});

/* ══════════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════════ */
// URL hardcoded — no setup modal needed
renderCalendar(new Date());
