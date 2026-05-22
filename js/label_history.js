const LABEL_HISTORY_STORAGE_KEY = 'bleweble_label_history';
const LABEL_HISTORY_MAX_ENTRIES = 50;

function readLabelHistory() {
  try {
    const raw = localStorage.getItem(LABEL_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to read label history:', err);
    return [];
  }
}

function writeLabelHistory(entries) {
  try {
    localStorage.setItem(LABEL_HISTORY_STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.warn('Failed to save label history:', err);
  }
}

function getPaddingMmFromDom() {
  const read = (id) => {
    const el = document.getElementById(id);
    return el ? parseFloat(el.value) || 0 : 0;
  };
  return {
    top: read('paddingTop'),
    bottom: read('paddingBottom'),
    left: read('paddingLeft'),
    right: read('paddingRight')
  };
}

function applyPaddingMmToDom(paddingMm) {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value ?? 0;
  };
  if (!paddingMm) return;
  set('paddingTop', paddingMm.top);
  set('paddingBottom', paddingMm.bottom);
  set('paddingLeft', paddingMm.left);
  set('paddingRight', paddingMm.right);
}

function deriveLabelTitle(snapshot) {
  const objects = snapshot?.canvas?.objects;
  if (!Array.isArray(objects)) return 'Label';
  for (const obj of objects) {
    if (obj.type === 'i-text' && obj.text) {
      const text = String(obj.text).trim().replace(/\s+/g, ' ');
      if (text) return text.length > 48 ? text.slice(0, 48) + '…' : text;
    }
  }
  return 'Label';
}

function makeLabelThumbnail() {
  const canvas = window.getFabricCanvas?.();
  if (!canvas) return null;
  try {
    const maxWidth = 160;
    const multiplier = Math.min(1, maxWidth / canvas.getWidth());
    return canvas.toDataURL({ format: 'png', multiplier });
  } catch (err) {
    console.warn('Failed to create label thumbnail:', err);
    return null;
  }
}

function saveLabelToHistory() {
  if (!window.fabricEditor?.exportLabelSnapshot) return;
  const snapshot = window.fabricEditor.exportLabelSnapshot();
  if (!snapshot) return;

  const entry = {
    id: String(Date.now()),
    savedAt: Date.now(),
    title: deriveLabelTitle(snapshot),
    thumbnail: makeLabelThumbnail(),
    label: {
      ...snapshot,
      paddingMm: getPaddingMmFromDom()
    }
  };

  const history = readLabelHistory();
  history.unshift(entry);
  if (history.length > LABEL_HISTORY_MAX_ENTRIES) {
    history.length = LABEL_HISTORY_MAX_ENTRIES;
  }
  writeLabelHistory(history);

  if (typeof window.renderLabelHistory === 'function') {
    window.renderLabelHistory();
  }
}

function loadLabelFromHistory(id) {
  const entry = readLabelHistory().find((e) => e.id === id);
  if (!entry?.label || !window.fabricEditor?.importLabelSnapshot) return;

  window.fabricEditor.importLabelSnapshot(entry.label, () => {
    applyPaddingMmToDom(entry.label.paddingMm);

    if (typeof window.updateDimensionInputs === 'function') {
      window.updateDimensionInputs();
    }

    const textBtn = document.querySelector('.label-type-btn[data-type="text"]');
    if (textBtn) textBtn.click();

    const fabricCanvas = window.getFabricCanvas?.();
    if (fabricCanvas) {
      fabricCanvas.fire('object:added');
      fabricCanvas.fire('canvas:resized', {
        width: entry.label.width,
        height: entry.label.height
      });
    }
  });
}

function formatHistoryDate(timestamp) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function renderLabelHistory() {
  const listEl = document.getElementById('historyList');
  const emptyEl = document.getElementById('historyEmpty');
  if (!listEl) return;

  const history = readLabelHistory();
  listEl.innerHTML = '';

  if (emptyEl) {
    emptyEl.style.display = history.length === 0 ? 'block' : 'none';
  }

  history.forEach((entry) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'history-item';
    item.dataset.id = entry.id;
    item.title = 'Open in editor';

    const thumb = document.createElement('div');
    thumb.className = 'history-item-thumb';
    if (entry.thumbnail) {
      const img = document.createElement('img');
      img.src = entry.thumbnail;
      img.alt = '';
      thumb.appendChild(img);
    } else {
      thumb.classList.add('history-item-thumb-empty');
      thumb.textContent = '—';
    }

    const meta = document.createElement('div');
    meta.className = 'history-item-meta';

    const title = document.createElement('span');
    title.className = 'history-item-title';
    title.textContent = entry.title || 'Label';

    const date = document.createElement('span');
    date.className = 'history-item-date';
    date.textContent = formatHistoryDate(entry.savedAt);

    meta.appendChild(title);
    meta.appendChild(date);
    item.appendChild(thumb);
    item.appendChild(meta);

    item.addEventListener('click', () => loadLabelFromHistory(entry.id));
    listEl.appendChild(item);
  });
}

window.saveLabelToHistory = saveLabelToHistory;
window.renderLabelHistory = renderLabelHistory;
window.loadLabelFromHistory = loadLabelFromHistory;
