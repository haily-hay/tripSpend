/* =============================================
   trip-details.js — Trip Details page:
   summary, category breakdown, expense CRUD, trip edit/delete
   ============================================= */
(function () {
  STORE.seedIfEmpty();

  const CATEGORY_COLORS = {
    Food: '#b45309', Hotel: '#0F766E', Transport: '#2563eb', Shopping: '#059669',
    Activities: '#7c3aed', Flights: '#0284c7', Tickets: '#db2777', Fuel: '#c2410c', Other: '#475569',
  };

  const tripId = new URLSearchParams(window.location.search).get('id');
  let trip = tripId ? STORE.getTrip(tripId) : null;

  if (!trip) {
    document.getElementById('tripNotFound').style.display = 'block';
    document.getElementById('tripContent').style.display  = 'none';
    return;
  }

  /* ── DOM refs ── */
  const tripHeader       = document.getElementById('tripHeader');
  const tripHeaderName   = document.getElementById('tripHeaderName');
  const tripHeaderDest   = document.getElementById('tripHeaderDest');
  const tripHeaderDates  = document.getElementById('tripHeaderDates');
  const tripHeaderDesc   = document.getElementById('tripHeaderDesc');

  const tripSummarySpent = document.getElementById('tripSummarySpent');
  const tripSummaryCount = document.getElementById('tripSummaryCount');
  const tripSummaryAvg   = document.getElementById('tripSummaryAvg');

  const categoryBars      = document.getElementById('categoryBars');
  const categoryEmptyHint = document.getElementById('categoryEmptyHint');

  const expenseCards      = document.getElementById('expenseCards');
  const expenseEmptyState = document.getElementById('expenseEmptyState');
  const expenseNoResults  = document.getElementById('expenseNoResults');
  const expenseRecordBadge = document.getElementById('expenseRecordBadge');
  const expenseSearch     = document.getElementById('expenseSearch');
  const expenseCategoryFilter = document.getElementById('expenseCategoryFilter');
  const expenseSort       = document.getElementById('expenseSort');

  /* ── Render trip header ── */
  function renderHeader() {
    tripHeader.style.backgroundImage = `url('${trip.coverImage}')`;
    tripHeaderName.textContent = trip.name;
    tripHeaderDest.textContent = trip.destination;
    tripHeaderDates.textContent = STORE.formatDateRange(trip.startDate, trip.endDate);
    tripHeaderDesc.textContent = trip.description || '';
    tripHeaderDesc.style.display = trip.description ? 'block' : 'none';
    document.title = trip.name + ' – TripSpend';
  }

  /* ── Render summary ── */
  function renderSummary() {
    const total = STORE.tripTotal(trip.id);
    const count = STORE.tripExpenseCount(trip.id);
    const avg   = STORE.tripAverage(trip.id);
    tripSummarySpent.textContent = STORE.formatCurrency(total);
    tripSummaryCount.textContent = count;
    tripSummaryAvg.textContent   = STORE.formatCurrency(avg);
  }

  /* ── Render category breakdown ── */
  function renderCategoryBreakdown() {
    const breakdown = STORE.categoryBreakdown(trip.id);
    if (!breakdown.length) {
      categoryBars.innerHTML = '';
      categoryEmptyHint.style.display = 'block';
      return;
    }
    categoryEmptyHint.style.display = 'none';
    const total = breakdown.reduce((s, c) => s + c.amount, 0);
    categoryBars.innerHTML = breakdown.map(c => {
      const pct = total ? Math.round((c.amount / total) * 100) : 0;
      const color = CATEGORY_COLORS[c.category] || '#475569';
      const icon = STORE.CATEGORY_ICONS[c.category] || 'fa-ellipsis';
      return `
        <div class="category-bar-row">
          <div class="category-bar-label">
            <span class="category-bar-icon" style="background:${color}1a;color:${color}"><i class="fas ${icon}"></i></span>
            <span>${UI.escHtml(c.category)}</span>
          </div>
          <div class="category-bar-track"><div class="category-bar-fill" style="width:${pct}%;background:${color}"></div></div>
          <span class="category-bar-amount">${STORE.formatCurrency(c.amount)} <small>(${pct}%)</small></span>
        </div>`;
    }).join('');
  }

  /* ── Category filter/select population ── */
  function populateCategoryOptions() {
    expenseCategoryFilter.innerHTML = '<option value="">All Categories</option>' +
      STORE.CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
    expenseCategory.innerHTML = '<option value="">Select Category</option>' +
      STORE.CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  /* ── Expense thumbnail helper ── */
  function thumbHtml(exp) {
    const img = (exp.images && exp.images[0]) || STORE.CATEGORY_IMAGES[exp.category];
    if (img) return `<div class="expense-card-thumb" style="background-image:url('${UI.escHtml(img)}')"></div>`;
    const color = CATEGORY_COLORS[exp.category] || '#475569';
    const icon = STORE.CATEGORY_ICONS[exp.category] || 'fa-ellipsis';
    return `<div class="expense-card-thumb expense-card-thumb-icon" style="background:${color}1a;color:${color}"><i class="fas ${icon}"></i></div>`;
  }

  /* ── Render expense list ── */
  function renderExpenseList() {
    const all = STORE.getExpensesForTrip(trip.id);
    expenseRecordBadge.textContent = `${all.length} record${all.length !== 1 ? 's' : ''}`;

    if (!all.length) {
      expenseCards.innerHTML = '';
      expenseCards.style.display = 'none';
      expenseEmptyState.style.display = 'block';
      expenseNoResults.style.display = 'none';
      return;
    }
    expenseEmptyState.style.display = 'none';

    const query = (expenseSearch.value || '').toLowerCase().trim();
    const catFilter = expenseCategoryFilter.value;
    let filtered = all.filter(e => {
      const matchQ = !query || (e.description || '').toLowerCase().includes(query) || e.category.toLowerCase().includes(query);
      const matchCat = !catFilter || e.category === catFilter;
      return matchQ && matchCat;
    });

    const sortMode = expenseSort.value;
    filtered = filtered.slice().sort((a, b) => {
      if (sortMode === 'latest')  return b.date.localeCompare(a.date) || new Date(b.createdAt) - new Date(a.createdAt);
      if (sortMode === 'oldest')  return a.date.localeCompare(b.date) || new Date(a.createdAt) - new Date(b.createdAt);
      if (sortMode === 'highest') return b.amount - a.amount;
      if (sortMode === 'lowest')  return a.amount - b.amount;
      return 0;
    });

    if (!filtered.length) {
      expenseCards.style.display = 'none';
      expenseNoResults.style.display = 'block';
      return;
    }
    expenseNoResults.style.display = 'none';
    expenseCards.style.display = 'grid';

    expenseCards.innerHTML = filtered.map(exp => `
      <div class="expense-card" data-id="${exp.id}" tabindex="0" role="button" aria-label="View ${UI.escHtml(exp.description || exp.category)} details">
        ${thumbHtml(exp)}
        <div class="expense-card-body">
          <div class="expense-card-top">
            <span class="cat-badge cat-${exp.category}"><i class="fas ${STORE.CATEGORY_ICONS[exp.category]}"></i> ${UI.escHtml(exp.category)}</span>
            <span class="expense-card-amount">${STORE.formatCurrency(exp.amount)}</span>
          </div>
          <p class="expense-card-desc">${UI.escHtml(exp.description || exp.category + ' expense')}</p>
          <p class="expense-card-date"><i class="fas fa-calendar"></i> ${STORE.formatDateFull(exp.date)}</p>
        </div>
      </div>
    `).join('');

    expenseCards.querySelectorAll('.expense-card').forEach(card => {
      card.addEventListener('click', () => openDetails(card.dataset.id));
      card.addEventListener('keydown', e => { if (e.key === 'Enter') openDetails(card.dataset.id); });
    });
  }

  function refreshAll() {
    renderSummary();
    renderCategoryBreakdown();
    renderExpenseList();
  }

  expenseSearch.addEventListener('input', renderExpenseList);
  expenseCategoryFilter.addEventListener('change', renderExpenseList);
  expenseSort.addEventListener('change', renderExpenseList);

  /* =============================================
     ADD / EDIT EXPENSE MODAL
     ============================================= */
  const expenseModal      = document.getElementById('expenseModal');
  const expenseModalTitle = document.getElementById('expenseModalTitle');
  const expenseForm       = document.getElementById('expenseForm');
  const editExpenseId     = document.getElementById('editExpenseId');
  const expenseAmount     = document.getElementById('expenseAmount');
  const expenseCategory   = document.getElementById('expenseCategory');
  const expenseDate       = document.getElementById('expenseDate');
  const expenseDescription = document.getElementById('expenseDescription');
  const expenseSubmitBtn  = document.getElementById('expenseSubmitBtn');

  const expenseImagesInput     = document.getElementById('expenseImagesInput');
  const expenseImagesDropzone  = document.getElementById('expenseImagesDropzone');
  const expenseImagesRow       = document.getElementById('expenseImagesRow');
  const expenseImagesErr       = document.getElementById('expenseImagesErr');

  let currentImages = [];
  const MAX_IMAGES = 3;

  function renderImageThumbRow() {
    expenseImagesRow.innerHTML = currentImages.map((src, i) => `
      <div class="image-thumb-item">
        <img src="${src}" alt="Expense photo ${i + 1}" />
        <button type="button" class="image-thumb-remove" data-idx="${i}" aria-label="Remove photo ${i + 1}"><i class="fas fa-times"></i></button>
      </div>`).join('');
    expenseImagesDropzone.style.display = currentImages.length >= MAX_IMAGES ? 'none' : 'flex';
    expenseImagesRow.querySelectorAll('.image-thumb-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        currentImages.splice(Number(btn.dataset.idx), 1);
        renderImageThumbRow();
      });
    });
  }

  async function handleNewImageFiles(fileList) {
    expenseImagesErr.textContent = '';
    const files = Array.from(fileList || []).slice(0, MAX_IMAGES - currentImages.length);
    for (const file of files) {
      if (!file.type.startsWith('image/')) { expenseImagesErr.textContent = 'Please choose image files only.'; continue; }
      if (file.size > 5 * 1024 * 1024) { expenseImagesErr.textContent = 'Each image must be under 5MB.'; continue; }
      try {
        const dataUrl = await STORE.resizeImage(file);
        currentImages.push(dataUrl);
      } catch (err) {
        expenseImagesErr.textContent = 'Could not process one of the images.';
      }
    }
    renderImageThumbRow();
    expenseImagesInput.value = '';
  }

  expenseImagesDropzone.addEventListener('click', () => expenseImagesInput.click());
  expenseImagesDropzone.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); expenseImagesInput.click(); }
  });
  expenseImagesInput.addEventListener('change', () => handleNewImageFiles(expenseImagesInput.files));
  ['dragover', 'dragleave', 'drop'].forEach(evt => expenseImagesDropzone.addEventListener(evt, e => e.preventDefault()));
  expenseImagesDropzone.addEventListener('dragover', () => expenseImagesDropzone.classList.add('dragover'));
  expenseImagesDropzone.addEventListener('dragleave', () => expenseImagesDropzone.classList.remove('dragover'));
  expenseImagesDropzone.addEventListener('drop', e => {
    expenseImagesDropzone.classList.remove('dragover');
    handleNewImageFiles(e.dataTransfer.files);
  });

  function clearExpenseFieldErrors() {
    ['expenseAmountErr', 'expenseCategoryErr', 'expenseDateErr'].forEach(id => { document.getElementById(id).textContent = ''; });
    [expenseAmount, expenseCategory, expenseDate].forEach(el => el.classList.remove('error'));
    expenseImagesErr.textContent = '';
  }

  function resetExpenseForm() {
    editExpenseId.value = '';
    expenseAmount.value = '';
    expenseCategory.value = '';
    expenseDescription.value = '';
    const today = STORE.todayISO();
    expenseDate.value = (today >= trip.startDate && today <= trip.endDate) ? today : trip.startDate;
    currentImages = [];
    renderImageThumbRow();
    clearExpenseFieldErrors();
  }

  function openAddExpense() {
    resetExpenseForm();
    expenseModalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add Expense';
    expenseSubmitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Expense';
    expenseModal.classList.add('open');
    expenseAmount.focus();
  }

  function openEditExpense(id) {
    const exp = STORE.getExpense(id);
    if (!exp) return;
    resetExpenseForm();
    editExpenseId.value = exp.id;
    expenseAmount.value = exp.amount;
    expenseCategory.value = exp.category;
    expenseDate.value = exp.date;
    expenseDescription.value = exp.description || '';
    currentImages = (exp.images || []).slice();
    renderImageThumbRow();
    expenseModalTitle.innerHTML = '<i class="fas fa-pen"></i> Edit Expense';
    expenseSubmitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    expenseModal.classList.add('open');
  }

  function closeExpenseModal() {
    expenseModal.classList.remove('open');
  }

  document.getElementById('openAddExpenseBtn').addEventListener('click', openAddExpense);
  document.getElementById('emptyAddExpenseBtn').addEventListener('click', openAddExpense);
  document.getElementById('expenseCancelBtn').addEventListener('click', closeExpenseModal);
  document.getElementById('expenseModalCloseBtn').addEventListener('click', closeExpenseModal);
  expenseModal.addEventListener('click', e => { if (e.target === expenseModal) closeExpenseModal(); });

  expenseForm.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    const setErr = (input, errId, msg) => {
      const er = document.getElementById(errId);
      if (msg) { input.classList.add('error'); er.textContent = msg; ok = false; }
      else      { input.classList.remove('error'); er.textContent = ''; }
    };
    setErr(expenseAmount, 'expenseAmountErr', (expenseAmount.value && parseFloat(expenseAmount.value) > 0) ? '' : 'Enter a valid amount greater than 0.');
    setErr(expenseCategory, 'expenseCategoryErr', expenseCategory.value ? '' : 'Please select a category.');
    setErr(expenseDate, 'expenseDateErr', expenseDate.value ? '' : 'Please select a date.');
    if (!ok) return;

    const id = editExpenseId.value;
    const originalHtml = expenseSubmitBtn.innerHTML;
    expenseSubmitBtn.disabled = true;
    expenseSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    setTimeout(() => {
      const payload = {
        tripId: trip.id,
        amount: parseFloat(expenseAmount.value),
        category: expenseCategory.value,
        date: expenseDate.value,
        description: expenseDescription.value.trim(),
        images: currentImages.slice(),
      };
      let result;
      if (id) {
        result = STORE.updateExpense(id, payload);
      } else {
        result = STORE.addExpense(payload);
      }
      expenseSubmitBtn.disabled = false;
      expenseSubmitBtn.innerHTML = originalHtml;

      if (!result) {
        UI.showToast('Storage is full. Remove a photo or an old expense and try again.', 'error');
        return;
      }
      UI.showToast(id ? 'Expense updated successfully!' : 'Expense added successfully!', 'success');
      closeExpenseModal();
      refreshAll();
    }, 300);
  });

  /* =============================================
     EXPENSE DETAILS MODAL
     ============================================= */
  const expenseDetailsModal = document.getElementById('expenseDetailsModal');
  const detailsCategoryBadge = document.getElementById('detailsCategoryBadge');
  const detailsAmount = document.getElementById('detailsAmount');
  const detailsDescription = document.getElementById('detailsDescription');
  const detailsDate = document.getElementById('detailsDate');
  const detailsTripName = document.getElementById('detailsTripName');
  const detailsImages = document.getElementById('detailsImages');
  let detailsExpenseId = null;

  function openDetails(id) {
    const exp = STORE.getExpense(id);
    if (!exp) return;
    detailsExpenseId = id;
    detailsCategoryBadge.className = `cat-badge cat-${exp.category}`;
    detailsCategoryBadge.innerHTML = `<i class="fas ${STORE.CATEGORY_ICONS[exp.category]}"></i> ${UI.escHtml(exp.category)}`;
    detailsAmount.textContent = STORE.formatCurrency(exp.amount);
    detailsDescription.textContent = exp.description || exp.category + ' expense';
    detailsDate.innerHTML = `<i class="fas fa-calendar"></i> ${STORE.formatDateFull(exp.date)}`;
    detailsTripName.innerHTML = `<i class="fas fa-suitcase-rolling"></i> ${UI.escHtml(trip.name)}`;

    if (exp.images && exp.images.length) {
      detailsImages.innerHTML = exp.images.map((src, i) => `
        <button type="button" class="image-thumb-view" data-idx="${i}" aria-label="View photo ${i + 1} full size">
          <img src="${src}" alt="Expense photo ${i + 1}" />
        </button>`).join('');
      detailsImages.querySelectorAll('.image-thumb-view').forEach((btn, i) => {
        btn.addEventListener('click', () => openLightbox(exp.images[i], exp.description || exp.category));
      });
    } else {
      detailsImages.innerHTML = '<p class="no-images-hint">No photos attached to this expense.</p>';
    }
    expenseDetailsModal.classList.add('open');
  }
  function closeDetailsModal() {
    expenseDetailsModal.classList.remove('open');
    detailsExpenseId = null;
  }
  document.getElementById('expenseDetailsCloseBtn').addEventListener('click', closeDetailsModal);
  expenseDetailsModal.addEventListener('click', e => { if (e.target === expenseDetailsModal) closeDetailsModal(); });

  document.getElementById('detailsEditBtn').addEventListener('click', () => {
    const id = detailsExpenseId;
    closeDetailsModal();
    openEditExpense(id);
  });
  document.getElementById('detailsDeleteBtn').addEventListener('click', () => {
    openDeleteExpenseModal(detailsExpenseId);
  });

  /* =============================================
     DELETE EXPENSE MODAL
     ============================================= */
  const deleteExpenseModal = document.getElementById('deleteExpenseModal');
  let pendingDeleteExpenseId = null;

  function openDeleteExpenseModal(id) {
    pendingDeleteExpenseId = id;
    deleteExpenseModal.classList.add('open');
  }
  document.getElementById('cancelDeleteExpense').addEventListener('click', () => {
    pendingDeleteExpenseId = null;
    deleteExpenseModal.classList.remove('open');
  });
  deleteExpenseModal.addEventListener('click', e => {
    if (e.target === deleteExpenseModal) { pendingDeleteExpenseId = null; deleteExpenseModal.classList.remove('open'); }
  });
  document.getElementById('confirmDeleteExpense').addEventListener('click', () => {
    if (!pendingDeleteExpenseId) return;
    STORE.deleteExpense(pendingDeleteExpenseId);
    pendingDeleteExpenseId = null;
    deleteExpenseModal.classList.remove('open');
    closeDetailsModal();
    UI.showToast('Expense deleted successfully.', 'error');
    refreshAll();
  });

  /* =============================================
     EDIT TRIP MODAL
     ============================================= */
  const editTripModal = document.getElementById('editTripModal');
  const editTripForm  = document.getElementById('editTripForm');
  const editTripName  = document.getElementById('editTripName');
  const editTripDestination = document.getElementById('editTripDestination');
  const editTripStart = document.getElementById('editTripStart');
  const editTripEnd   = document.getElementById('editTripEnd');
  const editTripDescription = document.getElementById('editTripDescription');
  const editTripSubmitBtn = document.getElementById('editTripSubmitBtn');

  const editTripCoverInput = document.getElementById('editTripCoverInput');
  const editTripCoverPreviewImg = document.getElementById('editTripCoverPreviewImg');
  const editTripCoverChangeBtn = document.getElementById('editTripCoverChangeBtn');
  let editTripCoverImage = null;

  function openEditTrip() {
    editTripName.value = trip.name;
    editTripDestination.value = trip.destination;
    editTripStart.value = trip.startDate;
    editTripEnd.value = trip.endDate;
    editTripDescription.value = trip.description || '';
    editTripCoverImage = trip.coverImage;
    editTripCoverPreviewImg.src = trip.coverImage;
    ['editTripNameErr', 'editTripDestErr', 'editTripStartErr', 'editTripEndErr'].forEach(id => {
      document.getElementById(id).textContent = '';
    });
    editTripModal.classList.add('open');
  }
  function closeEditTripModal() {
    editTripModal.classList.remove('open');
  }
  document.getElementById('openEditTripBtn').addEventListener('click', openEditTrip);
  document.getElementById('editTripCancelBtn').addEventListener('click', closeEditTripModal);
  document.getElementById('editTripCloseBtn').addEventListener('click', closeEditTripModal);
  editTripModal.addEventListener('click', e => { if (e.target === editTripModal) closeEditTripModal(); });

  editTripCoverChangeBtn.addEventListener('click', () => editTripCoverInput.click());
  editTripCoverInput.addEventListener('change', async () => {
    const file = editTripCoverInput.files[0];
    if (!file) return;
    try {
      const dataUrl = await STORE.resizeImage(file, 900, 0.78);
      editTripCoverImage = dataUrl;
      editTripCoverPreviewImg.src = dataUrl;
    } catch (err) {
      UI.showToast('Could not process that image.', 'error');
    }
  });

  editTripForm.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    const setErr = (input, errId, msg) => {
      const er = document.getElementById(errId);
      if (msg) { input.classList.add('error'); er.textContent = msg; ok = false; }
      else      { input.classList.remove('error'); er.textContent = ''; }
    };
    setErr(editTripName, 'editTripNameErr', editTripName.value.trim() ? '' : 'Trip name is required.');
    setErr(editTripDestination, 'editTripDestErr', editTripDestination.value.trim() ? '' : 'Destination is required.');
    setErr(editTripStart, 'editTripStartErr', editTripStart.value ? '' : 'Start date is required.');
    if (!editTripEnd.value) {
      setErr(editTripEnd, 'editTripEndErr', 'End date is required.');
    } else if (editTripStart.value && editTripEnd.value < editTripStart.value) {
      setErr(editTripEnd, 'editTripEndErr', 'End date cannot be before the start date.');
    } else {
      setErr(editTripEnd, 'editTripEndErr', '');
    }
    if (!ok) return;

    const originalHtml = editTripSubmitBtn.innerHTML;
    editTripSubmitBtn.disabled = true;
    editTripSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    setTimeout(() => {
      trip = STORE.updateTrip(trip.id, {
        name: editTripName.value.trim(),
        destination: editTripDestination.value.trim(),
        startDate: editTripStart.value,
        endDate: editTripEnd.value,
        description: editTripDescription.value.trim(),
        coverImage: editTripCoverImage || STORE.DEFAULT_TRIP_IMAGE,
      });
      editTripSubmitBtn.disabled = false;
      editTripSubmitBtn.innerHTML = originalHtml;
      UI.showToast('Trip updated successfully.', 'success');
      closeEditTripModal();
      renderHeader();
    }, 300);
  });

  /* =============================================
     DELETE TRIP MODAL
     ============================================= */
  const deleteTripModal = document.getElementById('deleteTripModal');
  document.getElementById('openDeleteTripBtn').addEventListener('click', () => {
    document.getElementById('deleteTripTitle').textContent = `Delete ${trip.name}?`;
    deleteTripModal.classList.add('open');
  });
  document.getElementById('cancelDeleteTrip').addEventListener('click', () => deleteTripModal.classList.remove('open'));
  deleteTripModal.addEventListener('click', e => { if (e.target === deleteTripModal) deleteTripModal.classList.remove('open'); });
  document.getElementById('confirmDeleteTrip').addEventListener('click', () => {
    STORE.deleteTrip(trip.id);
    UI.showToast('Trip deleted successfully.', 'error');
    window.location.href = 'trips.html';
  });

  /* =============================================
     IMAGE LIGHTBOX
     ============================================= */
  const lightboxModal   = document.getElementById('lightboxModal');
  const lightboxImg     = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');

  function openLightbox(src, caption) {
    lightboxImg.src = src;
    lightboxCaption.textContent = caption || '';
    lightboxModal.classList.add('open');
  }
  function closeLightbox() {
    lightboxModal.classList.remove('open');
    lightboxImg.src = '';
  }
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  lightboxModal.addEventListener('click', e => { if (e.target === lightboxModal) closeLightbox(); });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (lightboxModal.classList.contains('open')) { closeLightbox(); return; }
    if (expenseDetailsModal.classList.contains('open')) { closeDetailsModal(); return; }
    if (expenseModal.classList.contains('open')) { closeExpenseModal(); return; }
    if (editTripModal.classList.contains('open')) { closeEditTripModal(); return; }
    if (deleteExpenseModal.classList.contains('open')) { deleteExpenseModal.classList.remove('open'); return; }
    if (deleteTripModal.classList.contains('open')) { deleteTripModal.classList.remove('open'); return; }
  });

  /* ── Initial render ── */
  populateCategoryOptions();
  renderHeader();
  refreshAll();
})();
