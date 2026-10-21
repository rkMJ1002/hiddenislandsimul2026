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
		initCloudSyncInDashboard();
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

	if (window.ArtfestCloud && typeof window.ArtfestCloud.updateOrderCheckIn === "function") {
		window.ArtfestCloud.updateOrderCheckIn(order.id, order.checkedIn, order.checkInTime || "");
	} else {
		saveOrdersToStorage();
	}
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
	const tabs = ["orders", "tickets"];

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

	if (tabName === "tickets") {
		loadTicketControlConfig();
	}
}

// Gate Check - In Verification Handler

// Web Audio API Synthesizer for Gate Check-In
function playAdminGateSound(type) {
	try {
		const AudioContextClass = window.AudioContext || window.webkitAudioContext;
		if (!AudioContextClass) return;
		const ctx = new AudioContextClass();
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.connect(gain);
		gain.connect(ctx.destination);

		if (type === "success") {
			osc.type = "sine";
			osc.frequency.setValueAtTime(880, now);
			osc.frequency.setValueAtTime(1760, now + 0.08);
			gain.gain.setValueAtTime(0.3, now);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
			osc.start(now);
			osc.stop(now + 0.31);
		} else if (type === "warning") {
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(320, now);
			gain.gain.setValueAtTime(0.25, now);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
			osc.start(now);
			osc.stop(now + 0.26);
		} else {
			osc.type = "square";
			osc.frequency.setValueAtTime(160, now);
			gain.gain.setValueAtTime(0.28, now);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
			osc.start(now);
			osc.stop(now + 0.36);
		}
	} catch (e) {}
}

// Handler for Subseksi PDF Upload
async function handleSubseksiPdfUpload(event) {
	const file = event.target.files && event.target.files[0];
	if (!file) return;

	showToast("Menganalisis file PDF: " + file.name + "...");

	try {
		if (window.pdfjsLib && (file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf"))) {
			window.pdfjsLib.GlobalWorkerOptions.workerSrc = "../shared/pdf.worker.min.js";
			const arrayBuffer = await file.arrayBuffer();
			const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
			const pdfDoc = await loadingTask.promise;
			const page = await pdfDoc.getPage(1);

			let detectedId = null;
			// 1. Check text content
			try {
				const textContent = await page.getTextContent();
				const text = textContent.items.map(i => i.str).join(" ");
				const match = text.match(/\b(HI-2026-\d{3,4}|HI-\d{4}-\d+)\b/i);
				if (match) detectedId = match[1].toUpperCase();
			} catch (e) {}

			// 2. Optical Canvas Barcode Scanner
			if (!detectedId) {
				const offCanvas = document.createElement("canvas");
				const viewport = page.getViewport({ scale: 2.0 });
				offCanvas.width = viewport.width;
				offCanvas.height = viewport.height;
				const ctx = offCanvas.getContext("2d");
				await page.render({ canvasContext: ctx, viewport }).promise;

				if ("BarcodeDetector" in window) {
					try {
						const detector = new window.BarcodeDetector({ formats: ["code_128", "code_39"] });
						const res = await detector.detect(offCanvas);
						if (res && res.length > 0) detectedId = res[0].rawValue.trim().toUpperCase();
					} catch (e) {}
				}

				if (!detectedId && window.ZXing) {
					try {
						const luminanceSource = new window.ZXing.HTMLCanvasElementLuminanceSource(offCanvas);
						const binaryBitmap = new window.ZXing.BinaryBitmap(new window.ZXing.HybridBinarizer(luminanceSource));
						const reader = new window.ZXing.MultiFormatReader();
						const zxRes = reader.decode(binaryBitmap);
						if (zxRes) detectedId = zxRes.getText().trim().toUpperCase();
					} catch (e) {}
				}
			}

			if (detectedId) {
				const input = document.getElementById("scanTicketInput");
				if (input) input.value = detectedId;
				processTicketScan(detectedId);
				showToast("✓ Barcode terdeteksi dari PDF: " + detectedId);
			} else {
				playAdminGateSound("error");
				alert("Tidak ditemukan barcode Code 128 atau ID tiket 'HI-2026-xxx' pada file PDF ini.");
			}
		} else {
			alert("Format file belum didukung. Harap upload dokumen .pdf e-ticket.");
		}
	} catch (err) {
		console.error("PDF parse error:", err);
		alert("Gagal membaca dokumen PDF: " + (err.message || err));
	}
	event.target.value = "";
}

function processTicketScan(overrideId) {
	const input = document.getElementById("scanTicketInput");
	const resultBox = document.getElementById("scanResultDisplay");
	if (!input || !resultBox) return;

	let rawVal = (overrideId || input.value || "").trim().toUpperCase();
	const regexMatch = rawVal.match(/\b(HI-2026-\d{3,4}|HI-\d{4}-\d+)\b/i);
	const ticketId = regexMatch ? regexMatch[1].toUpperCase() : rawVal;
	if (input && ticketId) input.value = ticketId;

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
			playAdminGateSound("warning");
			showToast(`⚠️ Peringatan: ID ${found.id} sudah pernah di-check-in!`);
			return;
		}

		// Case B: First-time valid check-in
		found.checkedIn = true;
		found.checkInTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB";
		if (window.ArtfestCloud && typeof window.ArtfestCloud.updateOrderCheckIn === "function") {
			window.ArtfestCloud.updateOrderCheckIn(found.id, true, found.checkInTime);
		} else {
			saveOrdersToStorage();
		}
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
		playAdminGateSound("success");
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
		playAdminGateSound("error");
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

	let wristbandStr = "Wristband Festival";

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

	if (window.ArtfestCloud && typeof window.ArtfestCloud.saveOrder === "function") {
		window.ArtfestCloud.saveOrder(newOrder);
	} else {
		ordersData.unshift(newOrder);
		saveOrdersToStorage();
	}

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

// Clear All Orders Data (Reset Permanently in Cloud & Local)
async function clearAllOrdersData() {
	if (ordersData.length === 0) {
		showToast("Data pesanan tiket sudah kosong.");
		return;
	}

	if (confirm("Apakah Anda yakin ingin mengosongkan semua data pesanan tiket secara global? Data akan dihapus dari cloud dan semua perangkat.")) {
		showToast("Sedang mengosongkan data di cloud...");

		if (window.ArtfestCloud && typeof window.ArtfestCloud.clearAllOrders === "function") {
			await window.ArtfestCloud.clearAllOrders();
		} else {
			ordersData = [];
			localStorage.setItem("hiddenIslandAllOrders", JSON.stringify([]));
			const cfg = getStoredTicketConfig();
			cfg.presale1.soldSeats = 0;
			cfg.presale2.soldSeats = 0;
			localStorage.setItem("artfest_ticket_config", JSON.stringify(cfg));
		}

		ordersData = [];
		renderOrdersTable();
		updateMetricCards();
		renderQuickOrderChips();
		loadTicketControlConfig();

		showToast("✓ Seluruh data pesanan & kuota tiket berhasil dikosongkan secara permanen.");
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
	let cfg = null;
	if (window.ArtfestCloud && typeof window.ArtfestCloud.getTicketConfig === "function") {
		cfg = window.ArtfestCloud.getTicketConfig();
	}
	if (!cfg) {
		const raw = localStorage.getItem("artfest_ticket_config");
		if (raw) {
			try {
				const parsed = JSON.parse(raw);
				cfg = {
					presale1: { ...DEFAULT_TICKET_CONFIG.presale1, ...parsed.presale1 },
					presale2: { ...DEFAULT_TICKET_CONFIG.presale2, ...parsed.presale2 }
				};
			} catch (e) {}
		}
	}
	if (!cfg) {
		cfg = JSON.parse(JSON.stringify(DEFAULT_TICKET_CONFIG));
	}

	// Always sync sold seats from active ordersData
	const p1OrdersSold = (ordersData || [])
		.filter(o => o.tier && o.tier.toLowerCase().includes("presale 1"))
		.reduce((sum, o) => sum + (Number(o.qty) || 1), 0);
	const p2OrdersSold = (ordersData || [])
		.filter(o => o.tier && o.tier.toLowerCase().includes("presale 2"))
		.reduce((sum, o) => sum + (Number(o.qty) || 1), 0);

	cfg.presale1.soldSeats = Math.max(cfg.presale1.soldSeats || 0, p1OrdersSold);
	cfg.presale2.soldSeats = Math.max(cfg.presale2.soldSeats || 0, p2OrdersSold);

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

		const soldCount = data.soldSeats || 0;
		const maxSeats = data.maxSeats || 1;

		if (priceInput) priceInput.value = data.price;
		if (seatsInput) seatsInput.value = maxSeats;
		if (soldInput) soldInput.value = soldCount;
		if (statusSelect) statusSelect.value = data.status;

		updateTierVisuals(tier, soldCount, maxSeats, data.status);
	});
}

let autoSaveTimer = null;
function handleTicketFieldChange(tier) {
	const seatsInput = document.getElementById(`seatsInput-${tier}`);
	const soldInput = document.getElementById(`soldInput-${tier}`);
	const statusSelect = document.getElementById(`statusSelect-${tier}`);

	const max = parseInt(seatsInput.value, 10) || 1;
	const sold = parseInt(soldInput.value, 10) || 0;
	const status = statusSelect.value;

	updateTierVisuals(tier, sold, max, status);

	// Debounced auto-save to cloud on any field change
	clearTimeout(autoSaveTimer);
	autoSaveTimer = setTimeout(() => {
		saveTicketControlConfig(true);
	}, 350);
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

function saveTicketControlConfig(isAutoSave = false) {
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

	if (window.ArtfestCloud && typeof window.ArtfestCloud.saveTicketConfig === "function") {
		window.ArtfestCloud.saveTicketConfig(config);
	} else {
		localStorage.setItem("artfest_ticket_config", JSON.stringify(config));
	}
	updateMetricCards();

	const indicator = document.getElementById("saveStatusIndicator");
	if (indicator) {
		indicator.textContent = isAutoSave ? "✓ Tersinkron ke Cloud" : "✓ Tersimpan di Cloud";
		indicator.style.display = "inline";
		clearTimeout(indicator._timer);
		indicator._timer = setTimeout(() => { indicator.style.display = "none"; }, 3000);
	}
	if (!isAutoSave) {
		showToast("✓ Pengaturan tiket berhasil disimpan & tersinkronisasi ke seluruh browser!");
	}
}

async function resetTicketControlConfig() {
	if (!confirm("Kembalikan harga, kuota, dan status tiket ke pengaturan default awal di cloud dan seluruh browser?")) return;
	showToast("Sedang me-reset pengaturan tiket...");

	const defaultCfg = JSON.parse(JSON.stringify(DEFAULT_TICKET_CONFIG));

	// Keep soldSeats accurate according to remaining orders
	const p1OrdersSold = (ordersData || [])
		.filter(o => o.tier && o.tier.toLowerCase().includes("presale 1"))
		.reduce((sum, o) => sum + (Number(o.qty) || 1), 0);
	const p2OrdersSold = (ordersData || [])
		.filter(o => o.tier && o.tier.toLowerCase().includes("presale 2"))
		.reduce((sum, o) => sum + (Number(o.qty) || 1), 0);

	defaultCfg.presale1.soldSeats = p1OrdersSold;
	defaultCfg.presale2.soldSeats = p2OrdersSold;

	localStorage.setItem("artfest_ticket_config", JSON.stringify(defaultCfg));

	if (window.ArtfestCloud && typeof window.ArtfestCloud.saveTicketConfig === "function") {
		await window.ArtfestCloud.saveTicketConfig(defaultCfg);
	}

	loadTicketControlConfig();
	updateMetricCards();
	showToast("✓ Pengaturan tiket telah di-reset ke nilai default awal di seluruh browser.");
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

// ============================================================
// FIREBASE CLOUD DATABASE SYNC HANDLERS
// ============================================================
let isCloudInitialized = false;

function initCloudSyncInDashboard() {
	if (isCloudInitialized || !window.ArtfestCloud) return;
	isCloudInitialized = true;

	// Listen to realtime cloud status
	window.ArtfestCloud.onStatus((status) => {
		updateCloudSyncBadge(status);
	});

	// Listen to realtime ticket updates
	window.ArtfestCloud.onTicketConfig((cfg) => {
		loadTicketControlConfig();
		updateMetricCards();
	});

	// Listen to realtime orders updates
	window.ArtfestCloud.onOrders((orders) => {
		ordersData = orders || [];
		renderOrdersTable(document.getElementById("orderSearchInput")?.value?.trim() || "");
		updateMetricCards();
		renderQuickOrderChips();
		loadTicketControlConfig();
	});
}

function updateCloudSyncBadge(status) {
	const dot = document.getElementById("cloudStatusDot");
	const text = document.getElementById("cloudStatusText");
	const box = document.getElementById("cloudStatusBox");

	if (!dot || !text) return;

	if (status && status.connected) {
		dot.className = "cloudDot connected";
		if (status.mode === "firebase") {
			text.textContent = `Cloud: ${status.projectId || "Firebase"}`;
			if (box) {
				box.className = "cloudStatusAlert connected";
				box.innerHTML = `<strong>🟢 Firebase Firestore Terhubung (${status.projectId})</strong><br>Sinkronisasi real-time aktif. Semua perubahan tiket dan pesanan langsung tersinkronisasi ke Opera, Chrome, dan ponsel.`;
			}
		} else {
			text.textContent = "Cloud: Aktif (Global Sync)";
			if (box) {
				box.className = "cloudStatusAlert connected";
				box.innerHTML = `<strong>🟢 Global Cloud Database Aktif</strong><br>Sinkronisasi otomatis aktif di seluruh browser (Opera, Chrome, Safari, dan HP). Anda juga dapat menghubungkan Firebase kustom jika diinginkan.`;
			}
		}
	} else if (status && status.connecting) {
		dot.className = "cloudDot";
		text.textContent = "Menghubungkan...";
		if (box) {
			box.className = "cloudStatusAlert";
			box.innerHTML = `<strong>Menghubungkan ke Cloud Database...</strong>`;
		}
	} else {
		dot.className = "cloudDot disconnected";
		text.textContent = "Penyimpanan Lokal";
		if (box) {
			box.className = "cloudStatusAlert disconnected";
			box.innerHTML = `<strong>⚠️ Mode: Penyimpanan Lokal (LocalStorage)</strong><br>Perubahan hanya tersimpan di browser ini. Hubungkan Firebase agar tersinkronisasi di semua browser & perangkat.`;
		}
	}
}

function openFirebaseConfigModal() {
	const modal = document.getElementById("firebaseConfigModal");
	if (!modal) return;

	const cfg = typeof window.getFirebaseConfig === "function" ? window.getFirebaseConfig() : null;
	if (cfg) {
		document.getElementById("fbApiKey").value = cfg.apiKey || "";
		document.getElementById("fbProjectId").value = cfg.projectId || "";
		document.getElementById("fbAuthDomain").value = cfg.authDomain || "";
		document.getElementById("fbAppId").value = cfg.appId || "";
	}

	modal.showModal();
}

function closeFirebaseConfigModal() {
	const modal = document.getElementById("firebaseConfigModal");
	if (modal) modal.close();
}

function handleSaveFirebaseConfig(event) {
	event.preventDefault();

	const apiKey = document.getElementById("fbApiKey").value.trim();
	const projectId = document.getElementById("fbProjectId").value.trim();
	const authDomain = document.getElementById("fbAuthDomain").value.trim() || `${projectId}.firebaseapp.com`;
	const appId = document.getElementById("fbAppId").value.trim() || "";

	if (!apiKey || !projectId) {
		alert("Harap isi API Key dan Project ID.");
		return;
	}

	const newCfg = {
		apiKey,
		projectId,
		authDomain,
		appId
	};

	if (typeof window.saveFirebaseConfig === "function") {
		window.saveFirebaseConfig(newCfg);
	} else {
		localStorage.setItem("artfest_firebase_config", JSON.stringify(newCfg));
	}

	if (window.ArtfestCloud && typeof window.ArtfestCloud.reconnect === "function") {
		window.ArtfestCloud.reconnect();
	}

	closeFirebaseConfigModal();
	showToast(`Konfigurasi Firebase untuk ${projectId} berhasil disimpan! Menghubungkan...`);
}

function handleClearFirebaseConfig() {
	if (!confirm("Putus sambungan dari Cloud Firestore dan kembali ke penyimpanan lokal?")) return;

	if (typeof window.saveFirebaseConfig === "function") {
		window.saveFirebaseConfig(null);
	} else {
		localStorage.removeItem("artfest_firebase_config");
	}

	if (window.ArtfestCloud && typeof window.ArtfestCloud.reconnect === "function") {
		window.ArtfestCloud.reconnect();
	}

	document.getElementById("fbApiKey").value = "";
	document.getElementById("fbProjectId").value = "";
	document.getElementById("fbAuthDomain").value = "";
	document.getElementById("fbAppId").value = "";
	document.getElementById("fbRawJson").value = "";

	closeFirebaseConfigModal();
	showToast("Sambungan Firebase telah diputus. Menggunakan penyimpanan lokal.");
}

function handleRawJsonInput() {
	const raw = document.getElementById("fbRawJson").value.trim();
	if (!raw) return;

	try {
		let jsonStr = raw;
		const match = raw.match(/\{([\s\S]*)\}/);
		if (match) {
			jsonStr = match[0];
		}

		const apiKeyMatch = jsonStr.match(/apiKey\s*:\s*["']([^"']+)["']/);
		const projectIdMatch = jsonStr.match(/projectId\s*:\s*["']([^"']+)["']/);
		const authDomainMatch = jsonStr.match(/authDomain\s*:\s*["']([^"']+)["']/);
		const appIdMatch = jsonStr.match(/appId\s*:\s*["']([^"']+)["']/);

		if (apiKeyMatch) document.getElementById("fbApiKey").value = apiKeyMatch[1];
		if (projectIdMatch) document.getElementById("fbProjectId").value = projectIdMatch[1];
		if (authDomainMatch) document.getElementById("fbAuthDomain").value = authDomainMatch[1];
		if (appIdMatch) document.getElementById("fbAppId").value = appIdMatch[1];
	} catch (e) {
		console.warn("Could not parse raw config JSON", e);
	}
}
