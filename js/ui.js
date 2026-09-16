/* =============================================
   ui.js — tiny shared UI helpers (toast, escaping)
   Kept separate from store.js so the data layer stays UI-free.
   ============================================= */
const UI = (() => {
  function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
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

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { showToast, escHtml };
})();
