/* =============================================
   expenses.js — CRUD + localStorage
   ============================================= */

const DEFAULT_STORAGE_KEY = 'tripspend_expenses';

// ── DOM refs ──
const form          = document.getElementById('expenseForm');
const expenseName   = document.getElementById('expenseName');
const category      = document.getElementById('category');
const amount        = document.getElementById('amount');
const expenseDate   = document.getElementById('expenseDate');
const description   = document.getElementById('description');
const editId        = document.getElementById('editId');
const submitBtn     = document.getElementById('submitBtn');
const cancelBtn     = document.getElementById('cancelBtn');
const formTitle     = document.getElementById('formTitle');
const formSubtitle  = document.getElementById('formSubtitle');

const expensesBody  = document.getElementById('expensesBody');
const emptyState    = document.getElementById('emptyState');
const totalBar      = document.getElementById('totalBar');
const totalDisplay  = document.getElementById('totalDisplay');
const totalCount    = document.getElementById('totalCount');
const totalAmount   = document.getElementById('totalAmount');
const todayAmount   = document.getElementById('todayAmount');
const recordBadge   = document.getElementById('recordBadge');

const searchInput   = document.getElementById('searchInput');
const filterCat     = document.getElementById('filterCategory');
const clearAllBtn   = document.getElementById('clearAllBtn');

const deleteModal       = document.getElementById('deleteModal');
const deleteExpName     = document.getElementById('deleteExpenseName');
const confirmDeleteBtn  = document.getElementById('confirmDelete');
const cancelDeleteBtn   = document.getElementById('cancelDelete');

const clearModal        = document.getElementById('clearModal');
const confirmClearBtn   = document.getElementById('confirmClearAll');
const cancelClearBtn    = document.getElementById('cancelClearAll');

const toast = document.getElementById('toast');

// ── Helpers ──
function getStorageKey() {
  if (typeof AUTH !== 'undefined' && AUTH.isLoggedIn()) {
    return 'tripspend_expenses_' + AUTH.getSession().userId;
  }
  return DEFAULT_STORAGE_KEY;
}

function getExpenses() {
  return JSON.parse(localStorage.getItem(getStorageKey()) || '[]');
}
function saveExpenses(data) {
  localStorage.setItem(getStorageKey(), JSON.stringify(data));
}
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function formatDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}
function formatAmount(n) {
  return '₹' + parseFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function todayISO() {
  return new Date().toISOString().split('T')[0];
}
function showToast(msg, type = 'success') {
  toast.textContent = '';
  const icon = document.createElement('i');
  icon.className = type === 'success' ? 'fas fa-check-circle'
                 : type === 'error'   ? 'fas fa-times-circle'
                 :                      'fas fa-info-circle';
  toast.appendChild(icon);
  toast.appendChild(document.createTextNode(' ' + msg));
  toast.className = `toast show ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// ── Validation ──
function validate() {
  let ok = true;
  const setErr = (id, errId, msg) => {
    const el = document.getElementById(id);
    const er = document.getElementById(errId);
    if (msg) { el.classList.add('error'); er.textContent = msg; ok = false; }
    else      { el.classList.remove('error'); er.textContent = ''; }
  };
  setErr('expenseName', 'nameErr', expenseName.value.trim() ? '' : 'Expense name is required.');
  setErr('category',    'catErr',  category.value           ? '' : 'Please select a category.');
  setErr('amount',      'amtErr',  (amount.value && parseFloat(amount.value) > 0) ? '' : 'Enter a valid amount > 0.');
  setErr('expenseDate', 'dateErr', expenseDate.value        ? '' : 'Please select a date.');
  return ok;
}

// ── Render Table ──
function render() {
  const all      = getExpenses();
  const query    = (searchInput.value || '').toLowerCase().trim();
  const catFilter= filterCat.value;

  const filtered = all.filter(e => {
    const matchQ   = !query || e.name.toLowerCase().includes(query) || (e.description||'').toLowerCase().includes(query);
    const matchCat = !catFilter || e.category === catFilter;
    return matchQ && matchCat;
  });

  // Summary (full data, not filtered)
  const totalAmt = all.reduce((s, e) => s + parseFloat(e.amount), 0);
  const todayAmt = all.filter(e => e.date === todayISO()).reduce((s, e) => s + parseFloat(e.amount), 0);
  if (totalCount)  totalCount.textContent  = all.length;
  if (totalAmount) totalAmount.textContent = formatAmount(totalAmt);
  if (todayAmount) todayAmount.textContent = formatAmount(todayAmt);

  // Badge
  recordBadge.textContent = `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`;

  // Table rows
  expensesBody.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.style.display = 'block';
    totalBar.style.display   = 'none';
    return;
  }
  emptyState.style.display = 'none';
  totalBar.style.display   = 'flex';

  const filteredTotal = filtered.reduce((s, e) => s + parseFloat(e.amount), 0);
  totalDisplay.textContent = formatAmount(filteredTotal);

  filtered.forEach((exp, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><strong>${escHtml(exp.name)}</strong></td>
      <td><span class="cat-badge cat-${exp.category}">${escHtml(exp.category)}</span></td>
      <td class="amount-cell">${formatAmount(exp.amount)}</td>
      <td>${formatDate(exp.date)}</td>
      <td class="desc-cell" title="${escHtml(exp.description || '')}">${escHtml(exp.description || '—')}</td>
      <td>
        <div class="action-btns">
          <button class="btn-edit"   data-id="${exp.id}"><i class="fas fa-pen"></i> Edit</button>
          <button class="btn-delete" data-id="${exp.id}"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </td>
    `;
    expensesBody.appendChild(tr);
  });

  // Event delegation for edit / delete
  expensesBody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => startEdit(btn.dataset.id));
  });
  expensesBody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── ADD / EDIT submit ──
form.addEventListener('submit', e => {
  e.preventDefault();
  if (!validate()) return;

  const expenses = getExpenses();
  const id       = editId.value;

  if (id) {
    // UPDATE
    const idx = expenses.findIndex(e => e.id === id);
    if (idx !== -1) {
      expenses[idx] = {
        id,
        name:        expenseName.value.trim(),
        category:    category.value,
        amount:      parseFloat(amount.value),
        date:        expenseDate.value,
        description: description.value.trim(),
        updatedAt:   new Date().toISOString()
      };
      saveExpenses(expenses);
      showToast('Expense updated successfully!', 'success');
    }
    resetForm();
  } else {
    // CREATE
    const newExp = {
      id:          genId(),
      name:        expenseName.value.trim(),
      category:    category.value,
      amount:      parseFloat(amount.value),
      date:        expenseDate.value,
      description: description.value.trim(),
      createdAt:   new Date().toISOString()
    };
    expenses.push(newExp);
    saveExpenses(expenses);
    showToast('Expense added successfully!', 'success');
    resetForm();
  }
  render();
});

// ── START EDIT ──
function startEdit(id) {
  const expenses = getExpenses();
  const exp      = expenses.find(e => e.id === id);
  if (!exp) return;

  editId.value          = exp.id;
  expenseName.value     = exp.name;
  category.value        = exp.category;
  amount.value          = exp.amount;
  expenseDate.value     = exp.date;
  description.value     = exp.description || '';

  formTitle.innerHTML    = '<i class="fas fa-pen"></i> Edit Expense';
  formSubtitle.textContent = 'Modify the details below and click Update Expense.';
  submitBtn.innerHTML    = '<i class="fas fa-save"></i> Update Expense';
  cancelBtn.style.display = 'inline-flex';

  // Scroll to form
  document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── CANCEL EDIT ──
cancelBtn.addEventListener('click', resetForm);

function resetForm() {
  form.reset();
  editId.value           = '';
  formTitle.innerHTML    = '<i class="fas fa-plus-circle"></i> Add Expense';
  formSubtitle.textContent = 'Fill in the details below to add a new expense.';
  submitBtn.innerHTML    = '<i class="fas fa-plus"></i> Add Expense';
  cancelBtn.style.display = 'none';
  // Clear errors
  ['nameErr','catErr','amtErr','dateErr'].forEach(id => { document.getElementById(id).textContent = ''; });
  ['expenseName','category','amount','expenseDate'].forEach(id => {
    document.getElementById(id).classList.remove('error');
  });
}

// ── DELETE MODAL ──
let pendingDeleteId = null;

function openDeleteModal(id) {
  const expenses = getExpenses();
  const exp      = expenses.find(e => e.id === id);
  if (!exp) return;
  pendingDeleteId = id;
  deleteExpName.textContent = exp.name;
  deleteModal.classList.add('open');
}

confirmDeleteBtn.addEventListener('click', () => {
  if (!pendingDeleteId) return;
  let expenses = getExpenses();
  expenses     = expenses.filter(e => e.id !== pendingDeleteId);
  saveExpenses(expenses);
  pendingDeleteId = null;
  deleteModal.classList.remove('open');
  showToast('Expense deleted.', 'error');
  render();
});

cancelDeleteBtn.addEventListener('click', () => {
  pendingDeleteId = null;
  deleteModal.classList.remove('open');
});

deleteModal.addEventListener('click', e => {
  if (e.target === deleteModal) {
    pendingDeleteId = null;
    deleteModal.classList.remove('open');
  }
});

// ── CLEAR ALL MODAL ──
clearAllBtn.addEventListener('click', () => {
  if (getExpenses().length === 0) {
    showToast('No expenses to clear.', 'info');
    return;
  }
  clearModal.classList.add('open');
});

confirmClearBtn.addEventListener('click', () => {
  saveExpenses([]);
  clearModal.classList.remove('open');
  showToast('All expenses cleared.', 'info');
  resetForm();
  render();
});

cancelClearBtn.addEventListener('click', () => {
  clearModal.classList.remove('open');
});

clearModal.addEventListener('click', e => {
  if (e.target === clearModal) clearModal.classList.remove('open');
});

// ── SEARCH / FILTER ──
searchInput.addEventListener('input', render);
filterCat.addEventListener('change', render);

// ── Set today as default date ──
if (expenseDate) expenseDate.value = todayISO();

// ── Initial render ──
render();
