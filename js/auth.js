/* =============================================
   TripSpend – auth.js
   localStorage-based authentication system
   ============================================= */

const AUTH = (() => {
  const USERS_KEY  = 'tripspend_users';
  const SESSION_KEY = 'tripspend_session';

  /* ── Helpers ── */
  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function hashSimple(str) {
    // Very lightweight obfuscation (not crypto-secure – client-side only)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return hash.toString(36);
  }

  /* ── Public API ── */

  /**
   * Register a new user.
   * @returns {object} { ok: true } | { ok: false, error: string }
   */
  function register(name, email, password) {
    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: 'An account with this email already exists.' };
    }
    users.push({
      id: Date.now().toString(36),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hashSimple(password),
      createdAt: new Date().toISOString(),
    });
    saveUsers(users);
    return { ok: true };
  }

  /**
   * Log in an existing user.
   * @returns {object} { ok: true, user } | { ok: false, error: string }
   */
  function login(email, password) {
    const users = getUsers();
    const user = users.find(
      u =>
        u.email.toLowerCase() === email.toLowerCase().trim() &&
        u.passwordHash === hashSimple(password)
    );
    if (!user) {
      return { ok: false, error: 'Invalid email or password. Please try again.' };
    }
    const session = { userId: user.id, name: user.name, email: user.email, loggedInAt: Date.now() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { ok: true, user: session };
  }

  /**
   * Log out the current user.
   */
  function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
  }

  /**
   * Get the currently logged-in user session (or null).
   */
  function getSession() {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  }

  /**
   * Returns true if a user is logged in.
   */
  function isLoggedIn() {
    return getSession() !== null;
  }

  /**
   * Guard: call on protected pages. Redirects to login if not logged in.
   */
  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = 'login.html';
    }
  }

  return { register, login, logout, getSession, isLoggedIn, requireAuth };
})();
