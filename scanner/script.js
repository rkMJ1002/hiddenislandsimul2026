// ============================================================
// PEMINDAI BARCODE & E-TICKET PDF GATE SCANNER — CORE ENGINE
// The Hidden Island — Artfest Kolese Santo Yusup 2026
// ============================================================

// State
let ordersData = [];
let scanLog = [];
let activeGate = "Gate 1 - Bukit Doa";
let soundEnabled = true;
let currentScannerMode = "pdf";

// Live Camera State
let cameraStream = null;
let cameraDevices = [];
let selectedDeviceId = "";
let isScanningCamera = false;
let cameraAnimationFrameId = null;
let zxingCodeReader = null;
let torchActive = false;

// Last Scanned Debounce
let lastScannedCode = "";
let lastScannedTime = 0;
let currentActiveOrderId = null; // For Undo action

// Configure PDF.js Worker
if (window.pdfjsLib) {
	window.pdfjsLib.GlobalWorkerOptions.workerSrc = "../shared/pdf.worker.min.js";
}

// ============================================================
// 1. INITIALIZATION ON DOM READY
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
	initLiveClock();
	loadStoredOrders();
	loadStoredLog();
	initCloudStoreSync();
	initHardwareScannerListener();
	initClipboardPasteListener();
	renderRegisteredQuickChips();
	updateAttendanceMetrics();
});

// Real-time Digital Clock (WIB / UTC+7)
function initLiveClock() {
	function tick() {
		const now = new Date();
		const timeStr = now.toLocaleTimeString("id-ID", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit"
		}) + " WIB";
		const clockEl = document.getElementById("clockTime");
		if (clockEl) clockEl.textContent = timeStr;
	}
	tick();
	setInterval(tick, 1000);
}

// Load orders directly from localStorage or memory
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
			console.error("Error reading stored orders", e);
		}
	}
	ordersData = [];
}

// Save orders to storage
function saveOrdersToStorage() {
	localStorage.setItem("hiddenIslandAllOrders", JSON.stringify(ordersData));
}

// Load scan log
function loadStoredLog() {
	const stored = localStorage.getItem("artfest_gate_scan_log");
	if (stored) {
		try {
			const parsed = JSON.parse(stored);
			if (Array.isArray(parsed)) {
				scanLog = parsed;
				renderLogTable();
				return;
			}
		} catch (e) {
			console.error("Error reading scan log", e);
		}
	}
	scanLog = [];
	renderLogTable();
}

function saveScanLog() {
	localStorage.setItem("artfest_gate_scan_log", JSON.stringify(scanLog));
}

// Real-time Cloud Store Listener
function initCloudStoreSync() {
	if (window.ArtfestCloud) {
		const syncStatusEl = document.getElementById("syncStatusText");
		if (syncStatusEl) syncStatusEl.textContent = "Cloud Terhubung";

		// Initial pull
		const cloudOrders = window.ArtfestCloud.getOrders();
		if (Array.isArray(cloudOrders) && cloudOrders.length > 0) {
			ordersData = cloudOrders;
			updateAttendanceMetrics();
			renderRegisteredQuickChips();
		}

		// Listen to incoming real-time updates from other gates / checkout
		window.ArtfestCloud.onOrdersChange((newOrders) => {
			if (Array.isArray(newOrders)) {
				ordersData = newOrders;
				updateAttendanceMetrics();
				renderRegisteredQuickChips();
			}
		});
	}
}

// Gate Station Change Handler
function handleGateChange() {
	const select = document.getElementById("gateSelect");
	if (select) {
		activeGate = select.value;
		showToast(`Pos Gate dialihkan ke: ${activeGate}`);
	}
}

// Sound FX Toggle
function toggleSoundFX() {
	soundEnabled = !soundEnabled;
	const iconOn = document.getElementById("iconSoundOn");
	const iconOff = document.getElementById("iconSoundOff");
	if (iconOn && iconOff) {
		iconOn.style.display = soundEnabled ? "block" : "none";
		iconOff.style.display = soundEnabled ? "none" : "block";
	}
	showToast(soundEnabled ? "Efek Suara Diaktifkan (Beep)" : "Efek Suara Dimatikan (Mute)");
	if (soundEnabled) playSuccessChime();
}

// ============================================================
// 2. AUDIO & HAPTIC SYNTHESIZER (Pure Web Audio API)
// ============================================================
let audioCtx = null;

function getAudioContext() {
	if (!audioCtx) {
		const AudioContextClass = window.AudioContext || window.webkitAudioContext;
		if (AudioContextClass) {
			audioCtx = new AudioContextClass();
		}
	}
	if (audioCtx && audioCtx.state === "suspended") {
		audioCtx.resume();
	}
	return audioCtx;
}

// Melodic Rising Beep (Success)
function playSuccessChime() {
	if (!soundEnabled) return;
	try {
		const ctx = getAudioContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.type = "sine";
		osc.frequency.setValueAtTime(880, now); // A5
		osc.frequency.setValueAtTime(1760, now + 0.09); // A6

		gain.gain.setValueAtTime(0.35, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

		osc.start(now);
		osc.stop(now + 0.33);

		if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
	} catch (e) {
		console.log("Audio play error", e);
	}
}

// Descending Double Warning Buzz (Already Used)
function playWarningChime() {
	if (!soundEnabled) return;
	try {
		const ctx = getAudioContext();
		if (!ctx) return;

		[0, 0.15].forEach((delay) => {
			const now = ctx.currentTime + delay;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(350, now);
			osc.frequency.linearRampToValueAtTime(200, now + 0.12);

			gain.gain.setValueAtTime(0.28, now);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

			osc.start(now);
			osc.stop(now + 0.14);
		});

		if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 300]);
	} catch (e) {
		console.log("Audio warning error", e);
	}
}

// Low Alert Buzzer (Invalid / Not Found)
function playErrorChime() {
	if (!soundEnabled) return;
	try {
		const ctx = getAudioContext();
		if (!ctx) return;
		const now = ctx.currentTime;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.type = "square";
		osc.frequency.setValueAtTime(150, now);

		gain.gain.setValueAtTime(0.35, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

		osc.start(now);
		osc.stop(now + 0.4);

		if (navigator.vibrate) navigator.vibrate([350]);
	} catch (e) {
		console.log("Audio error error", e);
	}
}

// ============================================================
// 3. ATTENDANCE METRICS CALCULATION
// ============================================================
function updateAttendanceMetrics() {
	const total = ordersData.length;
	const checkedIn = ordersData.filter((o) => o.checkedIn).length;
	const remaining = Math.max(0, total - checkedIn);
	const percent = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

	const elTotal = document.getElementById("metricTotalOrders");
	const elCheckedIn = document.getElementById("metricCheckedInCount");
	const elRemaining = document.getElementById("metricRemainingCount");
	const elPercent = document.getElementById("metricProgressPercent");
	const elBar = document.getElementById("metricProgressBar");

	if (elTotal) elTotal.textContent = total.toLocaleString("id-ID");
	if (elCheckedIn) elCheckedIn.textContent = checkedIn.toLocaleString("id-ID");
	if (elRemaining) elRemaining.textContent = remaining.toLocaleString("id-ID");
	if (elPercent) elPercent.textContent = `${percent}%`;
	if (elBar) elBar.style.width = `${percent}%`;
}

// ============================================================
// 4. SCANNER MODE SWITCHER
// ============================================================
function switchScannerMode(mode) {
	currentScannerMode = mode;

	// Tabs
	document.querySelectorAll(".modeTabBtn").forEach((b) => b.classList.remove("active"));
	document.querySelectorAll(".modePanel").forEach((p) => p.classList.remove("active"));

	if (mode === "pdf") {
		document.getElementById("tabBtnPdf")?.classList.add("active");
		document.getElementById("panelPdf")?.classList.add("active");
		stopCameraScanner();
	} else if (mode === "camera") {
		document.getElementById("tabBtnCamera")?.classList.add("active");
		document.getElementById("panelCamera")?.classList.add("active");
		startCameraScanner();
	} else if (mode === "manual") {
		document.getElementById("tabBtnManual")?.classList.add("active");
		document.getElementById("panelManual")?.classList.add("active");
		stopCameraScanner();
		setTimeout(() => document.getElementById("manualTicketInput")?.focus(), 100);
	}
}

// ============================================================
// 5. PDF TICKET SCANNER ENGINE (Drag, Drop, Upload & Paste)
// ============================================================
function handleDragOver(e) {
	e.preventDefault();
	e.stopPropagation();
	const dropzone = document.getElementById("pdfDropzone");
	if (dropzone) dropzone.classList.add("dragover");
}

function handleDragLeave(e) {
	e.preventDefault();
	e.stopPropagation();
	const dropzone = document.getElementById("pdfDropzone");
	if (dropzone) dropzone.classList.remove("dragover");
}

function handleDrop(e) {
	e.preventDefault();
	e.stopPropagation();
	const dropzone = document.getElementById("pdfDropzone");
	if (dropzone) dropzone.classList.remove("dragover");

	if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
		processUploadedTicketFile(e.dataTransfer.files[0]);
	}
}

function handleFileSelected(e) {
	if (e.target.files && e.target.files.length > 0) {
		processUploadedTicketFile(e.target.files[0]);
	}
}

// Clipboard Paste (Ctrl+V) handler for images or PDF
function initClipboardPasteListener() {
	window.addEventListener("paste", (e) => {
		if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
			const file = e.clipboardData.files[0];
			if (file.type.includes("pdf") || file.type.startsWith("image/")) {
				switchScannerMode("pdf");
				processUploadedTicketFile(file);
			}
		}
	});
}

// Reset Dropzone back to empty state
function resetPdfDropzone() {
	const dropEmpty = document.getElementById("dropzoneEmpty");
	const dropLoading = document.getElementById("dropzoneLoading");
	const dropPreview = document.getElementById("pdfPreviewContainer");
	const fileInput = document.getElementById("pdfFileInput");

	if (dropEmpty) dropEmpty.style.display = "block";
	if (dropLoading) dropLoading.style.display = "none";
	if (dropPreview) dropPreview.style.display = "none";
	if (fileInput) fileInput.value = "";
}

// Main File Processor (Handles PDF or Image)
async function processUploadedTicketFile(file) {
	if (!file) return;

	const dropEmpty = document.getElementById("dropzoneEmpty");
	const dropLoading = document.getElementById("dropzoneLoading");
	const dropPreview = document.getElementById("pdfPreviewContainer");
	const loadingText = document.getElementById("loadingStatusText");

	if (dropEmpty) dropEmpty.style.display = "none";
	if (dropPreview) dropPreview.style.display = "none";
	if (dropLoading) dropLoading.style.display = "flex";
	if (loadingText) loadingText.textContent = `Menganalisis Dokumen: ${file.name}...`;

	// Update meta displays
	const fileNameEl = document.getElementById("previewFileName");
	const fileSizeEl = document.getElementById("previewFileSize");
	if (fileNameEl) fileNameEl.textContent = file.name;
	if (fileSizeEl) fileSizeEl.textContent = `${Math.round(file.size / 1024)} KB`;

	try {
		if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
			await processPdfDocument(file);
		} else if (file.type.startsWith("image/")) {
			await processTicketImageFile(file);
		} else {
			// Fallback: Attempt PDF first, then image
			try {
				await processPdfDocument(file);
			} catch (err) {
				await processTicketImageFile(file);
			}
		}
	} catch (err) {
		console.error("Error processing ticket file:", err);
		showToast(`Gagal membaca file: ${err.message || "Format tidak didukung"}`);
		resetPdfDropzone();
	}
}

// Process .PDF with PDF.js (dual text extraction + visual canvas barcode scanning)
async function processPdfDocument(file) {
	if (!window.pdfjsLib) {
		throw new Error("Pustaka PDF.js belum selesai dimuat.");
	}

	const arrayBuffer = await file.arrayBuffer();
	const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
	const pdfDoc = await loadingTask.promise;

	if (pdfDoc.numPages < 1) {
		throw new Error("Dokumen PDF kosong.");
	}

	// 1. Get Page 1
	const page = await pdfDoc.getPage(1);

	// 2. Fast Text Layer Stream Analysis for Ticket ID (HI-2026-xxx)
	let detectedTicketId = null;
	try {
		const textContent = await page.getTextContent();
		const fullText = textContent.items.map((i) => i.str).join(" ");
		const idMatch = fullText.match(/\b(HI-2026-\d{3,4}|HI-\d{4}-\d+)\b/i);
		if (idMatch) {
			detectedTicketId = idMatch[1].toUpperCase();
		}
	} catch (textErr) {
		console.warn("PDF text layer scan error, falling back to visual barcode:", textErr);
	}

	// 3. High-Resolution Visual Rendering onto Canvas (2.0x DPI)
	const canvas = document.getElementById("pdfRenderCanvas");
	if (!canvas) throw new Error("Canvas render element missing.");
	const ctx = canvas.getContext("2d");

	const viewport = page.getViewport({ scale: 2.0 });
	canvas.width = viewport.width;
	canvas.height = viewport.height;

	const renderContext = {
		canvasContext: ctx,
		viewport: viewport
	};
	await page.render(renderContext).promise;

	// 4. Optical Barcode Decoding from Canvas (Code 128)
	let opticalBarcode = await decodeBarcodeFromCanvas(canvas);
	if (opticalBarcode) {
		detectedTicketId = opticalBarcode.trim().toUpperCase();
	}

	// 5. Show Preview Container
	const dropLoading = document.getElementById("dropzoneLoading");
	const dropPreview = document.getElementById("pdfPreviewContainer");
	if (dropLoading) dropLoading.style.display = "none";
	if (dropPreview) dropPreview.style.display = "block";

	// 6. Execute Check-in Verification
	if (detectedTicketId) {
		processBarcodeValidation(detectedTicketId, "E-Ticket PDF");
	} else {
		// Could not extract ID
		playErrorChime();
		renderInvalidState(file.name, "Tidak terdeteksi barcode Code 128 atau ID tiket 'HI-2026-xxx' pada halaman PDF ini.");
	}
}

// Process Image file (PNG/JPG ticket screenshot)
async function processTicketImageFile(file) {
	const canvas = document.getElementById("pdfRenderCanvas");
	if (!canvas) return;
	const ctx = canvas.getContext("2d");

	const img = new Image();
	const objectUrl = URL.createObjectURL(file);

	await new Promise((resolve, reject) => {
		img.onload = () => resolve();
		img.onerror = reject;
		img.src = objectUrl;
	});

	canvas.width = img.naturalWidth || img.width;
	canvas.height = img.naturalHeight || img.height;
	ctx.drawImage(img, 0, 0);
	URL.revokeObjectURL(objectUrl);

	const detectedBarcode = await decodeBarcodeFromCanvas(canvas);

	const dropLoading = document.getElementById("dropzoneLoading");
	const dropPreview = document.getElementById("pdfPreviewContainer");
	if (dropLoading) dropLoading.style.display = "none";
	if (dropPreview) dropPreview.style.display = "block";

	if (detectedBarcode) {
		processBarcodeValidation(detectedBarcode.trim().toUpperCase(), "Gambar / Screenshot Tiket");
	} else {
		playErrorChime();
		renderInvalidState(file.name, "Tidak dapat membaca barcode Code 128 pada gambar ini.");
	}
}

// Cross-browser canvas barcode reader (BarcodeDetector API -> ZXing MultiFormat fallback)
async function decodeBarcodeFromCanvas(canvas) {
	// 1. Try Native Hardware BarcodeDetector API (Chromium / Chrome / Edge / Android)
	if ("BarcodeDetector" in window) {
		try {
			const detector = new window.BarcodeDetector({
				formats: ["code_128", "code_39", "qr_code", "ean_13"]
			});
			const barcodes = await detector.detect(canvas);
			if (barcodes && barcodes.length > 0) {
				return barcodes[0].rawValue;
			}
		} catch (nativeErr) {
			console.warn("BarcodeDetector error, using ZXing fallback:", nativeErr);
		}
	}

	// 2. Try ZXing MultiFormatReader
	if (window.ZXing) {
		try {
			const luminanceSource = new window.ZXing.HTMLCanvasElementLuminanceSource(canvas);
			const binaryBitmap = new window.ZXing.BinaryBitmap(new window.ZXing.HybridBinarizer(luminanceSource));
			const reader = new window.ZXing.MultiFormatReader();

			const hints = new Map();
			hints.set(window.ZXing.DecodeHintType.POSSIBLE_FORMATS, [
				window.ZXing.BarcodeFormat.CODE_128,
				window.ZXing.BarcodeFormat.CODE_39,
				window.ZXing.BarcodeFormat.QR_CODE
			]);
			hints.set(window.ZXing.DecodeHintType.TRY_HARDER, true);
			reader.setHints(hints);

			const result = reader.decode(binaryBitmap);
			if (result) {
				return result.getText();
			}
		} catch (zxingErr) {
			// ZXing throws NotFoundException when no code in frame
		}
	}

	return null;
}

// ============================================================
// 6. LIVE CAMERA SCANNER ENGINE
// ============================================================
async function startCameraScanner() {
	if (isScanningCamera) return;

	const video = document.getElementById("cameraVideo");
	const placeholder = document.getElementById("cameraPlaceholder");
	const controlsRow = document.getElementById("cameraControlsRow");

	try {
		// Stop any prior stream
		stopCameraScanner();

		const constraints = {
			video: selectedDeviceId
				? { deviceId: { exact: selectedDeviceId } }
				: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
			audio: false
		};

		cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
		video.srcObject = cameraStream;
		await video.play();

		isScanningCamera = true;
		if (placeholder) placeholder.style.display = "none";
		if (controlsRow) controlsRow.style.display = "flex";

		// Populate camera device selector
		await enumerateCameraDevices();

		// Start continuous frame scan loop
		startCameraScanLoop();
	} catch (err) {
		console.error("Camera access error:", err);
		showToast(`Akses kamera ditolak atau tidak tersedia: ${err.message}`);
		if (placeholder) placeholder.style.display = "flex";
		if (controlsRow) controlsRow.style.display = "none";
	}
}

function stopCameraScanner() {
	isScanningCamera = false;
	if (cameraAnimationFrameId) {
		cancelAnimationFrame(cameraAnimationFrameId);
		cameraAnimationFrameId = null;
	}

	if (zxingCodeReader) {
		try {
			zxingCodeReader.reset();
		} catch (e) {}
		zxingCodeReader = null;
	}

	if (cameraStream) {
		cameraStream.getTracks().forEach((track) => track.stop());
		cameraStream = null;
	}

	const video = document.getElementById("cameraVideo");
	if (video) video.srcObject = null;

	const placeholder = document.getElementById("cameraPlaceholder");
	const controlsRow = document.getElementById("cameraControlsRow");
	if (placeholder) placeholder.style.display = "flex";
	if (controlsRow) controlsRow.style.display = "none";
}

async function enumerateCameraDevices() {
	if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
	try {
		const devices = await navigator.mediaDevices.enumerateDevices();
		cameraDevices = devices.filter((d) => d.kind === "videoinput");
		const select = document.getElementById("cameraDeviceSelect");
		if (!select) return;

		select.innerHTML = "";
		cameraDevices.forEach((device, idx) => {
			const option = document.createElement("option");
			option.value = device.deviceId;
			option.textContent = device.label || `Kamera ${idx + 1} (${device.facingMode || "Standard"})`;
			select.appendChild(option);
		});

		if (selectedDeviceId) {
			select.value = selectedDeviceId;
		}
	} catch (e) {
		console.warn("Could not list video devices", e);
	}
}

function switchCameraDevice() {
	const select = document.getElementById("cameraDeviceSelect");
	if (select && select.value) {
		selectedDeviceId = select.value;
		startCameraScanner();
	}
}

// Torch / Flashlight Toggle
async function toggleCameraTorch() {
	if (!cameraStream) return;
	const track = cameraStream.getVideoTracks()[0];
	if (!track) return;

	try {
		const capabilities = track.getCapabilities ? track.getCapabilities() : {};
		if (!capabilities.torch) {
			showToast("Lampu kilat (torch) tidak didukung pada kamera perangkat ini.");
			return;
		}

		torchActive = !torchActive;
		await track.applyConstraints({
			advanced: [{ torch: torchActive }]
		});

		const btn = document.getElementById("btnTorchToggle");
		const label = document.getElementById("torchLabel");
		if (btn) btn.classList.toggle("active", torchActive);
		if (label) label.textContent = torchActive ? "Matikan Senter" : "Lampu Senter";
		showToast(torchActive ? "Lampu Senter Dinyalakan" : "Lampu Senter Dimatikan");
	} catch (e) {
		console.error("Torch error:", e);
		showToast("Gagal mengoperasikan lampu senter kamera.");
	}
}

// Continuous video scan loop
function startCameraScanLoop() {
	const video = document.getElementById("cameraVideo");
	const procCanvas = document.getElementById("cameraProcessingCanvas");
	if (!video || !procCanvas) return;
	const procCtx = procCanvas.getContext("2d", { willReadFrequently: true });

	let nativeDetector = null;
	if ("BarcodeDetector" in window) {
		try {
			nativeDetector = new window.BarcodeDetector({
				formats: ["code_128", "code_39", "qr_code", "ean_13"]
			});
		} catch (e) {}
	}

	let lastCheckTime = 0;

	async function frameStep(timestamp) {
		if (!isScanningCamera) return;

		// Throttle to every 100ms for smooth 10fps detection (low battery / CPU load)
		if (timestamp - lastCheckTime >= 100 && video.readyState === video.HAVE_ENOUGH_DATA) {
			lastCheckTime = timestamp;

			try {
				let detectedCode = null;

				// Path A: Native hardware detector
				if (nativeDetector) {
					const barcodes = await nativeDetector.detect(video);
					if (barcodes && barcodes.length > 0) {
						detectedCode = barcodes[0].rawValue;
					}
				}

				// Path B: ZXing fallback via processing canvas
				if (!detectedCode && window.ZXing) {
					procCanvas.width = video.videoWidth || 640;
					procCanvas.height = video.videoHeight || 480;
					procCtx.drawImage(video, 0, 0, procCanvas.width, procCanvas.height);

					try {
						const luminanceSource = new window.ZXing.HTMLCanvasElementLuminanceSource(procCanvas);
						const binaryBitmap = new window.ZXing.BinaryBitmap(new window.ZXing.HybridBinarizer(luminanceSource));
						const reader = new window.ZXing.MultiFormatReader();
						const result = reader.decode(binaryBitmap);
						if (result) detectedCode = result.getText();
					} catch (zxErr) {}
				}

				// If detected and debounced
				if (detectedCode) {
					const cleanCode = detectedCode.trim().toUpperCase();
					const nowMs = Date.now();
					// Debounce: 2500ms for same code
					if (cleanCode !== lastScannedCode || nowMs - lastScannedTime > 2500) {
						lastScannedCode = cleanCode;
						lastScannedTime = nowMs;
						processBarcodeValidation(cleanCode, "Kamera Barcode");
					}
				}
			} catch (err) {
				console.warn("Frame scan step error:", err);
			}
		}

		cameraAnimationFrameId = requestAnimationFrame(frameStep);
	}

	cameraAnimationFrameId = requestAnimationFrame(frameStep);
}

// ============================================================
// 7. MANUAL & HARDWARE USB SCANNER ENGINE
// ============================================================
function executeManualVerification() {
	const input = document.getElementById("manualTicketInput");
	if (!input) return;
	const code = input.value.trim().toUpperCase();
	if (!code) {
		showToast("Ketik ID tiket terlebih dahulu.");
		input.focus();
		return;
	}
	processBarcodeValidation(code, "Input Manual");
	input.value = "";
	input.focus();
}

// Hardware Barcode Scanner Wedge listener (catches laser gun burst keystrokes)
function initHardwareScannerListener() {
	let keyBuffer = "";
	let lastKeyTime = 0;

	window.addEventListener("keydown", (e) => {
		// Ignore if active input is an input field not intended for barcode
		const activeEl = document.activeElement;
		const isTypingElsewhere =
			activeEl &&
			activeEl.tagName === "INPUT" &&
			activeEl.id !== "manualTicketInput" &&
			activeEl.id !== "orderSearchInput";

		if (isTypingElsewhere) return;

		const now = Date.now();
		// Handheld scanners send characters within < 45ms intervals
		if (now - lastKeyTime > 75) {
			keyBuffer = "";
		}
		lastKeyTime = now;

		if (e.key === "Enter") {
			if (keyBuffer.length >= 6) {
				e.preventDefault();
				const scannedId = keyBuffer.trim().toUpperCase();
				keyBuffer = "";
				processBarcodeValidation(scannedId, "Scanner Laser USB");
			}
		} else if (e.key.length === 1) {
			keyBuffer += e.key;
		}
	});
}

// Quick click chip verification
function quickFillAndVerify(orderId) {
	processBarcodeValidation(orderId, "Uji Coba Cepat");
}

function renderRegisteredQuickChips() {
	const wrapper = document.getElementById("registeredQuickChips");
	if (!wrapper) return;

	wrapper.innerHTML = "";
	if (!ordersData || ordersData.length === 0) {
		wrapper.innerHTML = '<span style="font-size:11px; color:rgba(207,212,208,0.5);">Belum ada data tiket tersimpan. Lakukan checkout di /checkout/ untuk membuat tiket nyata.</span>';
		return;
	}

	ordersData.slice(0, 10).forEach((order) => {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = `quickChip ${order.checkedIn ? "isDone" : ""}`;
		btn.title = `${order.name} - ${order.tier}`;
		btn.innerHTML = `
			<strong>${escapeHtml(order.id)}</strong>
			<span>${escapeHtml((order.name || "").split(" ")[0])}</span>
			${order.checkedIn ? '<span style="color:#a8d58a;">✓</span>' : ""}
		`;
		btn.onclick = () => quickFillAndVerify(order.id);
		wrapper.appendChild(btn);
	});
}

// ============================================================
// 8. TICKET VALIDATION & CHECK-IN CORE LOGIC
// ============================================================
function processBarcodeValidation(rawCode, sourceMethod = "Scan") {
	if (!rawCode) return;

	// Normalize Code
	let code = String(rawCode).trim().toUpperCase();
	// If code contains URL or params, extract ID (HI-2026-xxx)
	const regexMatch = code.match(/(HI-2026-\d{3,4}|HI-\d{4}-\d+)/i);
	if (regexMatch) {
		code = regexMatch[1].toUpperCase();
	}

	currentActiveOrderId = code;

	// Update last scan time display
	const timeNowStr = new Date().toLocaleTimeString("id-ID", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit"
	}) + " WIB";
	const timeDisplay = document.getElementById("lastScanTime");
	if (timeDisplay) timeDisplay.textContent = `${timeNowStr} (${sourceMethod})`;

	// Search in orders database
	const found = ordersData.find((o) => o.id && o.id.toUpperCase() === code);

	if (!found) {
		// ==================== STATE C: NOT FOUND / INVALID ====================
		playErrorChime();
		renderInvalidState(code, "Kode tiket ini tidak terdaftar pada database pemesanan resmi The Hidden Island.");
		recordLogEntry({
			time: timeNowStr,
			gate: activeGate,
			id: code,
			name: "Pengunjung Tidak Terdaftar",
			tier: "-",
			status: "Tidak Ditemukan",
			statusClass: "invalid",
			wristband: "-",
			method: sourceMethod
		});
		return;
	}

	// ==================== STATE B: ALREADY USED ====================
	if (found.checkedIn) {
		playWarningChime();
		renderAlreadyUsedState(found);
		recordLogEntry({
			time: timeNowStr,
			gate: activeGate,
			id: found.id,
			name: found.name || "Anonim",
			tier: found.tier || "-",
			status: "Peringatan (Duplikasi)",
			statusClass: "duplicate",
			wristband: found.wristband || "Wristband Festival",
			method: sourceMethod
		});
		showToast(`⚠️ PERINGATAN: Tiket ${found.id} sudah pernah check-in sebelumnya!`);
		return;
	}

	// ==================== STATE A: VALID FIRST CHECK-IN ====================
	found.checkedIn = true;
	found.checkInTime = timeNowStr;
	found.checkedInGate = activeGate;

	// Update Cloud & Storage
	if (window.ArtfestCloud && typeof window.ArtfestCloud.updateOrderCheckIn === "function") {
		window.ArtfestCloud.updateOrderCheckIn(found.id, true, found.checkInTime);
	} else {
		saveOrdersToStorage();
	}

	playSuccessChime();
	renderValidState(found);
	updateAttendanceMetrics();
	renderRegisteredQuickChips();

	recordLogEntry({
		time: timeNowStr,
		gate: activeGate,
		id: found.id,
		name: found.name || "Anonim",
		tier: found.tier || "-",
		status: "Check-in Berhasil",
		statusClass: "valid",
		wristband: found.wristband || "Wristband Festival Standar",
		method: sourceMethod
	});

	showToast(`✓ CHECK-IN SUKSES: ${found.name} (${found.id})`);
}

// ============================================================
// 9. RESULT CARD UI RENDERING
// ============================================================
function hideAllStates() {
	document.getElementById("stateStandby").style.display = "none";
	document.getElementById("stateValid").style.display = "none";
	document.getElementById("stateAlreadyUsed").style.display = "none";
	document.getElementById("stateInvalid").style.display = "none";
}

// Render Valid State
function renderValidState(order) {
	hideAllStates();
	const state = document.getElementById("stateValid");
	state.style.display = "block";

	document.getElementById("validGuestName").textContent = order.name || "Pengunjung Festival";
	document.getElementById("validOrderId").textContent = order.id;
	document.getElementById("validTierName").textContent = order.tier || "Presale 2";
	document.getElementById("validQty").textContent = `${order.qty || 1} Tiket`;
	document.getElementById("validPayStatus").textContent = order.status || "LUNAS";
	document.getElementById("validPhone").textContent = order.phone || order.email || "-";
	document.getElementById("validCheckInTime").textContent = `${order.checkInTime} • ${activeGate}`;

	const wristbandText = document.getElementById("validWristbandText");
	const wristbandCallout = document.getElementById("validWristbandCallout");
	const band = order.wristband || "Wristband Festival Standar";
	if (wristbandText) wristbandText.textContent = `SERAHKAN: ${band.toUpperCase()}`;

	// Color tint
	if (wristbandCallout) {
		if (order.tier && order.tier.toLowerCase().includes("vip")) {
			wristbandCallout.style.color = "#e6c35c";
		} else {
			wristbandCallout.style.color = "#ffffff";
		}
	}
}

// Render Already Used State
function renderAlreadyUsedState(order) {
	hideAllStates();
	const state = document.getElementById("stateAlreadyUsed");
	state.style.display = "block";

	document.getElementById("usedGuestName").textContent = order.name || "Pengunjung Festival";
	document.getElementById("usedOrderId").textContent = order.id;
	document.getElementById("usedCheckInTime").textContent = `${order.checkInTime || "Sesi Sebelumnya"} (${order.checkedInGate || "Gate Pintu"})`;
	document.getElementById("usedTierName").textContent = `${order.tier || "Presale"} (${order.qty || 1} Tiket)`;
}

// Render Invalid State
function renderInvalidState(code, description) {
	hideAllStates();
	const state = document.getElementById("stateInvalid");
	state.style.display = "block";

	document.getElementById("invalidCodeDisplay").textContent = code || "-";
	const descEl = state.querySelector(".invalidDesc");
	if (descEl && description) descEl.textContent = description;
}

// Undo current check-in (revert to false)
function undoCurrentCheckIn() {
	if (!currentActiveOrderId) return;
	const found = ordersData.find((o) => o.id === currentActiveOrderId);
	if (!found) return;

	if (confirm(`Apakah Anda yakin ingin membatalkan check-in untuk ${found.name} (${found.id})?`)) {
		found.checkedIn = false;
		delete found.checkInTime;
		delete found.checkedInGate;

		if (window.ArtfestCloud && typeof window.ArtfestCloud.updateOrderCheckIn === "function") {
			window.ArtfestCloud.updateOrderCheckIn(found.id, false, "");
		} else {
			saveOrdersToStorage();
		}

		updateAttendanceMetrics();
		renderRegisteredQuickChips();
		showToast(`Status check-in ${found.id} telah dibatalkan.`);

		hideAllStates();
		document.getElementById("stateStandby").style.display = "flex";
	}
}

// Reset ticket from Warning state
function resetCurrentTicketStatus() {
	undoCurrentCheckIn();
}

// ============================================================
// 10. ACTIVITY LOG FEED & CSV EXPORT
// ============================================================
function recordLogEntry(entry) {
	scanLog.unshift(entry);
	if (scanLog.length > 200) scanLog.pop(); // Keep last 200 scans
	saveScanLog();
	renderLogTable();
}

function renderLogTable(filterQuery = "") {
	const tbody = document.getElementById("logTableBody");
	const countBadge = document.getElementById("logCountBadge");
	if (!tbody) return;

	const filtered = scanLog.filter((item) => {
		if (!filterQuery) return true;
		const q = filterQuery.toLowerCase();
		return (
			(item.name && item.name.toLowerCase().includes(q)) ||
			(item.id && item.id.toLowerCase().includes(q)) ||
			(item.tier && item.tier.toLowerCase().includes(q)) ||
			(item.gate && item.gate.toLowerCase().includes(q))
		);
	});

	if (countBadge) countBadge.textContent = `${filtered.length} Tercatat`;
	tbody.innerHTML = "";

	if (filtered.length === 0) {
		tbody.innerHTML = `
			<tr>
				<td colspan="8" style="text-align:center; padding: 32px 14px; color:rgba(207,212,208,0.5);">
					Belum ada riwayat pemindaian tiket gate pada sesi ini.
				</td>
			</tr>
		`;
		return;
	}

	filtered.forEach((item) => {
		const tr = document.createElement("tr");
		tr.innerHTML = `
			<td style="font-family:monospace; color:#B7A97C;">${escapeHtml(item.time)}</td>
			<td>${escapeHtml(item.gate || "Gate 1")}</td>
			<td style="font-family:monospace; font-weight:700;">${escapeHtml(item.id)}</td>
			<td style="font-weight:600; color:#ffffff;">${escapeHtml(item.name)}</td>
			<td>${escapeHtml(item.tier)}</td>
			<td>
				<span class="statusPill ${item.statusClass || "valid"}">
					${escapeHtml(item.status)}
				</span>
			</td>
			<td>${escapeHtml(item.wristband || "-")}</td>
			<td>
				<button type="button" class="btnTableAction" onclick="quickFillAndVerify('${escapeHtml(item.id)}')">
					Cek Ulang
				</button>
			</td>
		`;
		tbody.appendChild(tr);
	});
}

function filterLogTable() {
	const input = document.getElementById("logSearchInput");
	const q = input ? input.value.trim() : "";
	renderLogTable(q);
}

// Export Log to CSV
function exportScanLogCSV() {
	if (!scanLog || scanLog.length === 0) {
		showToast("Belum ada data riwayat pemindaian untuk diekspor.");
		return;
	}

	const escapeCsv = (str) => {
		if (!str) return '""';
		const s = String(str).replace(/"/g, '""');
		return `"${s}"`;
	};

	const headers = ["WAKTU", "POS GATE", "KODE TIKET", "NAMA PENGUNJUNG", "KATEGORI", "STATUS", "WRISTBAND", "METODE SCAN"];
	const rows = scanLog.map((l) => [
		l.time || "",
		l.gate || "",
		l.id || "",
		l.name || "",
		l.tier || "",
		l.status || "",
		l.wristband || "",
		l.method || ""
	].map(escapeCsv).join(","));

	const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `Log_Gate_TheHiddenIsland_${new Date().toISOString().slice(0, 10)}.csv`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);

	showToast("✓ File CSV Riwayat Scan berhasil diunduh.");
}

// ============================================================
// 11. TOAST HELPER & HTML ESCAPING
// ============================================================
let toastTimer = null;
function showToast(msg) {
	const toast = document.getElementById("scannerToast");
	if (!toast) return;
	toast.textContent = msg;
	toast.classList.add("show");
	if (toastTimer) clearTimeout(toastTimer);
	toastTimer = setTimeout(() => {
		toast.classList.remove("show");
	}, 3200);
}

function escapeHtml(str) {
	if (!str) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}
