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
				const contactNameInput = document.getElementById('contactName');
				if (contactNameInput) contactNameInput.value = order.name;
				const cardHolderInput = document.getElementById('cardHolderName');
				if (cardHolderInput) cardHolderInput.value = order.name;
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

// ============================================================
// STRICT ANTI-SPAM & REAL DATA VALIDATION ENGINE
// ============================================================
const TRUSTED_EMAIL_DOMAINS = new Set([
	"gmail.com", "googlemail.com",
	"yahoo.com", "yahoo.co.id", "ymail.com", "rocketmail.com",
	"outlook.com", "hotmail.com", "live.com", "msn.com", "outlook.co.id",
	"icloud.com", "me.com", "mac.com",
	"proton.me", "protonmail.com",
	"zoho.com", "mail.com", "aol.com", "gmx.com"
]);

const TRUSTED_INSTITUTIONAL_SUFFIXES = [
	".sch.id", ".ac.id", ".edu", ".go.id", ".or.id", ".co.id"
];

const VALID_ID_MOBILE_PREFIXES = new Set([
	"0811", "0812", "0813", "0821", "0822", "0823", "0851", "0852", "0853",
	"0814", "0815", "0816", "0855", "0856", "0857", "0858",
	"0817", "0818", "0819", "0859", "0877", "0878",
	"0831", "0832", "0833", "0838",
	"0881", "0882", "0883", "0884", "0885", "0886", "0887", "0888", "0889",
	"0895", "0896", "0897", "0898", "0899"
]);

const SPAM_NAMES = new Set([
	"test", "testing", "tester", "admin", "administrator", "asdf", "asdfgh", "qwerty", "zxcv",
	"fake", "dummy", "spam", "user", "pengunjung", "anonim", "anonymous", "none", "null", "undefined"
]);

function isValidName(name) {
	if (!name || typeof name !== "string") return { valid: false, reason: "Nama lengkap wajib diisi." };
	const trimmed = name.trim();

	if (trimmed.length < 3) {
		return { valid: false, reason: "Nama terlalu pendek (minimal 3 karakter)." };
	}
	if (trimmed.length > 50) {
		return { valid: false, reason: "Nama terlalu panjang (maksimal 50 karakter)." };
	}
	if (!/^[a-zA-Z\s'’.\-]+$/.test(trimmed)) {
		return { valid: false, reason: "Nama hanya boleh berisi huruf dan spasi." };
	}

	const lower = trimmed.toLowerCase();
	if (SPAM_NAMES.has(lower)) {
		return { valid: false, reason: "Gunakan nama asli (bukan nama percobaan)." };
	}

	// Must contain vowels
	if (!/[aeiouyAEIOUY]/.test(trimmed)) {
		return { valid: false, reason: "Nama tidak valid (tidak memiliki huruf vokal)." };
	}

	// Block 5+ consecutive consonants (blocks keyboard mash like hsfkjbjwri)
	if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(trimmed)) {
		return { valid: false, reason: "Nama terdeteksi acak/keyboard smash." };
	}

	// Block repetitive identical letters like 'aaaa'
	if (/([a-zA-Z])\1{2,}/i.test(trimmed)) {
		return { valid: false, reason: "Nama mengandung pengulangan huruf yang tidak wajar." };
	}

	return { valid: true };
}

function isValidEmail(email) {
	if (!email || typeof email !== "string") return { valid: false, reason: "Alamat email wajib diisi." };
	const trimmed = email.trim().toLowerCase();
	const emailRegex = /^[a-z0-9._%+-]+@([a-z0-9.-]+\.[a-z]{2,})$/;
	const match = trimmed.match(emailRegex);
	if (!match) return { valid: false, reason: "Format email tidak valid (contoh: nama@gmail.com)." };

	const [localPart, domain] = trimmed.split("@");

	if (localPart.length < 3 || localPart.length > 50) {
		return { valid: false, reason: "Username email terlalu pendek atau tidak wajar." };
	}

	// Block 5+ consecutive consonants in username (blocks keysmash like jsbgeougr)
	if (/[bcdfghjklmnpqrstvwxyz]{5,}/.test(localPart)) {
		return { valid: false, reason: "Username email terdeteksi acak/tidak wajar." };
	}

	const isTrustedProvider = TRUSTED_EMAIL_DOMAINS.has(domain);
	const isTrustedSuffix = TRUSTED_INSTITUTIONAL_SUFFIXES.some(suffix => {
		if (!domain.endsWith(suffix)) return false;
		const prefix = domain.slice(0, domain.length - suffix.length);
		return prefix.length >= 2 && !/[bcdfghjklmnpqrstvwxyz]{5,}/.test(prefix);
	});

	if (!isTrustedProvider && !isTrustedSuffix) {
		return { 
			valid: false, 
			reason: "Gunakan penyedia email resmi (@gmail.com, @yahoo.com, @outlook.com, dll. atau email sekolah/kampus .sch.id / .ac.id)." 
		};
	}

	return { valid: true };
}

function isValidPhone(phone) {
	if (!phone || typeof phone !== "string") return { valid: false, reason: "Nomor WhatsApp wajib diisi." };
	const clean = phone.replace(/[\s\-\(\)\+]/g, "");
	let norm = clean;
	if (norm.startsWith("628")) norm = "08" + norm.slice(3);
	else if (norm.startsWith("+628")) norm = "08" + norm.slice(4);

	if (!/^\d+$/.test(norm)) {
		return { valid: false, reason: "Nomor WhatsApp hanya boleh berisi angka." };
	}

	if (norm.length < 10 || norm.length > 13) {
		return { valid: false, reason: "Nomor WhatsApp harus 10–13 digit." };
	}

	const prefix = norm.slice(0, 4);
	if (!VALID_ID_MOBILE_PREFIXES.has(prefix)) {
		return { valid: false, reason: "Prefix operator tidak valid untuk nomor seluler Indonesia (contoh valid: 0812..., 0821..., 0857...)." };
	}

	const remainder = norm.slice(4);
	if (/^(\d)\1+$/.test(remainder)) {
		return { valid: false, reason: "Nomor WhatsApp tidak boleh berisi angka berulang yang sama." };
	}

	return { valid: true };
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
	// Honeypot anti-bot check
	const hp = document.getElementById('checkoutHoneypot');
	if (hp && hp.value) {
		console.warn('Bot submission blocked.');
		return;
	}

	// Rate limiter: prevent spamming orders within 25 seconds
	const LAST_ORDER_KEY = 'hi_last_order_ts';
	const lastOrderTime = Number(localStorage.getItem(LAST_ORDER_KEY) || 0);
	const timeDiff = Date.now() - lastOrderTime;
	if (timeDiff < 25000) {
		const remainingSec = Math.ceil((25000 - timeDiff) / 1000);
		alert(`Mohon tunggu ${remainingSec} detik sebelum melakukan pemesanan berikutnya untuk mencegah spam.`);
		return;
	}

	const nameInput = document.getElementById('contactName') || document.getElementById('cardHolderName');
	const emailInput = document.getElementById('contactEmail');
	const phoneInput = document.getElementById('contactPhone');
	const nameError = document.getElementById('checkoutNameError');
	const emailError = document.getElementById('checkoutEmailError');
	const phoneError = document.getElementById('checkoutPhoneError');

	const buyerName = nameInput?.value?.trim() || '';
	const buyerEmail = emailInput?.value?.trim() || '';
	const buyerPhone = phoneInput?.value?.trim() || '';

	let hasError = false;

	// Validate Name
	const nameRes = isValidName(buyerName);
	if (!nameRes.valid) {
		if (nameInput) nameInput.classList.add('inputError');
		if (nameError) {
			nameError.textContent = nameRes.reason;
			nameError.style.display = 'block';
		}
		if (nameInput) nameInput.focus();
		hasError = true;
	} else {
		if (nameInput) nameInput.classList.remove('inputError');
		if (nameError) nameError.style.display = 'none';
	}

	// Validate Email
	const emailRes = isValidEmail(buyerEmail);
	if (!emailRes.valid) {
		if (emailInput) emailInput.classList.add('inputError');
		if (emailError) {
			emailError.textContent = emailRes.reason;
			emailError.style.display = 'block';
		}
		if (!hasError && emailInput) emailInput.focus();
		hasError = true;
	} else {
		if (emailInput) emailInput.classList.remove('inputError');
		if (emailError) emailError.style.display = 'none';
	}

	// Validate WhatsApp
	const phoneRes = isValidPhone(buyerPhone);
	if (!phoneRes.valid) {
		if (phoneInput) phoneInput.classList.add('inputError');
		if (phoneError) {
			phoneError.textContent = phoneRes.reason;
			phoneError.style.display = 'block';
		}
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

	// Record timestamp for rate limit cooldown
	localStorage.setItem(LAST_ORDER_KEY, String(Date.now()));

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
	const receiptName = document.getElementById('receiptName');
	if (receiptName) receiptName.textContent = buyerName;

	const receiptRef = document.getElementById('receiptRef');
	if (receiptRef) receiptRef.textContent = randomId;

	const receiptTier = document.getElementById('receiptTier');
	if (receiptTier) receiptTier.textContent = `${tierName} (1 Tiket)`;

	const receiptWristband = document.getElementById('receiptWristband');
	if (receiptWristband) receiptWristband.textContent = "WRISTBAND";

	const receiptBarcodeCode = document.getElementById('receiptBarcodeCode');
	if (receiptBarcodeCode) receiptBarcodeCode.textContent = randomId;

	const receiptMethod = document.getElementById('receiptMethod');
	if (receiptMethod) receiptMethod.textContent = selectedPaymentMethodName;

	const receiptTotal = document.getElementById('receiptTotal');
	if (receiptTotal) receiptTotal.textContent = formatted;

	// Render Real Code 128 Barcode onto Canvas
	const barcodeCanvas = document.getElementById('receiptBarcodeCanvas');
	if (barcodeCanvas && window.JsBarcode) {
		try {
			JsBarcode(barcodeCanvas, randomId, {
				format: "CODE128",
				lineColor: "#111827",
				width: 2.2,
				height: 52,
				displayValue: false, // Prevents duplicate code text inside barcode canvas
				background: "transparent"
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

let cachedArtworkDataUrl = null;

function loadArtworkDataUrl(darkBgHex = '#151A18') {
	if (cachedArtworkDataUrl) return Promise.resolve(cachedArtworkDataUrl);
	return new Promise((resolve) => {
		const processImg = (imgSource) => {
			try {
				const canvas = document.createElement('canvas');
				const canvasW = 880;
				const canvasH = 704; // 880 * (88 / 110)
				canvas.width = canvasW;
				canvas.height = canvasH;
				const ctx = canvas.getContext('2d');
				if (!ctx) return resolve(null);

				// Fill entire background with the dark PDF canvas tone so the curved corners blend 100% seamlessly
				ctx.fillStyle = darkBgHex;
				ctx.fillRect(0, 0, canvasW, canvasH);

				// Corner radius on canvas: 880 * (6 / 110) = 48px
				const r = 48;

				ctx.save();
				ctx.beginPath();
				if (typeof ctx.roundRect === 'function') {
					ctx.roundRect(0, 0, canvasW, canvasH, [r, r, 0, 0]);
				} else {
					ctx.moveTo(r, 0);
					ctx.lineTo(canvasW - r, 0);
					ctx.quadraticCurveTo(canvasW, 0, canvasW, r);
					ctx.lineTo(canvasW, canvasH);
					ctx.lineTo(0, canvasH);
					ctx.lineTo(0, r);
					ctx.quadraticCurveTo(0, 0, r, 0);
					ctx.closePath();
				}
				ctx.clip();

				const nw = imgSource.naturalWidth || imgSource.width || 600;
				const nh = imgSource.naturalHeight || imgSource.height || 600;
				const imgAspect = nw / nh;
				const targetAspect = canvasW / canvasH;
				let sx = 0, sy = 0, sW = nw, sH = nh;
				if (imgAspect > targetAspect) {
					sW = nh * targetAspect;
					sx = (nw - sW) / 2;
				} else {
					sH = nw / targetAspect;
					sy = (nh - sH) / 2;
				}

				ctx.drawImage(imgSource, sx, sy, sW, sH, 0, 0, canvasW, canvasH);
				ctx.restore();

				cachedArtworkDataUrl = canvas.toDataURL('image/png');
				return resolve(cachedArtworkDataUrl);
			} catch (e) {
				console.warn('Artwork canvas processing error:', e);
				resolve(null);
			}
		};

		const domImg = document.getElementById('ticketArtImg');
		if (domImg && domImg.complete && domImg.naturalWidth > 0) {
			return processImg(domImg);
		}

		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => processImg(img);
		img.onerror = () => resolve(null);
		img.src = 'ticket_artwork.jpg';
	});
}

// Download Real Scannable E-Ticket PDF (Concert Pass Style Matching User Reference)
async function downloadTicketPdf() {
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

		// 1. Page Canvas Background (Dark festival tone matching site and modal)
		const darkR = 21, darkG = 26, darkB = 24; // #151A18
		doc.setFillColor(darkR, darkG, darkB);
		doc.rect(0, 0, 148, 210, 'F');

		// Ticket Dimensions
		const cardX = 19;
		const cardY = 11;
		const cardW = 110;
		const cardH = 188;
		const cardR = 6;
		const imgH = 88;
		const perfY = cardY + imgH;
		const notchR = 4.5;

		// 2. Ticket Base Card (Soft cream background)
		doc.setFillColor(250, 248, 245);
		doc.roundedRect(cardX, cardY, cardW, cardH, cardR, cardR, 'F');

		// 3. Top Artwork (Image 2) with rounded top corners
		const artworkDataUrl = await loadArtworkDataUrl('#151A18');
		if (artworkDataUrl) {
			doc.addImage(artworkDataUrl, 'PNG', cardX, cardY, cardW, imgH);
		} else {
			// Fallback banner if image not loaded
			doc.setFillColor(33, 61, 58);
			doc.rect(cardX, cardY, cardW, imgH, 'F');
			doc.setFont('helvetica', 'bold');
			doc.setFontSize(16);
			doc.setTextColor(255, 255, 255);
			doc.text('THE HIDDEN ISLAND', 74, cardY + 45, { align: 'center' });
		}

		// 4. Perforation Row with Left & Right Cutout Notches
		doc.setDrawColor(190, 180, 175);
		if (typeof doc.setLineDashPattern === 'function') {
			doc.setLineDashPattern([1, 1.5], 0);
		} else if (typeof doc.setLineDash === 'function') {
			doc.setLineDash([1, 1.5], 0);
		}
		doc.line(cardX + notchR, perfY, cardX + cardW - notchR, perfY);
		if (typeof doc.setLineDashPattern === 'function') {
			doc.setLineDashPattern([], 0);
		} else if (typeof doc.setLineDash === 'function') {
			doc.setLineDash([], 0);
		}

		// 5. Ticket Stub Body (Matching Reference)
		// Title & Tour
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(16);
		doc.setTextColor(17, 24, 22);
		doc.text('THE HIDDEN ISLAND', 74, perfY + 9, { align: 'center' });

		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8.5);
		doc.setTextColor(107, 117, 113);
		doc.text('Artfest Kolese Santo Yusup 2026', 74, perfY + 14, { align: 'center' });

		// Passenger Row
		const stubLeft = cardX + 7;
		let curY = perfY + 22;

		doc.setFontSize(6.5);
		doc.setFont('helvetica', 'bold');
		doc.setTextColor(140, 150, 146);
		doc.text('PASSENGER / PENGUNJUNG', stubLeft, curY);

		curY += 5;
		doc.setFontSize(11);
		doc.setFont('helvetica', 'bold');
		doc.setTextColor(17, 24, 22);
		doc.text(currentOrderSummary.name, stubLeft, curY);

		// Divider line
		curY += 4;
		doc.setDrawColor(236, 231, 223);
		doc.line(stubLeft, curY, cardX + cardW - 7, curY);

		// Row 1: Date & City/Venue
		curY += 6;
		doc.setFontSize(6.5);
		doc.setFont('helvetica', 'bold');
		doc.setTextColor(140, 150, 146);
		doc.text('DATE', stubLeft, curY);
		doc.text('CITY / VENUE', cardX + 42, curY);

		curY += 4.5;
		doc.setFontSize(9.5);
		doc.setFont('helvetica', 'bold');
		doc.setTextColor(17, 24, 22);
		doc.text('23 Okt 2026', stubLeft, curY);

		doc.setFontSize(8.8);
		doc.text('Bukit Doa, Prigen, Pasuruan', cardX + 42, curY);

		// Row 2: Show, Section, Row, Seat
		curY += 8;
		doc.setFontSize(6.5);
		doc.setFont('helvetica', 'bold');
		doc.setTextColor(140, 150, 146);
		doc.text('SHOW', stubLeft, curY);
		doc.text('SECTION', cardX + 28, curY);
		doc.text('ROW', cardX + 65, curY);
		doc.text('SEAT', cardX + 83, curY);

		curY += 4.5;
		doc.setFontSize(9);
		doc.setFont('helvetica', 'bold');
		doc.setTextColor(17, 24, 22);
		doc.text('08:30', stubLeft, curY);
		doc.text(currentOrderSummary.tier || 'Presale 1', cardX + 28, curY);
		doc.text('GA', cardX + 65, curY);
		doc.text('WRISTBAND', cardX + 83, curY);

		// Separator line before barcode
		curY += 6;
		doc.setDrawColor(236, 231, 223);
		doc.line(stubLeft, curY, cardX + cardW - 7, curY);

		// Barcode
		const barcodeCanvas = document.getElementById('receiptBarcodeCanvas');
		if (barcodeCanvas) {
			const barcodeDataUrl = barcodeCanvas.toDataURL('image/png');
			doc.addImage(barcodeDataUrl, 'PNG', 42, curY + 2, 64, 16);
		}

		// Barcode Number in Monospace (printed ONCE below barcode bars)
		doc.setFontSize(8.5);
		doc.setFont('courier', 'bold');
		doc.setTextColor(17, 24, 22);
		doc.text(currentOrderSummary.id, 74, curY + 22.5, { align: 'center' });

		// Hint
		doc.setFontSize(6.2);
		doc.setFont('helvetica', 'normal');
		doc.setTextColor(140, 150, 146);
		doc.text('Tunjukkan barcode ini kepada petugas di Gate Check-In', 74, curY + 27, { align: 'center' });

		// Outer Card Border
		doc.setDrawColor(215, 210, 200);
		doc.setLineWidth(0.35);
		doc.roundedRect(cardX, cardY, cardW, cardH, cardR, cardR, 'S');

		// Cutout notches: Drawn AFTER outer card border so they cleanly bite into the card and erase the outer border stroke
		doc.setFillColor(darkR, darkG, darkB);
		doc.circle(cardX, perfY, notchR, 'F');
		doc.circle(cardX + cardW, perfY, notchR, 'F');

		doc.save('E-Ticket_TheHiddenIsland_' + currentOrderSummary.id + '.pdf');
	} catch (e) {
		console.error('Error generating PDF', e);
		alert('Gagal mengunduh file PDF tiket. Silakan coba kembali.');
	}
}

// Real-time input listeners to clear errors on typing
document.addEventListener('DOMContentLoaded', () => {
	loadArtworkDataUrl();

	const nameInput = document.getElementById('contactName');
	const emailInput = document.getElementById('contactEmail');
	const phoneInput = document.getElementById('contactPhone');
	const nameError = document.getElementById('checkoutNameError');
	const emailError = document.getElementById('checkoutEmailError');
	const phoneError = document.getElementById('checkoutPhoneError');

	if (nameInput) {
		nameInput.addEventListener('input', () => {
			const res = isValidName(nameInput.value.trim());
			if (res.valid) {
				nameInput.classList.remove('inputError');
				if (nameError) nameError.style.display = 'none';
			}
		});
	}

	if (emailInput) {
		emailInput.addEventListener('input', () => {
			const res = isValidEmail(emailInput.value.trim());
			if (res.valid) {
				emailInput.classList.remove('inputError');
				if (emailError) emailError.style.display = 'none';
			}
		});
	}

	if (phoneInput) {
		phoneInput.addEventListener('input', () => {
			const res = isValidPhone(phoneInput.value.trim());
			if (res.valid) {
				phoneInput.classList.remove('inputError');
				if (phoneError) phoneError.style.display = 'none';
			}
		});
	}
});
