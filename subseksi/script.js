// ============================================================
// PORTAL ADMINISTRASI PANITIA — KOSAYU ARTFEST 2026
// Autentikasi: Username: "artfest", Password: "2026"
// ============================================================

const VALID_USERNAME = "artfest";
const VALID_PASSWORD = "2026";

// Demo Base Orders
let ordersData = [
	{
		id: "HI-2026-001",
		name: "Michelle Angela",
		email: "michelle.a@example.com",
		phone: "081234567890",
		tier: "VIP",
		qty: 2,
		total: 300000,
		status: "Lunas",
		wristband: "Emas (Akses Depan & VIP Kit)",
		checkedIn: false
	},
	{
		id: "HI-2026-002",
		name: "Brian Pratama",
		email: "brian.p@example.com",
		phone: "085712345678",
		tier: "Presale 1",
		qty: 1,
		total: 75000,
		status: "Lunas",
		wristband: "Zamrud (Akses Standar)",
		checkedIn: false
	},
	{
		id: "HI-2026-003",
		name: "Clara Wijaya",
		email: "clara.w@example.com",
		phone: "081398765432",
		tier: "Presale 2",
		qty: 2,
		total: 180000,
		status: "Lunas",
		wristband: "Zamrud (Akses Standar)",
		checkedIn: true
	},
	{
		id: "HI-2026-004",
		name: "David Santoso",
		email: "david.s@example.com",
		phone: "082155667788",
		tier: "Regular",
		qty: 1,
		total: 110000,
		status: "Lunas",
		wristband: "Perak (Akses Festival)",
		checkedIn: false
	},
	{
		id: "HI-2026-005",
		name: "Jessica Tan",
		email: "jessica.tan@example.com",
		phone: "081822334455",
		tier: "VIP",
		qty: 4,
		total: 600000,
		status: "Lunas",
		wristband: "Emas (Akses Depan & VIP Kit)",
		checkedIn: false
	}
];

// Initialize on Load
document.addEventListener("DOMContentLoaded", () => {
	checkSessionAuth();
	loadStoredOrders();
	loadStoredInquiries();
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
	} else {
		loginView.style.display = "flex";
		dashboardView.style.display = "none";
	}
}

// Load and display inquiries submitted via contact page
function loadStoredInquiries() {
	const stored = localStorage.getItem("hiddenIslandInquiries");
	const tbody = document.getElementById("inquiriesTableBody");
	if (!stored || !tbody) return;

	try {
		const parsed = JSON.parse(stored);
		if (Array.isArray(parsed) && parsed.length > 0) {
			parsed.forEach(inq => {
				const tr = document.createElement("tr");
				tr.innerHTML = `
					<td>${inq.date || "Baru saja"}</td>
					<td><strong style="color:#B7A97C;">${inq.target || "Panitia"}</strong></td>
					<td>${inq.name || "-"}</td>
					<td>${inq.category || "Umum"}</td>
					<td>${inq.message || "-"}</td>
					<td><span class="statusBadgeSuccess">${inq.status || "Terkirim"}</span></td>
				`;
				tbody.insertBefore(tr, tbody.firstChild);
			});
		}
	} catch (e) {
		console.log("Error loading stored inquiries", e);
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
		showToast("Login berhasil! Selamat datang di Portal Panitia Artfest 2026.");
	} else {
		errorMsg.style.display = "block";
		errorMsg.textContent = "Kredensial tidak valid. Periksa username dan password panitia.";
		passField.value = "";
		passField.focus();
	}
}

// Handle Logout
function handleAdminLogout() {
	if (confirm("Apakah Anda yakin ingin keluar dari Portal Panitia?")) {
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

// Load any orders saved from site checkout simulation
function loadStoredOrders() {
	const stored = localStorage.getItem("hiddenIslandAllOrders");
	if (stored) {
		try {
			const parsed = JSON.parse(stored);
			if (Array.isArray(parsed) && parsed.length > 0) {
				// Merge without duplicates
				parsed.forEach(p => {
					if (!ordersData.some(o => o.id === p.id)) {
						ordersData.unshift(p);
					}
				});
			}
		} catch (e) {
			console.log("Error loading stored orders", e);
		}
	}
}

// Save orders to localStorage
function saveOrdersToStorage() {
	localStorage.setItem("hiddenIslandAllOrders", JSON.stringify(ordersData));
}

// Render Orders Table
function renderOrdersTable(filterQuery = "") {
	const tbody = document.getElementById("ordersTableBody");
	if (!tbody) return;

	tbody.innerHTML = "";

	const filtered = ordersData.filter(o => {
		if (!filterQuery) return true;
		const q = filterQuery.toLowerCase();
		return o.name.toLowerCase().includes(q) ||
			o.id.toLowerCase().includes(q) ||
			o.email.toLowerCase().includes(q) ||
			o.tier.toLowerCase().includes(q);
	});

	if (filtered.length === 0) {
		tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 24px; color:rgba(207,212,208,0.5);">Tidak ada pesanan yang sesuai pencarian.</td></tr>`;
		return;
	}

	filtered.forEach(order => {
		const tr = document.createElement("tr");

		const formattedTotal = "Rp " + order.total.toLocaleString("id-ID");
		const statusBadge = order.status === "Lunas"
			? `<span class="statusBadgeSuccess">Lunas</span>`
			: `<span class="statusBadgePending">${order.status}</span>`;

		const checkInStatus = order.checkedIn
			? `<span style="color:#a8d58a; font-weight:700; font-size:11px;">✓ Sudah Masuk</span>`
			: `<span style="color:rgba(207,212,208,0.5); font-size:11px;">Belum Check-in</span>`;

		tr.innerHTML = `
			<td><strong style="color:#CFD4D0;">${order.id}</strong></td>
			<td><strong>${order.name}</strong></td>
			<td>
				<div style="font-size:12px;">${order.email}</div>
				<div style="font-size:11px; color:rgba(207,212,208,0.6);">${order.phone}</div>
			</td>
			<td><span class="tierTagTable">${order.tier}</span></td>
			<td>${order.qty}</td>
			<td><strong>${formattedTotal}</strong></td>
			<td>${statusBadge}</td>
			<td>
				<div style="font-size:12px;">${order.wristband}</div>
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

// Toggle Check-in status
function toggleOrderCheckIn(orderId) {
	const order = ordersData.find(o => o.id === orderId);
	if (!order) return;

	order.checkedIn = !order.checkedIn;
	saveOrdersToStorage();
	renderOrdersTable(document.getElementById("orderSearchInput").value.trim());

	if (order.checkedIn) {
		showToast(`ID ${orderId} (${order.name}) berhasil di-check-in!`);
	} else {
		showToast(`Status check-in untuk ID ${orderId} dibatalkan.`);
	}
}

// Update Metrics in Cards
function updateMetricCards() {
	const totalTicketsElem = document.getElementById("metricTotalTickets");
	const totalRevenueElem = document.getElementById("metricTotalRevenue");

	const totalQty = ordersData.reduce((acc, o) => acc + (o.qty || 1), 0) + 480;
	const totalRev = ordersData.reduce((acc, o) => acc + (o.total || 0), 0) + 44000000;

	if (totalTicketsElem) totalTicketsElem.textContent = totalQty.toLocaleString("id-ID");
	if (totalRevenueElem) totalRevenueElem.textContent = "Rp " + totalRev.toLocaleString("id-ID");
}

// Switch between Admin Tabs
function switchAdminTab(tabName) {
	const tabs = ["orders", "scanner", "inquiries", "settings"];

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

// Gate Scanner Verification Handler
function processTicketScan() {
	const input = document.getElementById("scanTicketInput");
	const resultBox = document.getElementById("scanResultDisplay");
	const ticketId = input.value.trim().toUpperCase();

	if (!ticketId) {
		alert("Harap masukkan ID Pesanan tiket.");
		return;
	}

	const found = ordersData.find(o => o.id.toUpperCase() === ticketId);

	if (found) {
		found.checkedIn = true;
		saveOrdersToStorage();
		renderOrdersTable();

		let bandColor = "#B7A97C";
		if (found.tier === "VIP") bandColor = "#e6c35c";
		else if (found.tier.includes("Presale")) bandColor = "#5ba862";
		else bandColor = "#9fb09f";

		resultBox.className = "scanResultBox valid";
		resultBox.innerHTML = `
			<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#a8d58a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:8px;">
				<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
				<polyline points="22 4 12 14.01 9 11.01"></polyline>
			</svg>
			<h4 style="margin:0 0 4px 0; color:#a8d58a; font-family:'Syne',sans-serif; font-size:18px;">TIKET VALID — AKSES DITERIMA</h4>
			<div style="font-size:14px; margin-bottom:4px;"><strong>${found.name}</strong> • ${found.qty} Tiket (${found.tier})</div>
			<div style="font-size:12px; color:rgba(207,212,208,0.7); margin-bottom:10px;">ID: ${found.id} • Status: ${found.status}</div>
			<div class="wristbandBadge" style="background-color:rgba(33,61,58,0.8); border:1px solid ${bandColor}; color:${bandColor};">
				<span>Gelang Wristband:</span>
				<strong>${found.wristband}</strong>
			</div>
		`;
		showToast(`Verifikasi sukses: ${found.name} diizinkan masuk.`);
	} else {
		resultBox.className = "scanResultBox invalid";
		resultBox.innerHTML = `
			<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ff7b7b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:8px;">
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="15" y1="9" x2="9" y2="15"></line>
				<line x1="9" y1="9" x2="15" y2="15"></line>
			</svg>
			<h4 style="margin:0 0 4px 0; color:#ff7b7b; font-family:'Syne',sans-serif; font-size:18px;">TIKET TIDAK DITEMUKAN</h4>
			<div style="font-size:13px; color:rgba(207,212,208,0.75);">Kode ID "${ticketId}" tidak terdaftar dalam basis data resmi Kosayu Artfest 2026.</div>
		`;
		showToast("Peringatan: ID Tiket tidak dikenali!");
	}
}

function quickFillScan(id) {
	const input = document.getElementById("scanTicketInput");
	input.value = id;
	processTicketScan();
}

// Add New Simulated Order
function addNewSimulatedOrder() {
	const names = ["Felicia Handoko", "Reza Fahlevi", "Stephanie Tan", "Nathaniel Kusuma", "Aurelia Santoso"];
	const tiers = [
		{ name: "Presale 1", price: 75000, band: "Zamrud (Akses Standar)" },
		{ name: "Presale 2", price: 90000, band: "Zamrud (Akses Standar)" },
		{ name: "VIP", price: 150000, band: "Emas (Akses Depan & VIP Kit)" },
		{ name: "Regular", price: 110000, band: "Perak (Akses Festival)" }
	];

	const randomName = names[Math.floor(Math.random() * names.length)];
	const randomTier = tiers[Math.floor(Math.random() * tiers.length)];
	const randomQty = Math.floor(Math.random() * 2) + 1;
	const newId = "HI-2026-0" + (ordersData.length + 10);

	const newOrder = {
		id: newId,
		name: randomName,
		email: randomName.toLowerCase().replace(" ", ".") + "@example.com",
		phone: "0812" + Math.floor(10000000 + Math.random() * 90000000),
		tier: randomTier.name,
		qty: randomQty,
		total: randomTier.price * randomQty,
		status: "Lunas",
		wristband: randomTier.band,
		checkedIn: false
	};

	ordersData.unshift(newOrder);
	saveOrdersToStorage();
	renderOrdersTable();
	updateMetricCards();
	showToast(`Simulasi pesanan baru ditambahkan: ${newId} (${randomName})`);
}

// Export Orders to CSV
function exportOrdersCSV() {
	let csvContent = "data:text/csv;charset=utf-8,";
	csvContent += "ID Pesanan,Nama,Email,Telepon,Kategori,Jumlah,Total,Status,Wristband,CheckedIn\n";

	ordersData.forEach(o => {
		csvContent += `"${o.id}","${o.name}","${o.email}","${o.phone}","${o.tier}",${o.qty},${o.total},"${o.status}","${o.wristband}",${o.checkedIn ? 'Sudah' : 'Belum'}\n`;
	});

	const encodedUri = encodeURI(csvContent);
	const link = document.createElement("a");
	link.setAttribute("href", encodedUri);
	link.setAttribute("download", `pesanan_kosayu_artfest_2026_${new Date().toISOString().slice(0, 10)}.csv`);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	showToast("Data pesanan berhasil diekspor ke format CSV!");
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
