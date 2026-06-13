// ---- State ----
let editingId = null;
let pendingImageBlob = null;
let searchQuery = '';

// ---- Bootstrap modal instance ----
let itemModal;

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  itemModal = new bootstrap.Modal(document.getElementById('itemModal'));
  await renderList();
  bindEvents();
});

// ---- Event binding ----
function bindEvents() {
  // New item button
  document.getElementById('btnNew').addEventListener('click', openNew);

  // Save in modal
  document.getElementById('btnSave').addEventListener('click', saveItem);

  // Delete in modal
  document.getElementById('btnDelete').addEventListener('click', deleteItem);

  // Image picker
  document.getElementById('imageInput').addEventListener('change', handleImagePick);

  // Image remove
  document.getElementById('btnRemoveImage').addEventListener('click', removeImage);

  // Search
  document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase();
    renderList();
  });

  // Import CSV
  document.getElementById('csvInput').addEventListener('change', handleCSVImport);
  document.getElementById('btnImportCSV').addEventListener('click', () => document.getElementById('csvInput').click());

  // Export CSV
  document.getElementById('btnExportCSV').addEventListener('click', handleCSVExport);

  // Export ZIP
  document.getElementById('btnExportZip').addEventListener('click', handleZipExport);

  // Copy Kijiji
  document.getElementById('btnCopyKijiji').addEventListener('click', handleCopyKijiji);

  // Copy Craigslist
  document.getElementById('btnCopyCraigslist').addEventListener('click', handleCopyCraigslist);

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); openNew(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (editingId !== null || document.getElementById('itemModal').classList.contains('show')) saveItem(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); document.getElementById('searchInput').focus(); }
  });

  // Modal close → reset
  document.getElementById('itemModal').addEventListener('hidden.bs.modal', resetModal);
}

// ---- Modal ----
function openNew() {
  editingId = null;
  pendingImageBlob = null;
  resetForm();
  document.getElementById('modalTitle').textContent = 'New Item';
  document.getElementById('btnDelete').classList.add('d-none');
  itemModal.show();
}

async function openEdit(id) {
  const item = await DbApi.getItem(id);
  if (!item) return;
  editingId = id;
  pendingImageBlob = null;

  document.getElementById('modalTitle').textContent = 'Edit Item';
  document.getElementById('fieldName').value = item.name || '';
  document.getElementById('fieldSku').value = item.sku || '';
  document.getElementById('fieldPrice').value = item.price || '';
  document.getElementById('fieldCondition').value = item.condition || '';
  document.getElementById('fieldCategory').value = item.category || '';
  document.getElementById('fieldQuantity').value = item.quantity || 1;
  document.getElementById('fieldDescription').value = item.description || '';

  const blob = await DbApi.getImage(id);
  if (blob) {
    const url = URL.createObjectURL(blob);
    showImagePreview(url);
  } else {
    clearImagePreview();
  }

  document.getElementById('btnDelete').classList.remove('d-none');
  itemModal.show();
}

function resetModal() {
  editingId = null;
  pendingImageBlob = null;
  resetForm();
}

function resetForm() {
  document.getElementById('itemForm').reset();
  clearImagePreview();
}

// ---- CRUD ----
async function saveItem() {
  const name = document.getElementById('fieldName').value.trim();
  if (!name) {
    document.getElementById('fieldName').classList.add('is-invalid');
    return;
  }
  document.getElementById('fieldName').classList.remove('is-invalid');

  const data = {
    name,
    sku: document.getElementById('fieldSku').value.trim(),
    price: parseFloat(document.getElementById('fieldPrice').value) || 0,
    condition: document.getElementById('fieldCondition').value,
    category: document.getElementById('fieldCategory').value.trim(),
    quantity: parseInt(document.getElementById('fieldQuantity').value) || 1,
    description: document.getElementById('fieldDescription').value.trim()
  };

  if (editingId !== null) {
    await DbApi.updateItem(editingId, data);
    if (pendingImageBlob) await DbApi.saveImage(editingId, pendingImageBlob);
  } else {
    const id = await DbApi.addItem(data);
    if (pendingImageBlob) await DbApi.saveImage(id, pendingImageBlob);
  }

  itemModal.hide();
  await renderList();
}

async function deleteItem() {
  if (editingId === null) return;
  if (!confirm('Delete this item?')) return;
  await DbApi.deleteItem(editingId);
  itemModal.hide();
  await renderList();
}

// ---- Image handling ----
async function handleImagePick(e) {
  const file = e.target.files[0];
  if (!file) return;
  pendingImageBlob = await Core.resizeImage(file);
  const url = URL.createObjectURL(pendingImageBlob);
  showImagePreview(url);
}

function showImagePreview(url) {
  const preview = document.getElementById('imagePreview');
  preview.src = url;
  preview.classList.remove('d-none');
  document.getElementById('btnRemoveImage').classList.remove('d-none');
  document.getElementById('imagePlaceholder').classList.add('d-none');
}

function clearImagePreview() {
  const preview = document.getElementById('imagePreview');
  preview.src = '';
  preview.classList.add('d-none');
  document.getElementById('btnRemoveImage').classList.add('d-none');
  document.getElementById('imagePlaceholder').classList.remove('d-none');
  document.getElementById('imageInput').value = '';
}

async function removeImage() {
  pendingImageBlob = null;
  clearImagePreview();
  if (editingId !== null) await DbApi.deleteImage(editingId);
}

// ---- Render list ----
async function renderList() {
  const all = await DbApi.getAllItems();
  const filtered = searchQuery
    ? all.filter(i =>
        i.name.toLowerCase().includes(searchQuery) ||
        (i.sku || '').toLowerCase().includes(searchQuery) ||
        (i.description || '').toLowerCase().includes(searchQuery) ||
        (i.category || '').toLowerCase().includes(searchQuery)
      )
    : all;

  const tbody = document.getElementById('itemTableBody');
  const empty = document.getElementById('emptyState');

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('d-none');
    return;
  }
  empty.classList.add('d-none');

  const rows = await Promise.all(filtered.map(async item => {
    const blob = await DbApi.getImage(item.id);
    const thumb = blob
      ? `<img src="${URL.createObjectURL(blob)}" class="thumb" alt="">`
      : `<span class="thumb-placeholder"><i class="bi bi-image text-secondary"></i></span>`;
    return `<tr class="item-row" data-id="${item.id}" role="button">
      <td>${thumb}</td>
      <td class="fw-semibold">${esc(item.name)}</td>
      <td>${esc(item.sku || '')}</td>
      <td>$${parseFloat(item.price || 0).toFixed(2)}</td>
      <td>${esc(item.condition || '')}</td>
      <td>${item.quantity || 1}</td>
    </tr>`;
  }));

  tbody.innerHTML = rows.join('');
  tbody.querySelectorAll('.item-row').forEach(row => {
    row.addEventListener('click', () => openEdit(Number(row.dataset.id)));
  });

  document.getElementById('itemCount').textContent = `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`;
}

// ---- Import / Export ----
async function handleCSVImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const count = await Core.importCSV(file);
    showToast(`Imported ${count} items`);
    await renderList();
  } catch (err) {
    showToast('Import failed: ' + err.message, 'danger');
  }
  e.target.value = '';
}

async function handleCSVExport() {
  const csv = await Core.exportCSV();
  download('inventory.csv', csv, 'text/csv');
}

async function handleZipExport() {
  const items = await DbApi.getAllItems();
  if (!items.length) { showToast('No items to export', 'warning'); return; }
  const blob = await Marketplace.buildZip(items);
  download('aaaa_export.zip', blob, 'application/zip');
}

async function handleCopyKijiji() {
  const items = await DbApi.getAllItems();
  if (!items.length) { showToast('No items', 'warning'); return; }
  await navigator.clipboard.writeText(Marketplace.kijijiText(items));
  showToast('Kijiji text copied to clipboard');
}

async function handleCopyCraigslist() {
  const items = await DbApi.getAllItems();
  if (!items.length) { showToast('No items', 'warning'); return; }
  await navigator.clipboard.writeText(Marketplace.craigslistHTML(items));
  showToast('Craigslist HTML copied to clipboard');
}

// ---- Helpers ----
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function download(filename, data, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function showToast(msg, color = 'success') {
  const container = document.getElementById('toastContainer');
  const id = `toast-${Date.now()}`;
  container.insertAdjacentHTML('beforeend', `
    <div id="${id}" class="toast align-items-center text-bg-${color} border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body">${esc(msg)}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`);
  const el = document.getElementById(id);
  const t = new bootstrap.Toast(el, { delay: 3000 });
  t.show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}
