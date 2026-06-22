const STORAGE_KEYS = {
  crear: 'tm_webhook_crear',
  listar: 'tm_webhook_listar',
  gestionar: 'tm_webhook_gestionar',
};

const ESTADO_OPTIONS = ['Pendiente', 'En progreso', 'Completada'];
const PRIORIDAD_OPTIONS = ['Baja', 'Media', 'Alta'];

function getUrl(key) {
  return localStorage.getItem(STORAGE_KEYS[key]) || '';
}

function setUrl(key, value) {
  localStorage.setItem(STORAGE_KEYS[key], value);
}

function slug(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_');
}

function showStatus(text, type) {
  const el = document.getElementById('status-message');
  el.textContent = text;
  el.className = type || '';
  el.classList.remove('hidden');
}

function clearStatus() {
  document.getElementById('status-message').classList.add('hidden');
}

function loadSettingsIntoForm() {
  document.getElementById('url-crear').value = getUrl('crear');
  document.getElementById('url-listar').value = getUrl('listar');
  document.getElementById('url-gestionar').value = getUrl('gestionar');
}

function initSettingsPanel() {
  const panel = document.getElementById('settings-panel');
  document.getElementById('settings-toggle').addEventListener('click', () => {
    panel.classList.toggle('hidden');
  });
  loadSettingsIntoForm();
  document.getElementById('save-settings').addEventListener('click', () => {
    setUrl('crear', document.getElementById('url-crear').value.trim());
    setUrl('listar', document.getElementById('url-listar').value.trim());
    setUrl('gestionar', document.getElementById('url-gestionar').value.trim());
    panel.classList.add('hidden');
    loadTasks();
  });
}

async function loadTasks() {
  const url = getUrl('listar');
  if (!url) {
    showStatus('Configurá la URL de "Listar tareas" en ⚙️ Configuración.', 'error');
    return;
  }
  showStatus('Cargando tareas...', 'loading');
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const tasks = await res.json();
    renderTasks(Array.isArray(tasks) ? tasks : []);
    clearStatus();
  } catch (err) {
    showStatus(`Error al listar tareas: ${err.message}`, 'error');
  }
}

async function createTask(text) {
  const url = getUrl('crear');
  if (!url) {
    showStatus('Configurá la URL de "Crear tarea" en ⚙️ Configuración.', 'error');
    return;
  }
  showStatus('Creando tarea...', 'loading');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tarea: text }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await loadTasks();
  } catch (err) {
    showStatus(`Error al crear tarea: ${err.message}`, 'error');
  }
}

async function manageTask(payload) {
  const url = getUrl('gestionar');
  if (!url) {
    showStatus('Configurá la URL de "Gestionar tarea" en ⚙️ Configuración.', 'error');
    return;
  }
  showStatus('Guardando cambios...', 'loading');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await loadTasks();
  } catch (err) {
    showStatus(`Error al guardar: ${err.message}`, 'error');
  }
}

function renderTasks(tasks) {
  const list = document.getElementById('task-list');
  list.innerHTML = '';

  if (tasks.length === 0) {
    list.innerHTML = '<li>No hay tareas todavía.</li>';
    return;
  }

  for (const task of tasks) {
    list.appendChild(buildTaskCard(task));
  }
}

function buildTaskCard(task) {
  const li = document.createElement('li');
  li.className = 'task-card';

  const top = document.createElement('div');
  top.className = 'task-card-top';

  const extra = [task.categoria, task.fecha_limite].filter(Boolean).join(' · ');

  const info = document.createElement('div');
  info.innerHTML = `
    <p class="task-title">${escapeHtml(task.tarea || '(sin título)')}</p>
    <p class="task-description">${escapeHtml(task.notas || '')}</p>
    ${extra ? `<p class="task-extra">${escapeHtml(extra)}</p>` : ''}
    <div class="badges">
      <span class="badge status-${slug(task.estado)}">${escapeHtml(task.estado || '')}</span>
      <span class="badge priority-${slug(task.prioridad)}">${escapeHtml(task.prioridad || '')}</span>
    </div>
  `;

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const editBtn = document.createElement('button');
  editBtn.textContent = 'Editar';
  editBtn.addEventListener('click', () => toggleEditForm(li, task));

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Borrar';
  deleteBtn.className = 'btn-delete';
  deleteBtn.addEventListener('click', () => {
    if (confirm(`¿Borrar la tarea "${task.tarea}"?`)) {
      manageTask({ action: 'delete', id: task.id });
    }
  });

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  top.appendChild(info);
  top.appendChild(actions);
  li.appendChild(top);

  return li;
}

function toggleEditForm(li, task) {
  const existing = li.querySelector('.task-edit-form');
  if (existing) {
    existing.remove();
    return;
  }

  const form = document.createElement('div');
  form.className = 'task-edit-form';
  form.innerHTML = `
    <input type="text" class="edit-tarea" placeholder="Tarea" value="${escapeHtml(task.tarea || '')}">
    <textarea class="edit-notas" placeholder="Notas" rows="2">${escapeHtml(task.notas || '')}</textarea>
    <input type="text" class="edit-categoria" placeholder="Categoría" value="${escapeHtml(task.categoria || '')}">
    <input type="date" class="edit-fecha" value="${escapeHtml(task.fecha_limite || '')}">
    <select class="edit-estado">
      ${ESTADO_OPTIONS.map(s => `<option value="${s}" ${s === task.estado ? 'selected' : ''}>${s}</option>`).join('')}
    </select>
    <select class="edit-prioridad">
      ${PRIORIDAD_OPTIONS.map(p => `<option value="${p}" ${p === task.prioridad ? 'selected' : ''}>${p}</option>`).join('')}
    </select>
    <div class="task-edit-actions">
      <button class="btn-save">Guardar</button>
      <button class="btn-cancel">Cancelar</button>
    </div>
  `;

  form.querySelector('.btn-cancel').addEventListener('click', () => form.remove());
  form.querySelector('.btn-save').addEventListener('click', () => {
    manageTask({
      action: 'update',
      id: task.id,
      tarea: form.querySelector('.edit-tarea').value.trim(),
      notas: form.querySelector('.edit-notas').value.trim(),
      categoria: form.querySelector('.edit-categoria').value.trim(),
      fecha_limite: form.querySelector('.edit-fecha').value,
      estado: form.querySelector('.edit-estado').value,
      prioridad: form.querySelector('.edit-prioridad').value,
    });
  });

  li.appendChild(form);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function initNewTaskForm() {
  document.getElementById('new-task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const textarea = document.getElementById('new-task-text');
    const text = textarea.value.trim();
    if (!text) return;
    createTask(text);
    textarea.value = '';
  });
}

function init() {
  initSettingsPanel();
  initNewTaskForm();
  document.getElementById('refresh-tasks').addEventListener('click', loadTasks);
  if (getUrl('listar')) {
    loadTasks();
  }
}

document.addEventListener('DOMContentLoaded', init);
