// ============================================================
// PORTAL ADMINISTRASI PANITIA SUBSEKSI — KOSAYU ARTFEST 2026
// Autentikasi: Username: "artfest", Password: "2026"
// ============================================================

const VALID_USERNAME = "artfest";
const VALID_PASSWORD = "2026";

// Real Active Orders (Initialized empty, populated directly from user orders)
let ordersData = [];

// Initialize on Load
document.addEventListener("DOMContentLoaded", () => {
	checkSessionAuth();
	loadStoredOrders();
});

// Check if admin is already logged in for current session
function checkSessionAuth() {
	const isAuth = sessionStorage.getItem("artfest_admin_authenticated") === "true";
	const loginView = document.getElementById("loginView");
	const dashboardView = document.getElementById("dashboardView");

	if (isAuth) {
		loginView.style.display = "none";
		dashboardView.style.display = "flex";
		renderOrdersTable();
		updateMetricCards();
		renderQuickOrderChips();
		loadTicketControlConfig();
	} else {
		loginView.style.display = "flex";
		dashboardView.style.display = "none";
	}
}

// Handle Login Form Submission
function handleAdminLogin(event) {
	event.preventDefault();

	const userField = document.getElementById("adminUsername");
	const passField = document.getElementById("adminPassword");
	const errorMsg = document.getElementById("loginErrorMsg");

	const enteredUser = userField.value.trim();
	const enteredPass = passField.value.trim();

	if (enteredUser === VALID_USERNAME && enteredPass === VALID_PASSWORD) {
		sessionStorage.setItem("artfest_admin_authenticated", "true");
		errorMsg.style.display = "none";
		userField.value = "";
		passField.value = "";

		checkSessionAuth();
		showToast("Login berhasil! Selamat datang di Portal Dasbor Subseksi Artfest 2026.");
	} else {
		errorMsg.style.display = "block";
		errorMsg.textContent = "Kredensial tidak valid. Periksa username dan password panitia.";
		passField.value = "";
		passField.focus();
	}
}

// Handle Logout
function handleAdminLogout() {
	if (confirm("Apakah Anda yakin ingin keluar dari Portal Dasbor Subseksi?")) {
		sessionStorage.removeItem("artfest_admin_authenticated");
		checkSessionAuth();
		showToast("Anda telah keluar dari sesi panitia.");
	}
}

// Toggle password input visibility
function togglePasswordVisibility() {
	const passInput = document.getElementById("adminPassword");
	if (passInput.type === "password") {
		passInput.type = "text";
	} else {
		passInput.type = "password";
	}
}

// Load orders directly from localStorage
function loadStoredOrders() {
	const stored = localStorage.getItem("hiddenIslandAllOrders");
	if (stored) {
		try {
			const parsed = JSON.parse(stored);
			if (Array.isArray(parsed)) {
				ordersData = parsed;
				return;
			}
		} catch (e) {
			console.error("Error loading stored orders", e);
		}
	}
	ordersData = [];
}

// Save orders to localStorage
function saveOrdersToStorage() {
	localStorage.setItem("hiddenIslandAllOrders", JSON.stringify(ordersData));
}

// Helper to escape HTML characters
function escapeHtml(str) {
	if (!str) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

// Render Orders Table
function renderOrdersTable(filterQuery = "") {
	const tbody = document.getElementById("ordersTableBody");
	if (!tbody) return;

	tbody.innerHTML = "";

	if (!ordersData || ordersData.length === 0) {
		tbody.innerHTML = `
			<tr>
				<td colspan="9" style="text-align:center; padding: 48px 24px; color:rgba(207,212,208,0.6);">
					<div style="display:flex; flex-direction:column; align-items:center; gap:12px;">
						<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:rgba(183,169,124,0.4);">
							<rect x="2" y="4" width="20" height="16" rx="2"></rect>
							<path d="M7 15h0M2 9.5h20"></path>
						</svg>
						<div style="font-size: 15px; font-weight: 600; color: #CFD4D0;">Belum Ada Data Pesanan Tiket</div>
						<div style="font-size: 13px; max-width: 440px; line-height: 1.5; color: rgba(207,212,208,0.5);">
							Pesanan dari pengunjung di halaman tiket (/tiket/) dan checkout (/checkout/) atau melalui tombol "+ Input Pesanan Tiket" akan otomatis tercatat di sini.
						</div>
					</div>
				</td>
			</tr>
		`;
		return;
	}

	const filtered = ordersData.filter(o => {
		if (!filterQuery) return true;
		const q = filterQuery.toLowerCase();
		return (o.name && o.name.toLowerCase().includes(q)) ||
			(o.id && o.id.toLowerCase().includes(q)) ||
			(o.email && o.email.toLowerCase().includes(q)) ||
			(o.tier && o.tier.toLowerCase().includes(q)) ||
			(o.phone && o.phone.toLowerCase().includes(q));
	});

	if (filtered.length === 0) {
		tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 28px; color:rgba(207,212,208,0.5);">Tidak ada pesanan yang sesuai kata kunci "${escapeHtml(filterQuery)}".</td></tr>`;
		return;
	}

	filtered.forEach(order => {
		const tr = document.createElement("tr");

		const totalNum = Number(order.total) || 0;
		const formattedTotal = "Rp " + totalNum.toLocaleString("id-ID");
		const statusBadge = order.status === "Lunas"
			? `<span class="statusBadgeSuccess">Lunas</span>`
			: `<span class="statusBadgePending">${escapeHtml(order.status || "Pending")}</span>`;

		const checkInStatus = order.checkedIn
			? `<span style="color:#a8d58a; font-weight:700; font-size:11px;">✓ Masuk (${escapeHtml(order.checkInTime || "Tervalidasi")})</span>`
			: `<span style="color:rgba(207,212,208,0.5); font-size:11px;">Belum Check-in</span>`;

		tr.innerHTML = `
			<td><strong style="color:#CFD4D0;">${escapeHtml(order.id)}</strong></td>
			<td><strong>${escapeHtml(order.name)}</strong></td>
			<td>
				<div style="font-size:12px;">${escapeHtml(order.email)}</div>
				<div style="font-size:11px; color:rgba(207,212,208,0.6);">${escapeHtml(order.phone)}</div>
			</td>
			<td><span class="tierTagTable">${escapeHtml(order.tier)}</span></td>
			<td>${order.qty || 1}</td>
			<td><strong>${formattedTotal}</strong></td>
			<td>${statusBadge}</td>
			<td>
				<div style="font-size:12px;">${escapeHtml(order.wristband || "Gelang Akses Standar")}</div>
				<div>${checkInStatus}</div>
			</td>
			<td>
				<button type="button" class="btnRowAction" onclick="toggleOrderCheckIn('${order.id}')">
					${order.checkedIn ? 'Batal Scan' : 'Check-in'}
				</button>
			</td>
		`;
		tbody.appendChild(tr);
	});
}

// Filter orders as user types
function filterOrdersTable() {
	const query = document.getElementById("orderSearchInput").value.trim();
	renderOrdersTable(query);
}

// Toggle Check-in status from orders table
function toggleOrderCheckIn(orderId) {
	const order = ordersData.find(o => o.id === orderId);
	if (!order) return;

	order.checkedIn = !order.checkedIn;
	if (order.checkedIn) {
		order.checkInTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB";
	} else {
		delete order.checkInTime;
	}

	saveOrdersToStorage();
	renderOrdersTable(document.getElementById("orderSearchInput").value.trim());
	renderQuickOrderChips();

	if (order.checkedIn) {
		showToast(`ID ${orderId} (${order.name}) berhasil di-check-in!`);
	} else {
		showToast(`Status check-in untuk ID ${orderId} dibatalkan.`);
	}
}

// Update Unboxed Metrics
function updateMetricCards() {
	const totalTicketsElem = document.getElementById("metricTotalTickets");
	const totalRevenueElem = document.getElementById("metricTotalRevenue");
	const quotaSubtextElem = document.getElementById("metricQuotaSubtext");
	const revenueSubtextElem = document.getElementById("metricRevenueSubtext");

	const totalQty = ordersData.reduce((acc, o) => acc + (Number(o.qty) || 1), 0);
	const totalRev = ordersData.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

	const cfg = getStoredTicketConfig();
	const maxSeatsTotal = (cfg.presale1?.maxSeats || 500) + (cfg.presale2?.maxSeats || 750);
	const pct = maxSeatsTotal > 0 ? ((totalQty / maxSeatsTotal) * 100).toFixed(1) : "0.0";

	if (totalTicketsElem) totalTicketsElem.textContent = totalQty.toLocaleString("id-ID");
	if (quotaSubtextElem) quotaSubtextElem.textContent = `Target: ${maxSeatsTotal.toLocaleString("id-ID")} tiket (${pct}% kuota)`;

	if (totalRevenueElem) totalRevenueElem.textContent = "Rp " + totalRev.toLocaleString("id-ID");
	if (revenueSubtextElem) revenueSubtextElem.textContent = `Dari ${ordersData.length} transaksi pemesanan`;
}

// Switch between Admin Tabs
function switchAdminTab(tabName) {
	const tabs = ["orders", "tickets", "scanner"];

	tabs.forEach(t => {
		const btn = document.getElementById(`btnTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
		const panel = document.getElementById(`panel${t.charAt(0).toUpperCase() + t.slice(1)}`);

		if (btn) btn.classList.remove("active");
		if (panel) panel.classList.remove("active");
	});

	const activeBtn = document.getElementById(`btnTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
	const activePanel = document.getElementById(`panel${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);

	if (activeBtn) activeBtn.classList.add("active");
	if (activePanel) activePanel.classList.add("active");
}

// Gate Check - In Verification Handler
function processTicketScan() {
	const input = document.getElementById("scanTicketInput");
	const resultBox = document.getElementById("scanResultDisplay");
	if (!input || !resultBox) return;

	const ticketId = input.value.trim().toUpperCase();

	if (!ticketId) {
		alert("Harap masukkan ID Pesanan tiket.");
		input.focus();
		return;
	}

	const found = ordersData.find(o => o.id && o.id.trim().toUpperCase() === ticketId);

	if (found) {
		// Case A: Ticket is already checked in
		if (found.checkedIn) {
			resultBox.className = "scanResultBox alreadyChecked";
			resultBox.innerHTML = `
				<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e6c35c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:8px;">
					<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
					<line x1="12" y1="9" x2="12" y2="13"></line>
					<line x1="12" y1="17" x2="12.01" y2="17"></line>
				</svg>
				<h4 style="margin:0 0 4px 0; color:#e6c35c; font-family:'Syne',sans-serif; font-size:18px;">PERINGATAN: TIKET SUDAH DIGUNAKAN</h4>
				<div style="font-size:14px; margin-bottom:4px;"><strong>${escapeHtml(found.name)}</strong> • ${found.qty || 1} Tiket (${escapeHtml(found.tier)})</div>
				<div style="font-size:12px; color:rgba(207,212,208,0.7); margin-bottom:10px;">ID: ${escapeHtml(found.id)} • Telah Check-in: <strong>${escapeHtml(found.checkInTime || "Sesi Sebelumnya")}</strong></div>
				<div class="wristbandBadge" style="background-color:rgba(180,140,40,0.25); border:1px solid #e6c35c; color:#e6c35c;">
					⚠️ JANGAN BERIKAN GELANG GANDA
				</div>
			`;
			showToast(`Peringatan: ID ${found.id} sudah pernah di-check-in!`);
			return;
		}

		// Case B: First-time valid check-in
		found.checkedIn = true;
		found.checkInTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB";
		saveOrdersToStorage();
		renderOrdersTable();
		updateMetricCards();
		renderQuickOrderChips();

		let bandColor = "#B7A97C";
		if (found.tier.includes("Presale 1")) bandColor = "#5ba862";
		else if (found.tier.includes("Presale 2")) bandColor = "#4da3ff";
		else if (found.tier.includes("VIP")) bandColor = "#e6c35c";

		resultBox.className = "scanResultBox valid";
		resultBox.innerHTML = `
			<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#a8d58a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:8px;">
				<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
				<polyline points="22 4 12 14.01 9 11.01"></polyline>
			</svg>
			<h4 style="margin:0 0 4px 0; color:#a8d58a; font-family:'Syne',sans-serif; font-size:18px;">TIKET VALID — CHECK-IN BERHASIL</h4>
			<div style="font-size:14px; margin-bottom:4px;"><strong>${escapeHtml(found.name)}</strong> • ${found.qty || 1} Tiket (${escapeHtml(found.tier)})</div>
			<div style="font-size:12px; color:rgba(207,212,208,0.7); margin-bottom:10px;">ID: ${escapeHtml(found.id)} • Waktu Masuk: ${found.checkInTime}</div>
			<div class="wristbandBadge" style="background-color:rgba(33,61,58,0.8); border:1px solid ${bandColor}; color:${bandColor};">
				<span>Serahkan Gelang:</span>
				<strong>${escapeHtml(found.wristband || "Akses Standar")}</strong>
			</div>
		`;
		showToast(`✓ Check-in sukses: ${found.name} (${found.qty || 1} tiket) diizinkan masuk.`);
	} else {
		// Case C: ID not found in database
		resultBox.className = "scanResultBox invalid";
		resultBox.innerHTML = `
			<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ff7b7b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:8px;">
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="15" y1="9" x2="9" y2="15"></line>
				<line x1="9" y1="9" x2="15" y2="15"></line>
			</svg>
			<h4 style="margin:0 0 4px 0; color:#ff7b7b; font-family:'Syne',sans-serif; font-size:18px;">ID TIKET TIDAK DITEMUKAN</h4>
			<div style="font-size:13px; color:rgba(207,212,208,0.75);">Kode ID "${escapeHtml(ticketId)}" tidak terdaftar dalam database resmi pesanan Artfest 2026.</div>
		`;
		showToast("Peringatan: ID Tiket tidak dikenali!");
	}
}

// Quick fill chip helper for Gate Check - In
function quickFillScan(id) {
	const input = document.getElementById("scanTicketInput");
	if (input) {
		input.value = id;
		processTicketScan();
	}
}

// Render dynamic quick chips from actual orders in Gate Check - In panel
function renderQuickOrderChips() {
	const wrapper = document.getElementById("quickOrderChipsWrapper");
	if (!wrapper) return;

	wrapper.innerHTML = "";

	if (!ordersData || ordersData.length === 0) {
		wrapper.innerHTML = `<span style="font-size: 12px; color: rgba(207,212,208,0.5);">Belum ada tiket terdaftar. Buat pesanan via /tiket/ atau klik "+ Input Pesanan Tiket" di atas.</span>`;
		return;
	}

	// Show up to the first 8 orders
	const recentOrders = ordersData.slice(0, 8);
	recentOrders.forEach(order => {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = `quickOrderChip ${order.checkedIn ? 'checked' : ''}`;
		btn.title = `${order.name} - ${order.tier}`;
		btn.innerHTML = `
			<strong>${escapeHtml(order.id)}</strong>
			<span>${escapeHtml(order.name.split(" ")[0])}</span>
			<span>(${escapeHtml(order.tier)})</span>
			${order.checkedIn ? '<span style="color:#a8d58a;">✓</span>' : ''}
		`;
		btn.onclick = () => quickFillScan(order.id);
		wrapper.appendChild(btn);
	});
}

// Manual / Walk-in Order Modal Handlers
function openManualOrderModal() {
	const modal = document.getElementById("manualOrderModal");
	if (!modal) return;
	updateManualOrderPriceCalc();
	modal.showModal();
}

function closeManualOrderModal() {
	const modal = document.getElementById("manualOrderModal");
	if (modal) modal.close();
}

function updateManualOrderPriceCalc() {
	const tierSelect = document.getElementById("manualTierSelect");
	const qtyInput = document.getElementById("manualQtyInput");
	const totalDisplay = document.getElementById("manualTotalDisplay");
	if (!tierSelect || !qtyInput || !totalDisplay) return;

	const cfg = getStoredTicketConfig();
	const tierKey = tierSelect.value;
	const price = cfg[tierKey] ? cfg[tierKey].price : (tierKey === "presale1" ? 75000 : 90000);
	const qty = parseInt(qtyInput.value, 10) || 1;
	const total = price * qty;

	totalDisplay.textContent = "Rp " + total.toLocaleString("id-ID");
}

function handleManualOrderSubmit(event) {
	event.preventDefault();

	const name = document.getElementById("manualCustName").value.trim();
	const email = document.getElementById("manualCustEmail").value.trim();
	const phone = document.getElementById("manualCustPhone").value.trim();
	const tierKey = document.getElementById("manualTierSelect").value;
	const qty = parseInt(document.getElementById("manualQtyInput").value, 10) || 1;

	const cfg = getStoredTicketConfig();
	const tierName = cfg[tierKey] ? cfg[tierKey].name : (tierKey === "presale1" ? "Presale 1" : "Presale 2");
	const unitPrice = cfg[tierKey] ? cfg[tierKey].price : (tierKey === "presale1" ? 75000 : 90000);
	const total = unitPrice * qty;

	let wristbandStr = "Zamrud (Akses Standar Presale 1)";
	if (tierKey === "presale2") wristbandStr = "Safir (Akses Standar Presale 2)";

	const randomId = "HI-2026-" + String(Math.floor(100 + Math.random() * 900));

	const newOrder = {
		id: randomId,
		name: name,
		email: email,
		phone: phone,
		tier: tierName,
		qty: qty,
		total: total,
		status: "Lunas",
		wristband: wristbandStr,
		checkedIn: false,
		date: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
	};

	ordersData.unshift(newOrder);
	saveOrdersToStorage();

	// Update quota in ticket control config
	if (cfg[tierKey]) {
		cfg[tierKey].soldSeats = (cfg[tierKey].soldSeats || 0) + qty;
		localStorage.setItem("artfest_ticket_config", JSON.stringify(cfg));
		loadTicketControlConfig();
	}

	renderOrdersTable();
	updateMetricCards();
	renderQuickOrderChips();
	closeManualOrderModal();
	event.target.reset();

	showToast(`✓ Pesanan baru berhasil ditambahkan: ${randomId} (${name})`);
}

// Clear All Orders Data (Reset)
function clearAllOrdersData() {
	if (ordersData.length === 0) {
		showToast("Data pesanan tiket sudah kosong.");
		return;
	}

	if (confirm("Apakah Anda yakin ingin mengosongkan semua data pesanan tiket? Tindakan ini tidak dapat dibatalkan.")) {
		ordersData = [];
		localStorage.removeItem("hiddenIslandAllOrders");
		// Also reset soldSeats in ticket config so quotas return to full availability
		const cfg = getStoredTicketConfig();
		cfg.presale1.soldSeats = 0;
		cfg.presale2.soldSeats = 0;
		localStorage.setItem("artfest_ticket_config", JSON.stringify(cfg));
		loadTicketControlConfig();
		renderOrdersTable();
		updateMetricCards();
		renderQuickOrderChips();
		showToast("Data pesanan tiket dan kuota terjual telah berhasil dikosongkan.");
	}
}

// Export Orders to Clean & Readable CSV (UTF-8 BOM + Escaped Formatting)
function exportOrdersCSV() {
	if (!ordersData || ordersData.length === 0) {
		showToast("Belum ada data pesanan tiket untuk diekspor.");
		return;
	}

	const headers = [
		"No",
		"ID Pesanan",
		"Waktu Pesanan",
		"Nama Pemesan",
		"Email",
		"Nomor WhatsApp / Kontak",
		"Kategori Tiket",
		"Jumlah (Qty)",
		"Total Tagihan (IDR)",
		"Status Pembayaran",
		"Status Gate Check-in",
		"Waktu Check-in",
		"Wristband / Gelang"
	];

	const escapeCsv = (val) => {
		if (val === null || val === undefined) return '""';
		const str = String(val).replace(/"/g, '""');
		return `"${str}"`;
	};

	const rows = ordersData.map((o, idx) => [
		idx + 1,
		o.id || "-",
		o.date || o.orderDate || new Date().toLocaleDateString("id-ID"),
		o.name || "-",
		o.email || "-",
		o.phone || "-",
		o.tier || "-",
		Number(o.qty) || 1,
		Number(o.total) || 0,
		o.status || "Lunas",
		o.checkedIn ? "Sudah Masuk (Check-in)" : "Belum Check-in",
		o.checkInTime || "-",
		o.wristband || "-"
	].map(escapeCsv).join(","));

	const csvContent = "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows].join("\r\n");

	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	const dateStr = new Date().toISOString().slice(0, 10);
	link.setAttribute("href", url);
	link.setAttribute("download", `Data_Pesanan_Kosayu_Artfest_2026_${dateStr}.csv`);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);

	showToast("✓ File CSV berhasil diunduh dengan data rapi & terbaca.");
}

// Show Toast
let toastTimer = null;
function showToast(msg) {
	const toast = document.getElementById("adminToast");
	if (!toast) return;

	toast.textContent = msg;
	toast.classList.add("show");
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => {
		toast.classList.remove("show");
	}, 3500);
}

// ============================================================
// TICKET PRICING, MAX SEAT & AVAILABILITY CONTROL
// ============================================================

const DEFAULT_TICKET_CONFIG = {
	presale1: {
		name: "Presale 1",
		price: 75000,
		maxSeats: 500,
		soldSeats: 0,
		status: "available", // available, sold_out, paused, coming_soon
		subtitle: "Akses panggung festival & event kit"
	},
	presale2: {
		name: "Presale 2",
		price: 90000,
		maxSeats: 750,
		soldSeats: 0,
		status: "available",
		subtitle: "Akses panggung festival & event kit"
	}
};

function getStoredTicketConfig() {
	const raw = localStorage.getItem("artfest_ticket_config");
	let cfg;
	if (!raw) {
		cfg = JSON.parse(JSON.stringify(DEFAULT_TICKET_CONFIG));
	} else {
		try {
			const parsed = JSON.parse(raw);
			cfg = {
				presale1: { ...DEFAULT_TICKET_CONFIG.presale1, ...parsed.presale1 },
				presale2: { ...DEFAULT_TICKET_CONFIG.presale2, ...parsed.presale2 }
			};
		} catch (e) {
			cfg = JSON.parse(JSON.stringify(DEFAULT_TICKET_CONFIG));
		}
	}

	// Calculate actual sold seats from ordersData if not explicitly set higher
	const p1OrdersSold = ordersData
		.filter(o => o.tier && o.tier.toLowerCase().includes("presale 1"))
		.reduce((sum, o) => sum + (Number(o.qty) || 1), 0);
	const p2OrdersSold = ordersData
		.filter(o => o.tier && o.tier.toLowerCase().includes("presale 2"))
		.reduce((sum, o) => sum + (Number(o.qty) || 1), 0);

	if ((cfg.presale1.soldSeats || 0) < p1OrdersSold) {
		cfg.presale1.soldSeats = p1OrdersSold;
	}
	if ((cfg.presale2.soldSeats || 0) < p2OrdersSold) {
		cfg.presale2.soldSeats = p2OrdersSold;
	}
	return cfg;
}

function loadTicketControlConfig() {
	const cfg = getStoredTicketConfig();

	['presale1', 'presale2'].forEach(tier => {
		const data = cfg[tier];
		if (!data) return;

		const priceInput = document.getElementById(`priceInput-${tier}`);
		const seatsInput = document.getElementById(`seatsInput-${tier}`);
		const soldInput = document.getElementById(`soldInput-${tier}`);
		const statusSelect = document.getElementById(`statusSelect-${tier}`);

		if (priceInput) priceInput.value = data.price;
		if (seatsInput) seatsInput.value = data.maxSeats;
		if (soldInput) soldInput.value = data.soldSeats || 0;
		if (statusSelect) statusSelect.value = data.status;

		updateTierVisuals(tier, data.soldSeats || 0, data.maxSeats, data.status);
	});
}

function handleTicketFieldChange(tier) {
	const seatsInput = document.getElementById(`seatsInput-${tier}`);
	const soldInput = document.getElementById(`soldInput-${tier}`);
	const statusSelect = document.getElementById(`statusSelect-${tier}`);

	const max = parseInt(seatsInput.value, 10) || 1;
	const sold = parseInt(soldInput.value, 10) || 0;
	const status = statusSelect.value;

	updateTierVisuals(tier, sold, max, status);
}

function updateTierVisuals(tier, sold, max, status) {
	const ratioEl = document.getElementById(`statsRatio-${tier}`);
	const remainEl = document.getElementById(`statsRemain-${tier}`);
	const progressFill = document.getElementById(`progressFill-${tier}`);
	const statusPill = document.getElementById(`statusPill-${tier}`);
	const statusText = document.getElementById(`statusText-${tier}`);

	const remaining = Math.max(0, max - sold);
	const pct = Math.min(100, Math.max(0, (sold / max) * 100));

	if (ratioEl) ratioEl.textContent = `${sold.toLocaleString("id-ID")} / ${max.toLocaleString("id-ID")}`;
	if (remainEl) remainEl.textContent = remaining.toLocaleString("id-ID");
	if (progressFill) progressFill.style.width = `${pct.toFixed(1)}%`;

	if (statusPill && statusText) {
		statusPill.className = `ticketStatusPill ${status}`;
		if (status === 'available') {
			statusText.textContent = remaining <= 0 ? 'Habis (Kuota Penuh)' : 'Tersedia';
			if (remaining <= 0) statusPill.className = 'ticketStatusPill sold_out';
		} else if (status === 'sold_out') {
			statusText.textContent = 'Sold Out';
		} else if (status === 'paused') {
			statusText.textContent = 'Ditutup';
		} else if (status === 'coming_soon') {
			statusText.textContent = 'Segera Hadir';
		}
	}
}

function saveTicketControlConfig() {
	const p1Price = parseInt(document.getElementById("priceInput-presale1").value, 10) || 0;
	const p1Max = parseInt(document.getElementById("seatsInput-presale1").value, 10) || 1;
	const p1Sold = parseInt(document.getElementById("soldInput-presale1").value, 10) || 0;
	const p1Status = document.getElementById("statusSelect-presale1").value;

	const p2Price = parseInt(document.getElementById("priceInput-presale2").value, 10) || 0;
	const p2Max = parseInt(document.getElementById("seatsInput-presale2").value, 10) || 1;
	const p2Sold = parseInt(document.getElementById("soldInput-presale2").value, 10) || 0;
	const p2Status = document.getElementById("statusSelect-presale2").value;

	const config = {
		presale1: {
			name: "Presale 1",
			price: p1Price,
			maxSeats: p1Max,
			soldSeats: p1Sold,
			status: p1Status,
			subtitle: "Akses panggung festival & event kit"
		},
		presale2: {
			name: "Presale 2",
			price: p2Price,
			maxSeats: p2Max,
			soldSeats: p2Sold,
			status: p2Status,
			subtitle: "Akses panggung festival & event kit"
		}
	};

	localStorage.setItem("artfest_ticket_config", JSON.stringify(config));
	updateMetricCards();

	const indicator = document.getElementById("saveStatusIndicator");
	if (indicator) {
		indicator.style.display = "inline";
		setTimeout(() => {
			indicator.style.display = "none";
		}, 4000);
	}

	showToast("✓ Pengaturan harga, kuota kursi, dan status ketersediaan tiket berhasil disimpan!");
}

function resetTicketControlConfig() {
	if (!confirm("Kembalikan harga dan kuota tiket ke pengaturan default awal?")) return;
	localStorage.removeItem("artfest_ticket_config");
	loadTicketControlConfig();
	updateMetricCards();
	showToast("Pengaturan tiket telah di-reset ke nilai default.");
}

// Cross-tab real-time sync: when an order is submitted at checkout or config updated in another tab
window.addEventListener("storage", (e) => {
	if (e.key === "hiddenIslandAllOrders" || e.key === "artfest_ticket_config") {
		loadStoredOrders();
		renderOrdersTable();
		updateMetricCards();
		renderQuickOrderChips();
		loadTicketControlConfig();
	}
});
