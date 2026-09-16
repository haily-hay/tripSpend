/* =============================================
   trips.js — My Trips page: list, search/sort, create trip
   ============================================= */
(function () {
  STORE.seedIfEmpty();

  const tripGrid       = document.getElementById('tripGrid');
  const emptyState     = document.getElementById('emptyState');
  const noResultsState = document.getElementById('noResultsState');
  const tripSearch     = document.getElementById('tripSearch');
  const tripSort       = document.getElementById('tripSort');

  function render() {
    const allTrips = STORE.getTrips();

    if (!allTrips.length) {
      tripGrid.style.display       = 'none';
      emptyState.style.display     = 'block';
      noResultsState.style.display = 'none';
      return;
    }
    emptyState.style.display = 'none';

    const query = (tripSearch.value || '').toLowerCase().trim();
    let filtered = allTrips.filter(t =>
      !query || t.name.toLowerCase().includes(query) || t.destination.toLowerCase().includes(query)
    );

    const sortMode = tripSort.value;
    filtered = filtered.slice().sort((a, b) => {
      if (sortMode === 'latest')  return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortMode === 'oldest')  return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortMode === 'highest') return STORE.tripTotal(b.id) - STORE.tripTotal(a.id);
      if (sortMode === 'lowest')  return STORE.tripTotal(a.id) - STORE.tripTotal(b.id);
      return 0;
    });

    if (!filtered.length) {
      tripGrid.style.display       = 'none';
      noResultsState.style.display = 'block';
      return;
    }
    noResultsState.style.display = 'none';
    tripGrid.style.display = 'grid';
    tripGrid.innerHTML = filtered.map(renderTripCard).join('');
  }

  function renderTripCard(trip) {
    const total = STORE.tripTotal(trip.id);
    const count = STORE.tripExpenseCount(trip.id);
    return `
      <a class="trip-card" href="trip-details.html?id=${encodeURIComponent(trip.id)}">
        <div class="trip-card-img" style="background-image:url('${UI.escHtml(trip.coverImage)}')"></div>
        <div class="trip-card-body">
          <h3>${UI.escHtml(trip.name)}</h3>
          <p class="trip-card-dest"><i class="fas fa-location-dot"></i> ${UI.escHtml(trip.destination)}</p>
          <p class="trip-card-dates"><i class="fas fa-calendar"></i> ${STORE.formatDateRange(trip.startDate, trip.endDate)}</p>
          <div class="trip-card-footer">
            <span class="trip-card-spent">${STORE.formatCurrency(total)} <small>spent</small></span>
            <span class="trip-card-count">${count} expense${count !== 1 ? 's' : ''}</span>
          </div>
          <span class="btn btn-outline btn-sm trip-card-view">View Trip</span>
        </div>
      </a>`;
  }

  tripSearch.addEventListener('input', render);
  tripSort.addEventListener('change', render);
  render();

  /* ── CREATE TRIP MODAL ── */
  const tripModal        = document.getElementById('tripModal');
  const tripForm         = document.getElementById('tripForm');
  const tripName         = document.getElementById('tripName');
  const tripDestination  = document.getElementById('tripDestination');
  const tripStart        = document.getElementById('tripStart');
  const tripEnd          = document.getElementById('tripEnd');
  const tripDescription  = document.getElementById('tripDescription');

  const tripCoverInput    = document.getElementById('tripCoverInput');
  const tripCoverDropzone = document.getElementById('tripCoverDropzone');
  const tripCoverPreview  = document.getElementById('tripCoverPreview');
  const tripCoverPreviewImg  = document.getElementById('tripCoverPreviewImg');
  const tripCoverPreviewName = document.getElementById('tripCoverPreviewName');
  const tripCoverRemoveBtn   = document.getElementById('tripCoverRemoveBtn');

  let currentCoverImage = null;

  function openCreateModal() {
    tripForm.reset();
    currentCoverImage = null;
    clearCoverPreview();
    ['tripNameErr', 'tripDestErr', 'tripStartErr', 'tripEndErr'].forEach(id => {
      document.getElementById(id).textContent = '';
    });
    tripModal.classList.add('open');
    tripName.focus();
  }
  function closeModal() {
    tripModal.classList.remove('open');
  }

  document.getElementById('openCreateTripBtn').addEventListener('click', openCreateModal);
  document.getElementById('emptyCreateTripBtn').addEventListener('click', openCreateModal);
  document.getElementById('tripCancelBtn').addEventListener('click', closeModal);
  document.getElementById('tripModalCloseBtn').addEventListener('click', closeModal);
  tripModal.addEventListener('click', e => { if (e.target === tripModal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && tripModal.classList.contains('open')) closeModal(); });

  // Auto-open when linked from Dashboard's "Create Trip" button
  if (new URLSearchParams(window.location.search).get('create') === '1') {
    openCreateModal();
  }

  function showCoverPreview(dataUrl, name) {
    currentCoverImage = dataUrl;
    tripCoverPreviewImg.src = dataUrl;
    tripCoverPreviewName.textContent = name || 'cover.jpg';
    tripCoverPreview.style.display  = 'flex';
    tripCoverDropzone.style.display = 'none';
  }
  function clearCoverPreview() {
    currentCoverImage = null;
    tripCoverPreviewImg.src = '';
    tripCoverPreview.style.display  = 'none';
    tripCoverDropzone.style.display = 'flex';
    tripCoverInput.value = '';
  }

  tripCoverDropzone.addEventListener('click', () => tripCoverInput.click());
  tripCoverDropzone.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tripCoverInput.click(); }
  });
  tripCoverInput.addEventListener('change', async () => {
    const file = tripCoverInput.files[0];
    if (!file) return;
    try {
      const dataUrl = await STORE.resizeImage(file, 900, 0.78);
      showCoverPreview(dataUrl, file.name);
    } catch (err) {
      UI.showToast('Could not process that image.', 'error');
    }
  });
  tripCoverRemoveBtn.addEventListener('click', clearCoverPreview);

  tripForm.addEventListener('submit', e => {
    e.preventDefault();

    let ok = true;
    const setErr = (input, errId, msg) => {
      const er = document.getElementById(errId);
      if (msg) { input.classList.add('error'); er.textContent = msg; ok = false; }
      else      { input.classList.remove('error'); er.textContent = ''; }
    };
    setErr(tripName, 'tripNameErr', tripName.value.trim() ? '' : 'Trip name is required.');
    setErr(tripDestination, 'tripDestErr', tripDestination.value.trim() ? '' : 'Destination is required.');
    setErr(tripStart, 'tripStartErr', tripStart.value ? '' : 'Start date is required.');
    if (!tripEnd.value) {
      setErr(tripEnd, 'tripEndErr', 'End date is required.');
    } else if (tripStart.value && tripEnd.value < tripStart.value) {
      setErr(tripEnd, 'tripEndErr', 'End date cannot be before the start date.');
    } else {
      setErr(tripEnd, 'tripEndErr', '');
    }
    if (!ok) return;

    const submitBtn = document.getElementById('tripSubmitBtn');
    const originalHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    setTimeout(() => {
      const newTrip = STORE.addTrip({
        name: tripName.value.trim(),
        destination: tripDestination.value.trim(),
        startDate: tripStart.value,
        endDate: tripEnd.value,
        description: tripDescription.value.trim(),
        coverImage: currentCoverImage || STORE.DEFAULT_TRIP_IMAGE,
      });
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHtml;
      UI.showToast('Trip created successfully.', 'success');
      window.location.href = 'trip-details.html?id=' + encodeURIComponent(newTrip.id);
    }, 350);
  });
})();
