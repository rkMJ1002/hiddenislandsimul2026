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
	if (savedData) {
		try {
			const order = JSON.parse(savedData);
			tierName = order.tier || 'Presale 2';
			basePrice = order.price || 90000;
			ticketQuantity = order.qty || 1;

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

// Express Checkout Handler (Pear Pay / DPay)
function handleExpressPay(provider) {
	selectedPaymentMethodName = provider;
	executePayment();
}

// Main Submit Payment Button with Terms Validation
function executePayment() {
	const checkTerms = document.getElementById('checkTerms');
	const errorMsg = document.getElementById('termsErrorMsg');

	if (!checkTerms.checked) {
		errorMsg.style.display = 'block';
		checkTerms.focus();
		return;
	} else {
		errorMsg.style.display = 'none';
	}

	const totalRaw = basePrice * ticketQuantity * (1 - discountPercent);
	const formatted = currentCurrency === 'IDR'
		? 'IDR ' + totalRaw.toLocaleString('en-US', { minimumFractionDigits: 2 })
		: '$' + (totalRaw / exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2 });

	document.getElementById('receiptMethod').textContent = selectedPaymentMethodName;
	document.getElementById('receiptTotal').textContent = formatted;

	// Record order for Admin Dashboard
	try {
		const buyerName = document.getElementById('cardHolderName')?.value?.trim() || 'Pengunjung Festival';
		const buyerEmail = document.getElementById('contactEmail')?.value?.trim() || 'pembeli@artfestkosayu.id';
		const buyerPhone = document.getElementById('contactPhone')?.value?.trim() || '08123456789';
		const randomId = 'HI-2026-' + String(Math.floor(100 + Math.random() * 900));

		let wristbandStr = 'Perak (Akses Festival)';
		if (tierName.includes('VIP')) wristbandStr = 'Emas (Akses Depan & VIP Kit)';
		else if (tierName.includes('Presale 1')) wristbandStr = 'Zamrud (Akses Standar Presale 1)';
		else if (tierName.includes('Presale 2')) wristbandStr = 'Safir (Akses Standar Presale 2)';
		else if (tierName.includes('Presale')) wristbandStr = 'Zamrud (Akses Standar)';

		const newOrderRecord = {
			id: randomId,
			name: buyerName,
			email: buyerEmail,
			phone: buyerPhone,
			tier: tierName,
			qty: ticketQuantity,
			total: Math.round(totalRaw),
			status: 'Lunas',
			wristband: wristbandStr,
			checkedIn: false,
			date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
		};

		const existing = JSON.parse(localStorage.getItem('hiddenIslandAllOrders') || '[]');
		existing.unshift(newOrderRecord);
		localStorage.setItem('hiddenIslandAllOrders', JSON.stringify(existing));
	} catch (e) {
		console.log('Error recording order for admin', e);
	}

	const modal = document.getElementById('successModal');
	modal.showModal();
}
