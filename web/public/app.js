const { DRONE_ID, API_URL } = window.APP_CONFIG;
const $ = (s) => document.querySelector(s);
const KEY = 'drone_config';
let page = 1;

async function api(path, opts) {
  const r = await fetch(API_URL + path, opts);
  if (!r.ok) {
    throw new Error((await r.json().catch(() => ({}))).error || 'HTTP ' + r.status);
  }
  return r;
}

const getCfg = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
};

// Page #1: Load Config + Status
async function loadConfig() {
  const box = $('#cfg');
  box.className = 'grid';
  box.textContent = 'Reading the sands...';

  try {
  
    const c = await (await api('/configs/' + DRONE_ID)).json();

    
    try {
      const status = await (await api('/status/' + DRONE_ID)).json();
      c.condition = status.condition;
    } catch (e) {
      c.condition = 'Unavailable';
      console.error('Could not load drone status:', e.message);
    }

    
    localStorage.setItem(KEY, JSON.stringify(c));

   
    const fields = [
      ['Drone ID', c.drone_id],
      ['Drone Name', c.drone_name],
      ['Condition', c.condition],
      ['Light', c.light],
      ['Country', c.country],
      ['Weight', c.weight],
    ];

    box.textContent = '';

    fields.forEach(([k, v]) => {
      const d = document.createElement('div');
      d.className = 'kv';

      const label = document.createElement('span');
      label.textContent = k;

      const value = document.createElement('b');
      value.textContent = v ?? '-';

      d.append(label, value);
      box.append(d);
    });

    return c;
  } catch (e) {
    box.textContent = 'Could not load config: ' + e.message;
    box.className = 'grid err';
    return null;
  }
}

// Page #2: POST /logs
$('#f').onsubmit = async (e) => {
  e.preventDefault();

  const m = $('#msg');
  m.className = '';

  const celsius = parseFloat($('#t').value);

  if (isNaN(celsius)) {
    m.className = 'err';
    return (m.textContent = 'Enter a valid temperature.');
  }

  const c = getCfg() || (await loadConfig());

  if (!c) {
    m.className = 'err';
    return (m.textContent = 'Config is missing. Open the Config page and retry.');
  }

  m.textContent = 'Sending...';

  try {
    await api('/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        drone_id: c.drone_id,
        drone_name: c.drone_name,
        country: c.country,
        celsius,
      }),
    });

    m.textContent = 'Data submitted.';
    e.target.reset();
    page = 1;
  } catch (x) {
    m.className = 'err';
    m.textContent = 'Submit failed: ' + x.message;
  }
};

// Page #3: Table + Pagination
function formatThaiTime(dateString) {
  if (!dateString) return '-';

  const date = new Date(dateString);

  return date.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

async function loadLogs() {
  const tb = $('#rows');

  const note = (t, cls) => {
    tb.textContent = '';
    const td = tb.insertRow().insertCell();
    td.colSpan = 5;
    td.textContent = t;
    td.className = cls || '';
  };

  note('Consulting the archive...');

  try {
    
    const config = getCfg() || (await loadConfig());

    if (!config || !config.drone_id) {
      note('Could not load drone config.', 'err');
      $('#pg').textContent = '';
      $('#prev').disabled = true;
      $('#next').disabled = true;
      return;
    }

    const r = await api(
      `/logs/${config.drone_id}?page=${page}`
    );

    const rows = await r.json();
    const total = +r.headers.get('X-Total-Pages') || 1;

    if (!rows.length) {
      note('No logs yet. Submit a temperature first.');
    } else {
      tb.textContent = '';

      rows.forEach((l) => {
        const tr = tb.insertRow();

        [
          formatThaiTime(l.created),
          l.country,
          l.drone_id,
          l.drone_name,
          l.celsius,
        ].forEach((v) => {
          tr.insertCell().textContent = v ?? '-';
        });
      });
    }

   
    $('#pg').textContent = `Page ${page} / ${total}`;
    $('#prev').disabled = page <= 1;
    $('#next').disabled = page >= total;

  } catch (e) {
    note('Could not load logs: ' + e.message, 'err');
    $('#pg').textContent = '';
    $('#prev').disabled = true;
    $('#next').disabled = true;
  }
}
$('#prev').onclick = () => {
  if (page > 1) {
    page--;
    loadLogs();
  }
};

$('#next').onclick = () => {
  page++;
  loadLogs();
};


function show() {
  const h = (location.hash || '#config').slice(1);

  document.querySelectorAll('section').forEach((s) => {
    s.hidden = s.id !== h;
  });

  document.querySelectorAll('nav a').forEach((a) => {
    a.classList.toggle('on', a.hash === '#' + h);
  });

  if (h === 'config') loadConfig();
  if (h === 'logs') loadLogs();
}

addEventListener('hashchange', show);
show();

$('#sub').textContent = '· Unit ' + DRONE_ID;
