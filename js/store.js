/* =============================================
   TripSpend – store.js
   Shared data layer: Trips + Expenses (localStorage-backed)
   Keeps mock-data / persistence logic separate from page UI code
   so a future backend could replace it without touching pages.
   ============================================= */

const STORE = (() => {
  const TRIPS_KEY    = 'tripspend_trips';
  const EXPENSES_KEY = 'tripspend_expenses';

  const CATEGORIES = ['Food', 'Hotel', 'Transport', 'Shopping', 'Activities', 'Flights', 'Tickets', 'Fuel', 'Other'];

  const CATEGORY_ICONS = {
    Food:       'fa-utensils',
    Hotel:      'fa-bed',
    Transport:  'fa-car-side',
    Shopping:   'fa-bag-shopping',
    Activities: 'fa-person-hiking',
    Flights:    'fa-plane',
    Tickets:    'fa-ticket',
    Fuel:       'fa-gas-pump',
    Other:      'fa-ellipsis',
  };

  // Categories without a dedicated stock photo fall back to an icon tile (see CATEGORY_ICONS)
  const CATEGORY_IMAGES = {
    Food:       'assets/images/categories/food.jpg',
    Hotel:      'assets/images/categories/accommodation.jpg',
    Transport:  'assets/images/categories/transport.jpg',
    Shopping:   'assets/images/categories/shopping.jpg',
    Activities: 'assets/images/categories/activities.jpg',
    Flights:    'assets/images/categories/flights.jpg',
    Other:      'assets/images/categories/other.jpg',
  };

  const DEFAULT_TRIP_IMAGE = 'assets/images/trips/default.jpg';

  /* ── Storage key scoping (per logged-in user, or a shared guest bucket) ── */
  function scopedKey(base) {
    if (typeof AUTH !== 'undefined' && AUTH.isLoggedIn()) {
      return base + '_' + AUTH.getSession().userId;
    }
    return base;
  }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }
  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  /* ── Trips ── */
  function getTrips() {
    return readJSON(scopedKey(TRIPS_KEY), []);
  }
  function saveTrips(trips) {
    return writeJSON(scopedKey(TRIPS_KEY), trips);
  }
  function getTrip(id) {
    return getTrips().find(t => t.id === id) || null;
  }
  function addTrip(trip) {
    const trips = getTrips();
    const newTrip = {
      id: genId('trip'),
      name: trip.name,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      description: trip.description || '',
      coverImage: trip.coverImage || DEFAULT_TRIP_IMAGE,
      createdAt: new Date().toISOString(),
    };
    trips.push(newTrip);
    saveTrips(trips);
    return newTrip;
  }
  function updateTrip(id, patch) {
    const trips = getTrips();
    const idx = trips.findIndex(t => t.id === id);
    if (idx === -1) return null;
    trips[idx] = { ...trips[idx], ...patch, updatedAt: new Date().toISOString() };
    saveTrips(trips);
    return trips[idx];
  }
  function deleteTrip(id) {
    saveTrips(getTrips().filter(t => t.id !== id));
    // Cascade: remove this trip's expenses too
    saveExpenses(getExpenses().filter(e => e.tripId !== id));
  }
  function getActiveTrip() {
    const trips = getTrips();
    if (!trips.length) return null;
    const today = todayISO();
    const current = trips.find(t => t.startDate <= today && today <= t.endDate);
    if (current) return current;
    return [...trips].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  }

  /* ── Expenses ── */
  function getExpenses() {
    return readJSON(scopedKey(EXPENSES_KEY), []);
  }
  function saveExpenses(expenses) {
    return writeJSON(scopedKey(EXPENSES_KEY), expenses);
  }
  function getExpensesForTrip(tripId) {
    return getExpenses().filter(e => e.tripId === tripId);
  }
  function getExpense(id) {
    return getExpenses().find(e => e.id === id) || null;
  }
  function addExpense(expense) {
    const expenses = getExpenses();
    const newExpense = {
      id: genId('exp'),
      tripId: expense.tripId,
      category: expense.category,
      amount: parseFloat(expense.amount),
      date: expense.date,
      description: expense.description || '',
      images: expense.images || [],
      createdAt: new Date().toISOString(),
    };
    expenses.push(newExpense);
    const ok = saveExpenses(expenses);
    return ok ? newExpense : null;
  }
  function updateExpense(id, patch) {
    const expenses = getExpenses();
    const idx = expenses.findIndex(e => e.id === id);
    if (idx === -1) return null;
    const updated = { ...expenses[idx], ...patch, updatedAt: new Date().toISOString() };
    expenses[idx] = updated;
    const ok = saveExpenses(expenses);
    return ok ? updated : null;
  }
  function deleteExpense(id) {
    saveExpenses(getExpenses().filter(e => e.id !== id));
  }

  /* ── Derived stats ── */
  function tripTotal(tripId) {
    return getExpensesForTrip(tripId).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  }
  function tripExpenseCount(tripId) {
    return getExpensesForTrip(tripId).length;
  }
  function tripAverage(tripId) {
    const count = tripExpenseCount(tripId);
    return count ? tripTotal(tripId) / count : 0;
  }
  function categoryBreakdown(tripId) {
    const totals = {};
    getExpensesForTrip(tripId).forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + parseFloat(e.amount || 0);
    });
    return Object.entries(totals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }
  function overallStats() {
    const trips = getTrips();
    const expenses = getExpenses();
    return {
      totalTrips: trips.length,
      totalExpenses: expenses.length,
      totalSpent: expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0),
      activeTrip: getActiveTrip(),
    };
  }

  /* ── Helpers ── */
  function genId(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function todayISO() {
    return new Date().toISOString().split('T')[0];
  }
  function formatCurrency(n) {
    return '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
  }
  function formatDateFull(iso) {
    if (!iso) return '';
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  function formatDateShort(iso) {
    if (!iso) return '';
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function formatDateRange(start, end) {
    if (!start || !end) return '';
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    const sMonth = s.toLocaleDateString('en-US', { month: 'short' });
    const eMonth = e.toLocaleDateString('en-US', { month: 'short' });
    const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
    return sameMonth
      ? `${sMonth} ${s.getDate()}–${e.getDate()}, ${e.getFullYear()}`
      : `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}, ${e.getFullYear()}`;
  }

  // Resize + compress an uploaded photo via canvas so it stays small in localStorage
  function resizeImage(file, maxDim = 640, quality = 0.72) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) { reject(new Error('Not an image file.')); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read file.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Could not load image.'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
            else                { width  = Math.round(width  * (maxDim / height)); height = maxDim; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ── Seed realistic mock data on first run only ──
     Uses a one-time flag (not "is the list empty") so that a user who
     deliberately deletes every trip does not get the mock data back. */
  function seedIfEmpty() {
    const seededFlagKey = scopedKey('tripspend_seeded');
    if (localStorage.getItem(seededFlagKey)) return;
    localStorage.setItem(seededFlagKey, '1');
    if (getTrips().length > 0) return;

    const trips = [
      {
        id: genId('trip'), name: 'Goa Escape', destination: 'Goa',
        startDate: '2026-09-12', endDate: '2026-09-16',
        description: 'Weekend beach trip with friends — sun, sand, and seafood.',
        coverImage: 'assets/images/trips/goa.jpg', createdAt: '2026-08-01T10:00:00.000Z',
      },
      {
        id: genId('trip'), name: 'Kerala Getaway', destination: 'Kerala',
        startDate: '2026-08-20', endDate: '2026-08-24',
        description: 'Backwaters, houseboats, and slow mornings in God’s Own Country.',
        coverImage: 'assets/images/trips/kerala.jpg', createdAt: '2026-07-15T10:00:00.000Z',
      },
      {
        id: genId('trip'), name: 'Ooty Weekend', destination: 'Ooty',
        startDate: '2026-07-05', endDate: '2026-07-07',
        description: 'Misty hills, tea gardens, and a toy train ride.',
        coverImage: 'assets/images/trips/ooty.jpg', createdAt: '2026-06-20T10:00:00.000Z',
      },
      {
        id: genId('trip'), name: 'Bangalore Weekend', destination: 'Bangalore',
        startDate: '2026-06-01', endDate: '2026-06-03',
        description: 'Quick city break — breweries, street shopping, and a sunrise trek.',
        coverImage: 'assets/images/trips/bangalore.jpg', createdAt: '2026-05-10T10:00:00.000Z',
      },
    ];

    const [goa, kerala, ooty, blr] = trips;
    const exp = (tripId, category, amount, date, description) => ({
      id: genId('exp'), tripId, category, amount, date, description, images: [],
      createdAt: new Date(date + 'T09:00:00.000Z').toISOString(),
    });

    const expenses = [
      // Goa Escape
      exp(goa.id, 'Hotel', 3500, '2026-09-12', 'Beach Resort Stay'),
      exp(goa.id, 'Transport', 900, '2026-09-12', 'Airport Taxi'),
      exp(goa.id, 'Transport', 600, '2026-09-13', 'Local Taxi'),
      exp(goa.id, 'Food', 450, '2026-09-13', 'Breakfast at Cafe'),
      exp(goa.id, 'Food', 680, '2026-09-13', 'Lunch by the Beach'),
      exp(goa.id, 'Food', 850, '2026-09-13', 'Dinner at Baga Beach'),
      exp(goa.id, 'Activities', 1500, '2026-09-14', 'Water Sports'),
      exp(goa.id, 'Shopping', 1200, '2026-09-14', 'Souvenirs'),
      exp(goa.id, 'Food', 950, '2026-09-14', 'Seafood Dinner'),
      exp(goa.id, 'Tickets', 1100, '2026-09-15', 'Sunset Cruise Tickets'),
      exp(goa.id, 'Fuel', 300, '2026-09-15', 'Scooter Rental Fuel'),
      exp(goa.id, 'Food', 420, '2026-09-16', 'Breakfast'),

      // Kerala Getaway
      exp(kerala.id, 'Hotel', 3200, '2026-08-20', 'Houseboat Stay'),
      exp(kerala.id, 'Transport', 750, '2026-08-20', 'Airport Transfer'),
      exp(kerala.id, 'Food', 380, '2026-08-21', 'Kerala Sadya Lunch'),
      exp(kerala.id, 'Activities', 1400, '2026-08-21', 'Backwater Cruise'),
      exp(kerala.id, 'Food', 620, '2026-08-21', 'Seafood Dinner'),
      exp(kerala.id, 'Shopping', 800, '2026-08-22', 'Spices & Souvenirs'),
      exp(kerala.id, 'Transport', 350, '2026-08-22', 'Local Auto Rides'),
      exp(kerala.id, 'Tickets', 500, '2026-08-23', 'Kathakali Show Tickets'),
      exp(kerala.id, 'Food', 340, '2026-08-23', 'Breakfast'),
      exp(kerala.id, 'Fuel', 380, '2026-08-24', 'Rental Car Fuel'),

      // Ooty Weekend
      exp(ooty.id, 'Hotel', 2200, '2026-07-05', 'Hill View Cottage'),
      exp(ooty.id, 'Transport', 1400, '2026-07-05', 'Taxi from Coimbatore'),
      exp(ooty.id, 'Food', 420, '2026-07-05', 'Dinner'),
      exp(ooty.id, 'Activities', 600, '2026-07-06', 'Tea Garden Tour'),
      exp(ooty.id, 'Tickets', 450, '2026-07-06', 'Toy Train Tickets'),
      exp(ooty.id, 'Food', 380, '2026-07-06', 'Lunch'),
      exp(ooty.id, 'Shopping', 550, '2026-07-06', 'Homemade Chocolates'),
      exp(ooty.id, 'Food', 340, '2026-07-07', 'Breakfast'),

      // Bangalore Weekend
      exp(blr.id, 'Hotel', 2800, '2026-06-01', 'Boutique Hotel Stay'),
      exp(blr.id, 'Food', 1200, '2026-06-01', 'Brewery Dinner'),
      exp(blr.id, 'Transport', 650, '2026-06-02', 'Cab Rides'),
      exp(blr.id, 'Activities', 400, '2026-06-02', 'Nandi Hills Trek'),
      exp(blr.id, 'Shopping', 1800, '2026-06-02', 'Commercial Street Shopping'),
      exp(blr.id, 'Food', 560, '2026-06-03', 'Brunch'),
    ];

    saveTrips(trips);
    saveExpenses(expenses);
  }

  return {
    CATEGORIES, CATEGORY_ICONS, CATEGORY_IMAGES, DEFAULT_TRIP_IMAGE,
    getTrips, saveTrips, getTrip, addTrip, updateTrip, deleteTrip, getActiveTrip,
    getExpenses, saveExpenses, getExpensesForTrip, getExpense, addExpense, updateExpense, deleteExpense,
    tripTotal, tripExpenseCount, tripAverage, categoryBreakdown, overallStats,
    genId, todayISO, formatCurrency, formatDateFull, formatDateShort, formatDateRange, resizeImage,
    seedIfEmpty,
  };
})();
