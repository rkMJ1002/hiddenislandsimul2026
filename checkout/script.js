// State Variables
let currentCurrency = 'IDR';
let exchangeRate = 16200;
let basePrice = 90000;
let ticketQuantity = 1;
let tierName = 'Presale 2';
let discountPercent = 0;
let selectedPaymentMethodName = 'Bisa / Servantcard';

document.addEventListener('DOMContentLoaded', () => {
	loadOrderData();
	startQrisTimer();
});

// Load data passed from ticketing modal
function loadOrderData() {
	const savedData = sessionStorage.getItem('hiddenIslandOrder');
	ticketQuantity = 1; // Strictly 1 ticket per order limit

	if (savedData) {
		try {
			const order = JSON.parse(savedData);
			tierName = order.tier || 'Presale 2';
			basePrice = order.price || 90000;
			ticketQuantity = 1; // Order limit strictly one per purchase

			if (order.name) {
				document.getElementById('cardHolderName').value = order.name;
			}
			if (order.email) {
				document.getElementById('contactEmail').value = order.email;
			}
			if (order.wa) {
				document.getElementById('contactPhone').value = order.wa;
			}
		} catch (e) {
			console.log('Error parsing order data', e);
		}
	} else {
		// Fallback to live configured price from ArtfestCloud or localStorage
		try {
			const cfg = (window.ArtfestCloud && typeof window.ArtfestCloud.getTicketConfig === "function")
				? window.ArtfestCloud.getTicketConfig()
				: JSON.parse(localStorage.getItem('artfest_ticket_config') || '{}');
			if (cfg && cfg.presale2 && cfg.presale2.price) {
				basePrice = cfg.presale2.price;
			}
		} catch (e) {}
	}

	updateSummaryDisplays();
}

// Update all text labels & prices
function updateSummaryDisplays() {
	const totalRaw = basePrice * ticketQuantity;
	const discountedTotal = totalRaw * (1 - discountPercent);

	document.getElementById('productTitle').textContent = `Tiket The Hidden Island — ${tierName}`;
	document.getElementById('itemNameDisplay').textContent = `${tierName}`;
	document.getElementById('itemSubDisplay').textContent = `${ticketQuantity} Tiket • Akses Pentas Seni`;

	if (currentCurrency === 'IDR') {
		const formatted = 'IDR ' + discountedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		const subtotalFormatted = 'IDR ' + totalRaw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

		document.getElementById('bigPriceDisplay').textContent = formatted;
		document.getElementById('itemPriceDisplay').textContent = subtotalFormatted;
		document.getElementById('subtotalDisplay').textContent = subtotalFormatted;
		document.getElementById('totalDueDisplay').textContent = formatted;
		document.getElementById('btnPayAmount').textContent = formatted;
	} else {
		const usdTotal = discountedTotal / exchangeRate;
		const usdSubtotal = totalRaw / exchangeRate;
		const formatted = '$' + usdTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		const subtotalFormatted = '$' + usdSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

		document.getElementById('bigPriceDisplay').textContent = formatted;
		document.getElementById('itemPriceDisplay').textContent = subtotalFormatted;
		document.getElementById('subtotalDisplay').textContent = subtotalFormatted;
		document.getElementById('totalDueDisplay').textContent = formatted;
		document.getElementById('btnPayAmount').textContent = formatted;
	}
}

// Switch currency IDR / USD
function setCurrency(curr) {
	currentCurrency = curr;
	document.getElementById('btnCurrIdr').classList.toggle('active', curr === 'IDR');
	document.getElementById('btnCurrUsd').classList.toggle('active', curr === 'USD');
	updateSummaryDisplays();
}

// Promo Code Toggle & Application
function togglePromoField() {
	const group = document.getElementById('promoInputGroup');
	group.style.display = group.style.display === 'none' ? 'flex' : 'none';
}

function applyPromo() {
	const code = document.getElementById('promoCodeInput').value.trim().toUpperCase();
	const status = document.getElementById('promoStatus');

	if (code === 'RAKHYAN' || code === 'HIDDENISLAND' || code === 'KOSAYU') {
		discountPercent = 0.15; // 15% discount
		status.textContent = '✓ Kode promo diterapkan: Diskon 15%!';
		status.style.color = '#00875a';
		updateSummaryDisplays();
	} else {
		status.textContent = 'Kode promo tidak valid.';
		status.style.color = '#de350b';
	}
}

// Phone Verification Card
function dismissPhoneCard() {
	document.querySelector('.phoneVerifyCard').style.display = 'none';
}

function verifyPhone() {
	const btn = document.getElementById('btnVerify');
	btn.textContent = '✓ Verified';
	btn.style.backgroundColor = '#00875a';
	setTimeout(() => {
		dismissPhoneCard();
	}, 900);
}

// Payment Method Switcher (Updated Parody Names)
function switchPaymentMethod(methodKey, buttonElem) {
	document.querySelectorAll('.payTab').forEach(tab => tab.classList.remove('active'));
	buttonElem.classList.add('active');

	document.querySelectorAll('.methodView').forEach(view => view.classList.remove('active'));
	const activeView = document.getElementById(`method-${methodKey}`);
	if (activeView) {
		activeView.classList.add('active');
	}

	const names = {
		card: 'Bisa / Servantcard',
		qris: 'QRIS Instant Pay',
		va: 'Bank Virtual Account',
		stoppay: 'Stop Pay',
		defisit: 'Defisit',
		opo: 'Opo'
	};
	selectedPaymentMethodName = names[methodKey] || methodKey;
}

// Virtual Account Selector (BCE, Sendiri, BNA, BRIS)
function selectBank(bankName, vaNumber, buttonElem) {
	document.querySelectorAll('.bankOption').forEach(btn => btn.classList.remove('active'));
	buttonElem.classList.add('active');

	document.getElementById('bankNameDisplay').textContent = `${bankName} Virtual Account`;
	document.getElementById('vaNumberDisplay').textContent = vaNumber.replace(/(.{4})/g, '$1 ').trim();
	selectedPaymentMethodName = `${bankName} Virtual Account`;
}

function copyVA() {
	const va = document.getElementById('vaNumberDisplay').textContent.replace(/\s+/g, '');
	navigator.clipboard.writeText(va).then(() => {
		const btn = document.querySelector('.btnCopy');
		btn.textContent = 'Disalin!';
		setTimeout(() => btn.textContent = 'Salin', 1500);
	});
}

// QRIS Timer Countdown
function startQrisTimer() {
	let secondsRemaining = 15 * 60;
	const timerElem = document.getElementById('qrisCountdown');

	setInterval(() => {
		if (secondsRemaining > 0) {
			secondsRemaining--;
			const mins = Math.floor(secondsRemaining / 60);
			const secs = secondsRemaining % 60;
			timerElem.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
		}
	}, 1000);
}

// Security Validation for Real Email and WhatsApp Phone Number
const VALID_EMAIL_TLDS = new Set([
	"com", "net", "org", "edu", "gov", "mil", "int", "id", "co.id", "ac.id", "sch.id", "go.id", "or.id", "web.id", "biz.id", "my.id",
	"io", "co", "ai", "me", "info", "biz", "app", "dev", "tech", "online", "site", "store", "cloud", "digital", "global", "xyz", "live", "pro", "asia", "club", "space", "tv", "cc", "us", "uk", "co.uk", "de", "fr", "jp", "sg", "au", "my", "nl", "ca", "ch", "se", "no", "es", "it"
]);

function isValidEmail(email) {
	if (!email || typeof email !== "string") return false;
	const trimmed = email.trim().toLowerCase();
	const emailRegex = /^[a-z0-9._%+-]+@([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})$/;
	const match = trimmed.match(emailRegex);
	if (!match) return false;
	
	const domain = match[1];
	const parts = domain.split(".");
	if (parts.length < 2) return false;
	
	const sld = parts[parts.length - 2];
	if (sld.length < 2) return false;

	const tld1 = parts[parts.length - 1];
	const tld2 = parts.length >= 2 ? `${parts[parts.length - 2]}.${parts[parts.length - 1]}` : "";

	return VALID_EMAIL_TLDS.has(tld1) || VALID_EMAIL_TLDS.has(tld2);
}

function isValidPhone(phone) {
	if (!phone || typeof phone !== "string") return false;
	const clean = phone.replace(/[\s\-\(\)\+]/g, "");
	let norm = clean;
	if (norm.startsWith("628")) norm = "08" + norm.slice(3);
	else if (norm.startsWith("+628")) norm = "08" + norm.slice(4);
	
	const re = /^08[1-9][0-9]{7,10}$/;
	if (!re.test(norm)) return false;
	
	const body = norm.slice(2);
	if (/^(\d)\1+$/.test(body)) return false;
	return true;
}

// Global reference for active completed order (for PDF download)
let currentOrderSummary = null;

// Express Checkout Handler (Pear Pay / DPay)
function handleExpressPay(provider) {
	selectedPaymentMethodName = provider;
	executePayment();
}

// Main Submit Payment Button with Security & Terms Validation
function executePayment() {
	const emailInput = document.getElementById('contactEmail');
	const phoneInput = document.getElementById('contactPhone');
	const emailError = document.getElementById('checkoutEmailError');
	const phoneError = document.getElementById('checkoutPhoneError');

	const buyerName = document.getElementById('cardHolderName')?.value?.trim() || 'Pengunjung Festival';
	const buyerEmail = emailInput?.value?.trim() || '';
	const buyerPhone = phoneInput?.value?.trim() || '';

	let hasError = false;

	if (!isValidEmail(buyerEmail)) {
		if (emailInput) emailInput.classList.add('inputError');
		if (emailError) emailError.style.display = 'block';
		if (emailInput) emailInput.focus();
		hasError = true;
	} else {
		if (emailInput) emailInput.classList.remove('inputError');
		if (emailError) emailError.style.display = 'none';
	}

	if (!isValidPhone(buyerPhone)) {
		if (phoneInput) phoneInput.classList.add('inputError');
		if (phoneError) phoneError.style.display = 'block';
		if (!hasError && phoneInput) phoneInput.focus();
		hasError = true;
	} else {
		if (phoneInput) phoneInput.classList.remove('inputError');
		if (phoneError) phoneError.style.display = 'none';
	}

	if (hasError) return;

	const checkTerms = document.getElementById('checkTerms');
	const termsErrorMsg = document.getElementById('termsErrorMsg');

	if (!checkTerms.checked) {
		termsErrorMsg.style.display = 'block';
		checkTerms.focus();
		return;
	} else {
		termsErrorMsg.style.display = 'none';
	}

	ticketQuantity = 1; // Order limit strictly one per purchase
	const totalRaw = basePrice * ticketQuantity * (1 - discountPercent);
	const formatted = currentCurrency === 'IDR'
		? 'IDR ' + totalRaw.toLocaleString('en-US', { minimumFractionDigits: 2 })
		: '$' + (totalRaw / exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2 });

	// Generate unique Order ID
	const randomId = 'HI-2026-' + String(Math.floor(100 + Math.random() * 900));

	// Polos wristband without specific gem branding
	const wristbandStr = 'Wristband Festival';

	// Record order for Admin Dashboard & update sold quotas
	try {
		const newOrderRecord = {
			id: randomId,
			name: buyerName,
			email: buyerEmail,
			phone: buyerPhone,
			tier: tierName,
			qty: 1,
			total: Math.round(totalRaw),
			status: 'Lunas',
			wristband: wristbandStr,
			checkedIn: false,
			date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
		};

		if (window.ArtfestCloud && typeof window.ArtfestCloud.saveOrder === "function") {
			window.ArtfestCloud.saveOrder(newOrderRecord);
		} else {
			const existing = JSON.parse(localStorage.getItem('hiddenIslandAllOrders') || '[]');
			existing.unshift(newOrderRecord);
			localStorage.setItem('hiddenIslandAllOrders', JSON.stringify(existing));

			// Update soldSeats in artfest_ticket_config upon successful checkout
			const cfgRaw = localStorage.getItem('artfest_ticket_config');
			if (cfgRaw) {
				const cfg = JSON.parse(cfgRaw);
				const tierKey = tierName.toLowerCase().replace(/\s+/g, '');
				if (cfg[tierKey]) {
					cfg[tierKey].soldSeats = (cfg[tierKey].soldSeats || 0) + 1;
					localStorage.setItem('artfest_ticket_config', JSON.stringify(cfg));
				}
			}
		}
	} catch (e) {
		console.log('Error recording order for admin', e);
	}

	// Save active order summary in memory for PDF generation
	currentOrderSummary = {
		id: randomId,
		name: buyerName,
		email: buyerEmail,
		phone: buyerPhone,
		tier: tierName,
		qty: 1,
		total: Math.round(totalRaw),
		totalFormatted: formatted,
		status: 'Lunas',
		wristband: wristbandStr,
		date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
	};

	// Update receipt modal details
	const receiptRef = document.getElementById('receiptRef');
	if (receiptRef) receiptRef.textContent = randomId;

	const receiptTier = document.getElementById('receiptTier');
	if (receiptTier) receiptTier.textContent = `${tierName} (1 Tiket)`;

	const receiptWristband = document.getElementById('receiptWristband');
	if (receiptWristband) receiptWristband.textContent = wristbandStr;

	document.getElementById('receiptMethod').textContent = selectedPaymentMethodName;
	document.getElementById('receiptTotal').textContent = formatted;

	// Render Real Code 128 Barcode onto Canvas
	const barcodeCanvas = document.getElementById('receiptBarcodeCanvas');
	if (barcodeCanvas && window.JsBarcode) {
		try {
			JsBarcode(barcodeCanvas, randomId, {
				format: "CODE128",
				lineColor: "#111827",
				width: 2.2,
				height: 60,
				displayValue: true,
				font: "monospace",
				fontSize: 15,
				textMargin: 6,
				background: "#ffffff"
			});
		} catch (err) {
			console.error("Barcode generation error:", err);
		}
	}

	const modal = document.getElementById('successModal');
	modal.showModal();

	// Automatically trigger download of e-ticket PDF after short delay
	setTimeout(() => {
		downloadTicketPdf();
	}, 600);
}

// Download Real Scannable E-Ticket PDF
function downloadTicketPdf() {
	if (!currentOrderSummary) return;
	if (!window.jspdf || !window.jspdf.jsPDF) {
		alert('Modul PDF sedang dimuat, silakan klik kembali.');
		return;
	}

	try {
		const { jsPDF } = window.jspdf;
		const doc = new jsPDF({
			orientation: 'portrait',
			unit: 'mm',
			format: 'a5'
		});

		// 1. Header Banner (Dark Festival Emerald)
		doc.setFillColor(21, 32, 30);
		doc.rect(0, 0, 148, 42, "F");

		doc.setFont("helvetica", "bold");
		doc.setFontSize(19);
		doc.setTextColor(234, 230, 217);
		doc.text("THE HIDDEN ISLAND", 74, 18, { align: "center" });

		doc.setFontSize(8.5);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(183, 169, 124);
		doc.text("ARTFEST KOLESE SANTO YUSUP 2026", 74, 26, { align: "center" });

		doc.setFontSize(7.5);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(207, 212, 208);
		doc.text("OFFICIAL E-TICKET & FESTIVAL PASS", 74, 33, { align: "center" });

		// Gold accent stripe
		doc.setFillColor(183, 169, 124);
		doc.rect(0, 42, 148, 1.5, "F");

		// 2. Ticket Details Card
		doc.setFillColor(248, 250, 249);
		doc.roundedRect(14, 48, 120, 66, 3, 3, "F");
		doc.setDrawColor(220, 226, 223);
		doc.roundedRect(14, 48, 120, 66, 3, 3, "S");

		doc.setFontSize(7.5);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(110, 120, 115);
		doc.text("KODE TIKET (ORDER ID)", 20, 56);

		doc.setFontSize(14);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(33, 61, 58);
		doc.text(currentOrderSummary.id, 20, 63);

		// Status Badge
		doc.setFillColor(230, 247, 238);
		doc.roundedRect(88, 52, 40, 8, 2, 2, "F");
		doc.setFontSize(8);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(0, 135, 90);
		doc.text("LUNAS / CONFIRMED", 108, 57.5, { align: "center" });

		// Card Divider
		doc.setDrawColor(230, 235, 232);
		doc.line(20, 67, 128, 67);

		// Row 1: Name & Tier
		doc.setFontSize(7.5);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(110, 120, 115);
		doc.text("NAMA PEMESAN", 20, 73);
		doc.setFontSize(9);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(26, 31, 54);
		doc.text(currentOrderSummary.name, 20, 78);

		doc.setFontSize(7.5);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(110, 120, 115);
		doc.text("KATEGORI TIKET", 80, 73);
		doc.setFontSize(9);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(26, 31, 54);
		doc.text(currentOrderSummary.tier + " (1 Tiket)", 80, 78);

		// Row 2: Email & Phone
		doc.setFontSize(7.5);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(110, 120, 115);
		doc.text("EMAIL", 20, 85);
		doc.setFontSize(9);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(26, 31, 54);
		doc.text(currentOrderSummary.email, 20, 90);

		doc.setFontSize(7.5);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(110, 120, 115);
		doc.text("NO. WHATSAPP", 80, 85);
		doc.setFontSize(9);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(26, 31, 54);
		doc.text(currentOrderSummary.phone, 80, 90);

		// Row 3: Wristband & Total
		doc.setFontSize(7.5);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(110, 120, 115);
		doc.text("GELANG AKSES", 20, 97);
		doc.setFontSize(9);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(33, 61, 58);
		doc.text(currentOrderSummary.wristband, 20, 102);

		doc.setFontSize(7.5);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(110, 120, 115);
		doc.text("TOTAL DIBAYAR", 80, 97);
		doc.setFontSize(9);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(183, 169, 124);
		doc.text(currentOrderSummary.totalFormatted, 80, 102);

		// 3. Location & Schedule Box
		doc.setFillColor(240, 245, 243);
		doc.roundedRect(14, 118, 120, 22, 3, 3, "F");
		doc.setFontSize(7.5);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(33, 61, 58);
		doc.text("LOKASI & JADWAL PENYELENGGARAAN", 20, 124);
		doc.setFontSize(8);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(50, 60, 55);
		doc.text("Bukit Doa Immanuel (BDI) Sukolilo, Prigen, Pasuruan, Jawa Timur", 20, 130);
		doc.text("Jumat, 23 Oktober 2026  |  Open Gate Festival: 15.00 WIB", 20, 135);

		// 4. Barcode Box
		doc.setFillColor(255, 255, 255);
		doc.roundedRect(14, 144, 120, 36, 3, 3, "F");
		doc.setDrawColor(210, 218, 214);
		doc.roundedRect(14, 144, 120, 36, 3, 3, "S");

		// Rasterize barcode canvas
		const barcodeCanvas = document.getElementById('receiptBarcodeCanvas');
		if (barcodeCanvas) {
			const barcodeDataUrl = barcodeCanvas.toDataURL("image/png");
			doc.addImage(barcodeDataUrl, 'PNG', 28, 146, 92, 24);
		}

		doc.setFontSize(7);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(100, 110, 105);
		doc.text("Tunjukkan barcode ini kepada petugas di Gate Check-In untuk scan penukaran wristband fisik.", 74, 175, { align: "center" });

		// 5. Notes & Terms
		doc.setFontSize(6.8);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(120, 130, 125);
		doc.text("• Tiket berlaku untuk 1 (satu) orang dan hanya dapat di-scan 1 kali di Gate Check-In.", 20, 185);
		doc.text("• Dilarang membagikan barcode kepada pihak lain guna mencegah duplikasi tiket.", 20, 189);
		doc.text("• Wajib membawa kartu identitas (KTP / Kartu Pelajar) saat penukaran gelang festival.", 20, 193);

		doc.setFontSize(6);
		doc.setTextColor(160, 170, 165);
		doc.text("SECURE SYSTEM GENERATED PASS  •  THE HIDDEN ISLAND 2026  •  OSIS SMAK KOLESE SANTO YUSUP", 74, 203, { align: "center" });

		doc.save("E-Ticket_TheHiddenIsland_" + currentOrderSummary.id + ".pdf");
	} catch (e) {
		console.error("Error generating PDF", e);
		alert("Gagal mengunduh file PDF tiket. Silakan coba kembali.");
	}
}
