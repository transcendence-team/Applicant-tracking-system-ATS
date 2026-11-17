const $ = id => document.getElementById(id);
let token = '';
let identity = null;
let page = 1;
let total = 0;
let busy = false;
const jobCache = new Map();
const isStaff = () => ['ROLE_HR', 'ROLE_ADMIN'].includes(identity?.role);

function notice(message, type = '') {
  $('notice').textContent = message;
  $('notice').className = `notice ${type}`;
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, /token|password|secret/i.test(key) ? '[hidden]' : redact(item)]));
  }
  return value;
}

async function api(url, { method = 'GET', body, publicRequest = false } = {}) {
  const headers = {};
  if (token && !publicRequest) headers.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const start = performance.now();
  try {
    const response = await fetch(url, {
      method, headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    $('request-label').textContent = `${method} ${url} · ${Math.round(performance.now() - start)} ms`;
    $('response-status').textContent = `${response.status} ${response.statusText}`;
    $('response').textContent = data === null ? 'No response body.' : JSON.stringify(redact(data), null, 2);
    if (!response.ok) {
      if (response.status === 401 && !publicRequest) setSession('');
      throw new Error(data?.message ?? data?.error ?? `Request failed (${response.status}).`);
    }
    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      $('response-status').textContent = 'Connection failed';
      $('response').textContent = 'Could not reach the API. Check your Docker services and HTTPS certificate.';
    }
    throw error;
  }
}

function setSession(value) {
  token = value;
  identity = null;
  if (value) {
    try {
      const part = value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      identity = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(part), char => char.charCodeAt(0))));
      if (!identity.exp || identity.exp * 1000 <= Date.now()) throw new Error('Expired login response.');
    } catch {
      token = '';
      identity = null;
      throw new Error('Login returned an invalid or expired token.');
    }
  }
  // Decoded claims only control the UI; authorization is enforced by the API.
  $('login-form').hidden = Boolean(identity);
  $('session').hidden = !identity;
  $('session-badge').textContent = identity ? 'Connected' : 'Signed out';
  $('session-email').textContent = identity?.email ?? '';
  $('session-role').textContent = identity?.role?.replace('ROLE_', '') ?? '';
  $('permission-hint').textContent = isStaff() ? 'Changes are saved to your development database.' : 'Sign in as HR or admin to make changes.';
  syncControls();
  renderJobs();
}

function syncControls() {
  const hasId = Boolean($('job-form').elements.id.value);
  $('save-job').disabled = busy || !isStaff();
  $('delete-job').disabled = busy || !isStaff() || !hasId;
  $('upload-button').disabled = busy || identity?.role !== 'ROLE_APPLICANT';
  $('save-job').textContent = hasId ? 'Save changes →' : 'Create posting →';
  $('editor-title').textContent = hasId ? 'Update a job posting' : 'Create a job posting';
}

async function action(message, callback) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button').forEach(button => { button.dataset.wasDisabled = String(button.disabled); button.disabled = true; });
  notice(message, 'busy');
  try { await callback(); } catch (error) { notice(error.message, 'error'); }
  finally {
    busy = false;
    document.querySelectorAll('button').forEach(button => {
      if ('wasDisabled' in button.dataset) button.disabled = button.dataset.wasDisabled === 'true';
    });
    syncControls();
    renderJobs();
    $('previous').disabled = page <= 1;
    $('next').disabled = page * 10 >= total;
  }
}

function renderJobs() {
  const list = $('job-list');
  list.replaceChildren();
  if (!jobCache.size) {
    const message = document.createElement('p');
    message.className = 'empty';
    message.textContent = 'No open jobs on this page. Create an OPEN posting to get started.';
    list.append(message);
  }
  for (const job of jobCache.values()) {
    const row = document.createElement('article');
    row.className = 'job-card';
    const details = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = job.title;
    const meta = document.createElement('div');
    meta.className = 'job-meta';
    meta.textContent = `#${job.id} · ${job.location || 'Location not specified'} · ${(job.employmentType || 'Unspecified').replaceAll('_', ' ')}`;
    details.append(title, meta);
    const buttons = document.createElement('div');
    buttons.className = 'job-actions';
    const view = document.createElement('button');
    view.className = 'text-button';
    view.textContent = 'View ↗';
    view.addEventListener('click', () => action('Reading posting…', async () => {
      await api(`/api/ats/jobs/${job.id}`);
      notice(`Job #${job.id} loaded. See its full response below.`);
    }));
    const edit = document.createElement('button');
    edit.className = 'secondary';
    edit.textContent = 'Edit';
    edit.disabled = !isStaff() || (identity?.role !== 'ROLE_ADMIN' && job.createdBy !== identity?.sub);
    edit.addEventListener('click', () => fillJob(job));
    buttons.append(view, edit);
    row.append(details, buttons);
    list.append(row);
  }
  $('job-count').textContent = total;
  $('page-info').textContent = `Page ${page} of ${Math.max(1, Math.ceil(total / 10))}`;
  $('previous').disabled = page <= 1;
  $('next').disabled = page * 10 >= total;
}

async function loadJobs(inspect = true) {
  // Background refreshes preserve the response from a create/update/delete action.
  const data = inspect ? await api(`/api/ats/jobs?page=${page}&limit=10`) : await fetch(`/api/ats/jobs?page=${page}&limit=10`, { cache: 'no-store' }).then(async response => {
    if (!response.ok) throw new Error('Posting saved, but refreshing the board failed. Try Refresh.');
    return response.json();
  });
  total = data.total;
  jobCache.clear();
  data.items.forEach(job => jobCache.set(job.id, job));
  renderJobs();
}

function fillJob(job) {
  const form = $('job-form');
  form.reset();
  for (const name of ['id', 'title', 'description', 'location', 'employmentType', 'status', 'salaryMin', 'salaryMax']) form.elements[name].value = job[name] ?? '';
  if (job.deadline) {
    const date = new Date(job.deadline);
    form.elements.deadline.value = new Date(date - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  syncControls();
  $('editor-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

$('login-form').addEventListener('submit', event => {
  event.preventDefault();
  action('Signing in…', async () => {
    const form = new FormData(event.target);
    const data = await api('/api/auth/login', { method: 'POST', publicRequest: true, body: { email: form.get('email'), password: form.get('password') } });
    setSession(data.accessToken);
    event.target.reset();
    notice(`Signed in as ${identity.role.replace('ROLE_', '')}. You can now test your permitted actions.`);
  });
});
$('register').addEventListener('click', () => {
  const form = $('login-form');
  if (!form.reportValidity()) return;
  action('Creating applicant account…', async () => {
    await api('/api/auth/register', { method: 'POST', publicRequest: true, body: { email: form.elements.email.value, password: form.elements.password.value } });
    notice('Applicant account created. Click Sign in with the same credentials.');
  });
});
$('logout').addEventListener('click', () => { setSession(''); notice('Signed out. Your session token has been cleared.'); });
$('health').addEventListener('click', () => action('Checking API connection…', async () => { await api('/api/ats/health'); notice('Connected. ATS API and PostgreSQL are responding.'); }));
$('refresh').addEventListener('click', () => action('Refreshing job board…', async () => { await loadJobs(); notice('Job board refreshed.'); }));
for (const [id, change] of [['previous', -1], ['next', 1]]) $(id).addEventListener('click', () => action('Loading postings…', async () => { page += change; await loadJobs(); notice('Job board refreshed.'); }));
$('job-form').elements.id.addEventListener('input', syncControls);
$('clear').addEventListener('click', () => { $('job-form').reset(); syncControls(); });
$('job-form').addEventListener('submit', event => {
  event.preventDefault();
  action('Saving posting…', async () => {
    const form = event.target.elements;
    const data = { title: form.title.value.trim(), description: form.description.value || null, location: form.location.value || null,
      employmentType: form.employmentType.value || null, status: form.status.value,
      salaryMin: form.salaryMin.value === '' ? null : Number(form.salaryMin.value), salaryMax: form.salaryMax.value === '' ? null : Number(form.salaryMax.value),
      deadline: form.deadline.value ? new Date(form.deadline.value).toISOString() : null };
    if (data.salaryMin !== null && data.salaryMax !== null && data.salaryMin > data.salaryMax) throw new Error('Minimum salary must not exceed maximum salary.');
    const id = form.id.value;
    const saved = await api(id ? `/api/ats/jobs/${id}` : '/api/ats/jobs', { method: id ? 'PATCH' : 'POST', body: data });
    fillJob(saved);
    page = 1;
    await loadJobs(false);
    notice(`Job #${saved.id} ${id ? 'updated' : 'created'} successfully.${saved.status !== 'OPEN' ? ' It is hidden from the public board because its status is ' + saved.status + '.' : ''}`);
  });
});
$('delete-job').addEventListener('click', () => {
  const id = $('job-form').elements.id.value;
  if (!id || !confirm(`Delete job #${id}? This removes it from your development database.`)) return;
  action('Deleting posting…', async () => {
    await api(`/api/ats/jobs/${id}`, { method: 'DELETE' });
    $('job-form').reset();
    page = 1;
    await loadJobs(false);
    notice(`Job #${id} deleted.`);
  });
});
$('pdf').addEventListener('change', () => { $('file-name').textContent = $('pdf').files[0]?.name ?? 'No file selected'; });
$('upload-form').addEventListener('submit', event => {
  event.preventDefault();
  action('Uploading PDF and waiting for M3 to parse it…', async () => {
    const file = $('pdf').files[0];
    if (!file || !/\.pdf$/i.test(file.name)) throw new Error('Choose a PDF file.');
    if (file.size > 10 * 1024 * 1024) throw new Error('The PDF must be 10 MB or smaller.');
    const form = new FormData();
    form.append('file', file);
    const result = await api('/api/ats/resumes', { method: 'POST', body: form });
    event.target.reset();
    $('file-name').textContent = 'No file selected';
    notice(`Resume #${result.resume.id} parsed and saved for candidate #${result.candidate.id}.`);
  });
});
action('Loading job board…', async () => { await loadJobs(); notice('Ready. Sign in to test protected actions.'); });
