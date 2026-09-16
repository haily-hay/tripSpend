/* =============================================
   dashboard.js — Dashboard page logic
   ============================================= */
(function () {
  STORE.seedIfEmpty();

  const session = typeof AUTH !== 'undefined' ? AUTH.getSession() : null;
  const welcomeHeading = document.getElementById('welcomeHeading');
  if (welcomeHeading) {
    welcomeHeading.textContent = session ? `Welcome back, ${session.name.split(' ')[0]}` : 'Welcome back';
  }

  const stats = STORE.overallStats();
  document.getElementById('statTrips').textContent     = stats.totalTrips;
  document.getElementById('statExpenses').textContent  = stats.totalExpenses;
  document.getElementById('statSpent').textContent     = STORE.formatCurrency(stats.totalSpent);
  document.getElementById('statActiveTrip').textContent = stats.activeTrip ? stats.activeTrip.name : '—';

  const tripGrid   = document.getElementById('tripGrid');
  const emptyState = document.getElementById('emptyState');
  const trips = STORE.getTrips().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (!trips.length) {
    tripGrid.style.display   = 'none';
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
    tripGrid.innerHTML = trips.slice(0, 6).map(renderTripCard).join('');
  }

  function renderTripCard(trip) {
    const total = STORE.tripTotal(trip.id);
    const count = STORE.tripExpenseCount(trip.id);
    return `
      <a class="trip-card" href="trip-details.html?id=${encodeURIComponent(trip.id)}">
        <div class="trip-card-img" style="background-image:url('${escHtml(trip.coverImage)}')"></div>
        <div class="trip-card-body">
          <h3>${escHtml(trip.name)}</h3>
          <p class="trip-card-dest"><i class="fas fa-location-dot"></i> ${escHtml(trip.destination)}</p>
          <p class="trip-card-dates"><i class="fas fa-calendar"></i> ${STORE.formatDateRange(trip.startDate, trip.endDate)}</p>
          <div class="trip-card-footer">
            <span class="trip-card-spent">${STORE.formatCurrency(total)} <small>spent</small></span>
            <span class="trip-card-count">${count} expense${count !== 1 ? 's' : ''}</span>
          </div>
          <span class="btn btn-outline btn-sm trip-card-view">View Trip</span>
        </div>
      </a>`;
  }

  function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
