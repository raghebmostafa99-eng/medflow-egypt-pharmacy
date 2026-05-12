/* ===================================================================
   MedFlow — Pharmacy Sales System Application Logic
   =================================================================== */
(() => {
  'use strict';

  // ======================== CONFIG ========================
  const CFG = {
    SHEETS_URL: 'https://script.google.com/macros/s/AKfycbztBCnsJQhO2p5uz1Iix24k9N5e23-n6XQgT10XB7QHOU2Oju2Dg5aj8Q0a3s7uaTVmyw/exec',
    PASSWORD: '1234',
    KEY: {
      pwd: 'mf_password',
      products: 'mf_products',
      tx: 'mf_transactions',
      invCounter: 'mf_inv_counter',
      invDate: 'mf_inv_date',
      theme: 'mf_theme',
      session: 'mf_session',
    },
    TOAST_MS: 3200,
  };

  // ======================== STORAGE HELPERS ========================
  const LS = {
    get(k, fallback) { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
  };
  const SS = {
    get(k) { return sessionStorage.getItem(k); },
    set(k, v) { sessionStorage.setItem(k, v); },
    del(k) { sessionStorage.removeItem(k); },
  };

  // ======================== STATE ========================
  const state = {
    products: deduplicateProducts(LS.get(CFG.KEY.products, [])),
    tx: LS.get(CFG.KEY.tx, []),
  };
  function deduplicateProducts(arr) {
    const unique = [...new Set(arr.map(p => p.trim()).filter(Boolean))];
    LS.set(CFG.KEY.products, unique);
    return unique;
  }

  // ======================== DOM ========================
  const $ = s => document.querySelector(s);
  const D = {};
  function cacheDom() {
    const ids = [
      'loginScreen', 'mainApp', 'loginForm', 'passwordInput', 'togglePassword', 'loginBtn',
      'themeToggle', 'logoutBtn', 'liveClock', 'salesForm', 'productName', 'autocompleteList',
      'quantity', 'unit', 'unitPrice', 'discount', 'notes', 'computedSubtotal', 'computedTotal',
      'invoiceId', 'invoiceDate', 'submitSale', 'resetForm', 'totalSales', 'totalDiscounts',
      'netRevenue', 'transactionCount', 'transactionsBody', 'emptyState', 'transactionsTable',
      'clearTransactions', 'toastContainer',
    ];
    ids.forEach(id => D[id] = document.getElementById(id));
  }

  // ======================== UTILS ========================
  const U = {
    today: () => new Date().toISOString().split('T')[0],
    time: () => new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
    timeShort: () => new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }),
    dateAr: (d) => new Date(d).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    fmt: (n) => Number(n).toFixed(2),
    saveProd: () => LS.set(CFG.KEY.products, state.products),
    saveTx: () => LS.set(CFG.KEY.tx, state.tx),
    escRx: (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  };

  // ======================== TOAST ========================
  const Toast = {
    show(msg, type = 'success') {
      const icons = { success: '✓', error: '✕', info: 'ℹ' };
      const el = document.createElement('div');
      el.className = `toast toast-${type}`;
      el.innerHTML = `<div class="toast-icon">${icons[type] || 'ℹ'}</div><span>${msg}</span><div class="toast-bar"></div>`;
      D.toastContainer.appendChild(el);
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 250); }, CFG.TOAST_MS);
    },
    ok: (m) => Toast.show(m, 'success'),
    err: (m) => Toast.show(m, 'error'),
    info: (m) => Toast.show(m, 'info'),
  };

  // ======================== THEME ========================
  const Theme = {
    init() {
      this.apply(LS.get(CFG.KEY.theme, 'light'), false);
      D.themeToggle.addEventListener('click', () => this.toggle());
    },
    apply(t, save = true) {
      document.documentElement.setAttribute('data-theme', t);
      D.themeToggle.querySelector('.icon-sun').style.display = t === 'dark' ? 'none' : 'block';
      D.themeToggle.querySelector('.icon-moon').style.display = t === 'dark' ? 'block' : 'none';
      if (save) LS.set(CFG.KEY.theme, t);
    },
    toggle() {
      this.apply(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    },
  };

  // ======================== AUTH ========================
  const Auth = {
    init() {
      D.loginForm.addEventListener('submit', e => this.login(e));
      D.togglePassword.addEventListener('click', () => this.togglePwd());
      D.logoutBtn.addEventListener('click', () => this.logout());

      if (SS.get(CFG.KEY.session) === '1') {
        D.loginScreen.style.display = 'none';
        D.mainApp.classList.remove('hidden');
        App.ready();
        return;
      }
      D.passwordInput.focus();
    },
    login(e) {
      e.preventDefault();
      const val = D.passwordInput.value.trim();
      const pwd = LS.get(CFG.KEY.pwd, null) || CFG.PASSWORD;
      if (!val) { Toast.err('يرجى إدخال كلمة المرور'); D.passwordInput.focus(); return; }

      const btnT = D.loginBtn.querySelector('.btn-text');
      const btnL = D.loginBtn.querySelector('.btn-loader');
      btnT.style.display = 'none'; btnL.style.display = 'block'; D.loginBtn.disabled = true;

      setTimeout(() => {
        if (val === pwd) {
          SS.set(CFG.KEY.session, '1');
          D.loginScreen.classList.add('leaving');
          D.mainApp.classList.remove('hidden');
          D.mainApp.classList.add('entering');
          setTimeout(() => {
            D.loginScreen.style.display = 'none';
            D.loginScreen.classList.remove('leaving');
            D.mainApp.classList.remove('entering');
          }, 500);
          App.ready();
          Toast.ok('تم تسجيل الدخول بنجاح');
        } else {
          Toast.err('كلمة المرور غير صحيحة');
          D.passwordInput.focus();
          D.passwordInput.select();
        }
        btnT.style.display = ''; btnL.style.display = 'none'; D.loginBtn.disabled = false;
      }, 450);
    },
    togglePwd() {
      const show = D.passwordInput.type === 'password';
      D.passwordInput.type = show ? 'text' : 'password';
      D.togglePassword.querySelector('.eye-open').style.display = show ? 'none' : 'block';
      D.togglePassword.querySelector('.eye-closed').style.display = show ? 'block' : 'none';
    },
    logout() {
      SS.del(CFG.KEY.session);
      D.mainApp.classList.add('hidden');
      D.loginScreen.style.display = '';
      D.passwordInput.value = '';
      D.passwordInput.type = 'password';
      D.togglePassword.querySelector('.eye-open').style.display = 'block';
      D.togglePassword.querySelector('.eye-closed').style.display = 'none';
      D.passwordInput.focus();
    },
  };

  // ======================== CLOCK ========================
  const Clock = {
    start() { this.tick(); setInterval(() => this.tick(), 1000); },
    tick() { D.liveClock.textContent = U.time(); },
  };

  // ======================== INVOICE ========================
  const Invoice = {
    generate() {
      const d = U.today().replace(/-/g, '');
      const stored = localStorage.getItem(CFG.KEY.invDate);
      let c = parseInt(localStorage.getItem(CFG.KEY.invCounter) || '0', 10);
      if (stored !== d) { c = 0; localStorage.setItem(CFG.KEY.invDate, d); }
      c++;
      localStorage.setItem(CFG.KEY.invCounter, String(c));
      return `MF-${d}-${String(c).padStart(4, '0')}`;
    },
    peek() {
      const d = U.today().replace(/-/g, '');
      const stored = localStorage.getItem(CFG.KEY.invDate);
      let c = parseInt(localStorage.getItem(CFG.KEY.invCounter) || '0', 10);
      if (stored !== d) c = 0;
      return `MF-${d}-${String(c + 1).padStart(4, '0')}`;
    },
    refresh() {
      D.invoiceId.textContent = this.peek();
      D.invoiceDate.textContent = U.dateAr(new Date());
    },
  };

  // ======================== AUTOCOMPLETE ========================
  const AC = {
    idx: -1,
    init() {
      D.productName.addEventListener('input', () => this.search());
      D.productName.addEventListener('focus', () => this.search());
      D.productName.addEventListener('keydown', e => this.key(e));
      document.addEventListener('click', e => { if (!e.target.closest('.autocomplete-wrap')) this.close(); });
    },
    search() {
      const v = D.productName.value.trim();
      if (!v) { this.close(); return; }
      const hits = state.products.filter(p => p.includes(v)).slice(0, 8);
      if (!hits.length) { this.close(); return; }
      this.idx = -1;
      D.autocompleteList.innerHTML = hits.map((h, i) => {
        const hl = h.replace(new RegExp(`(${U.escRx(v)})`, 'gi'), '<mark>$1</mark>');
        return `<li data-i="${i}" data-v="${h}">${hl}</li>`;
      }).join('');
      D.autocompleteList.classList.add('show');
      D.autocompleteList.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', () => { D.productName.value = li.dataset.v; this.close(); D.quantity.focus(); });
      });
    },
    key(e) {
      const items = D.autocompleteList.querySelectorAll('li');
      if (!items.length || !D.autocompleteList.classList.contains('show')) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); this.idx = Math.min(this.idx + 1, items.length - 1); this.hl(items); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.idx = Math.max(this.idx - 1, 0); this.hl(items); }
      else if (e.key === 'Enter' && this.idx >= 0) { e.preventDefault(); D.productName.value = items[this.idx].dataset.v; this.close(); D.quantity.focus(); }
      else if (e.key === 'Escape') this.close();
    },
    hl(items) {
      items.forEach(li => li.classList.remove('active'));
      if (this.idx >= 0 && items[this.idx]) { items[this.idx].classList.add('active'); items[this.idx].scrollIntoView({ block: 'nearest' }); }
    },
    close() { D.autocompleteList.classList.remove('show'); D.autocompleteList.innerHTML = ''; this.idx = -1; },
    add(name) {
      const n = name.trim();
      if (!n || state.products.includes(n)) return;
      state.products.push(n);
      state.products.sort((a, b) => a.localeCompare(b, 'ar'));
      U.saveProd();
    },
  };

  // ======================== DASHBOARD ========================
  const Dash = {
    update() {
      const day = U.today();
      const rows = state.tx.filter(t => t.date === day);
      const sales = rows.reduce((s, r) => s + (r.totalBeforeDiscount || r.quantity * r.unitPrice), 0);

      const discount = rows.reduce((s, r) => s + r.discount, 0);

      const net = rows.reduce((s, r) => s + r.netTotal, 0);
      this.anim(D.totalSales, sales);
      this.anim(D.totalDiscounts, discount);
      this.anim(D.netRevenue, net);
      D.transactionCount.textContent = rows.length;
    },
    anim(el, to) {
      const from = parseFloat(el.textContent) || 0;
      if (Math.abs(from - to) < 0.01) { el.textContent = U.fmt(to); return; }
      const dur = 380, t0 = performance.now();
      const step = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = U.fmt(from + (to - from) * e);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
  };

  // ======================== TRANSACTIONS TABLE ========================
  const TxTable = {
    render() {
      const rows = state.tx.filter(t => t.date === U.today()).reverse();
      if (!rows.length) {
        D.transactionsTable.style.display = 'none';
        D.emptyState.style.display = '';
        return;
      }
      D.transactionsTable.style.display = '';
      D.emptyState.style.display = 'none';
      D.transactionsBody.innerHTML = rows.map((r, i) => {
        const sub = r.totalBeforeDiscount || (r.quantity * r.unitPrice);
        return `<tr class="${i === 0 ? 'row-new' : ''}">
          <td>${r.invoiceId}</td><td>${r.productName}</td><td>${r.quantity}</td><td>${r.unit}</td>
          <td>${U.fmt(r.unitPrice)}</td><td>${U.fmt(sub)}</td><td>${U.fmt(r.discount)}</td>
          <td><strong>${U.fmt(r.netTotal)}</strong></td><td>${r.time}</td></tr>`;
      }).join('');
    },
  };

  // ======================== NUMERIC INPUT UX ========================
  const NumericUX = {
    init() {
      // Prevent mouse wheel changing values
      document.addEventListener('wheel', () => {
        if (document.activeElement && document.activeElement.type === 'number') {
          document.activeElement.blur();
        }
      }, { passive: true });

      // Smart focus/blur for numeric fields
      document.querySelectorAll('input[type="number"]').forEach(inp => {
        inp.addEventListener('focus', () => {
          // Select all content so user can immediately type a new value
          setTimeout(() => inp.select(), 0);
        });
        inp.addEventListener('blur', () => {
          const def = inp.dataset.default;
          if (def !== undefined && (inp.value === '' || inp.value === null)) {
            inp.value = def;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });
      });
    },
  };

  // ======================== SALES FORM ========================
  const Sales = {
    init() {
      D.salesForm.addEventListener('submit', e => this.submit(e));
      D.salesForm.addEventListener('reset', () => {
        setTimeout(() => {
          D.computedSubtotal.textContent = '0.00';
          D.computedTotal.textContent = '0.00';
          D.quantity.value = '1';
          D.discount.value = '0';
          Invoice.refresh();
        }, 0);
      });
      [D.quantity, D.unitPrice, D.discount].forEach(el => el.addEventListener('input', () => this.calc()));
      D.clearTransactions.addEventListener('click', () => this.clearDay());
    },
    calc() {
      const q = parseFloat(D.quantity.value) || 0;
      const p = parseFloat(D.unitPrice.value) || 0;
      const d = parseFloat(D.discount.value) || 0;
      const sub = q * p;
      const net = Math.max(sub - d, 0);
      D.computedSubtotal.textContent = U.fmt(sub);
      D.computedTotal.textContent = U.fmt(net);
    },
    async submit(e) {
      e.preventDefault();
      const name = D.productName.value.trim();
      const qty = parseFloat(D.quantity.value) || 0;
      const unit = D.unit.value;
      const price = parseFloat(D.unitPrice.value) || 0;
      const disc = parseFloat(D.discount.value) || 0;
      const notes = D.notes.value.trim();
      const sub = qty * price;
      const total = Math.max(sub - disc, 0);

      if (!name) { Toast.err('يرجى إدخال اسم المنتج'); D.productName.focus(); return; }
      if (qty <= 0) { Toast.err('يرجى إدخال كمية صحيحة'); D.quantity.focus(); return; }
      if (price <= 0) { Toast.err('يرجى إدخال سعر الوحدة'); D.unitPrice.focus(); return; }
      if (disc > sub) { Toast.err('الخصم لا يمكن أن يتجاوز الإجمالي'); D.discount.focus(); return; }

      const id = Invoice.generate();
      const date = U.today();
      const time = U.timeShort();
      const rec = {
        invoiceId: id,
        productName: name,
        quantity: qty,
        unit,
        unitPrice: price,
        discount: disc,
        totalBeforeDiscount: sub,
        netTotal: total,
        notes,
        user: 'Admin',
        date,
        time
      };
      // Loading state
      const bT = D.submitSale.querySelector('.btn-text');
      const bL = D.submitSale.querySelector('.btn-loader');
      bT.style.display = 'none'; bL.style.display = 'block'; D.submitSale.disabled = true;

      // Optimistic local save
      state.tx.push(rec);
      U.saveTx();
      AC.add(name);
      Dash.update();
      TxTable.render();

      // Google Sheets
      try {
        await fetch(CFG.SHEETS_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) });
        Toast.ok('تم تسجيل عملية البيع بنجاح');
      } catch (err) {
        console.error('Sheets:', err);
        Toast.info('تم الحفظ محلياً — سيتم المزامنة لاحقاً');
      }

      // Reset
      D.salesForm.reset();
      D.computedSubtotal.textContent = '0.00';
      D.computedTotal.textContent = '0.00';
      D.quantity.value = '1';
      D.discount.value = '0';
      Invoice.refresh();
      bT.style.display = ''; bL.style.display = 'none'; D.submitSale.disabled = false;
      D.productName.focus();
    },
    clearDay() {
      if (!confirm('هل أنت متأكد من مسح جميع معاملات اليوم؟')) return;
      const d = U.today();
      state.tx = state.tx.filter(t => t.date !== d);
      U.saveTx();
      Dash.update();
      TxTable.render();
      Toast.info('تم مسح معاملات اليوم');
    },
  };

  // ======================== APP ========================
  const App = {
    init() {
      cacheDom();
      Auth.init();
    },
    ready() {
      Theme.init();
      Clock.start();
      NumericUX.init();
      Invoice.refresh();
      AC.init();
      Sales.init();
      Dash.update();
      TxTable.render();
    },
  };

  document.addEventListener('DOMContentLoaded', App.init);

  // Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
  }
})();
