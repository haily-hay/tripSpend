/* =============================================
   nav.js — shared auth-aware navbar wiring
   Used by app pages (dashboard, trips, trip-details).
   Mobile toggle / scroll-shadow behavior lives in main.js.
   ============================================= */
(function () {
  const session = typeof AUTH !== 'undefined' ? AUTH.getSession() : null;

  const loginItem  = document.getElementById('navLoginItem');
  const userItem   = document.getElementById('navUserItem');
  const logoutItem = document.getElementById('navLogoutItem');
  const userName   = document.getElementById('navUserName');

  if (session) {
    if (loginItem)  loginItem.style.display  = 'none';
    if (userItem)   userItem.style.display   = 'list-item';
    if (logoutItem) logoutItem.style.display = 'list-item';
    if (userName)   userName.textContent     = session.name.split(' ')[0];

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', e => {
        e.preventDefault();
        AUTH.logout();
      });
    }
  }
})();
