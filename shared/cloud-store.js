// ============================================================
// CLOUD STORE & REALTIME SYNC ENGINE — THE HIDDEN ISLAND 2026
// ============================================================
// Provides seamless real-time synchronization across all browsers,
// devices, and mobile phones using Firebase Firestore, with instant
// offline fallback to LocalStorage.

(function (window) {
	const DEFAULT_TICKET_CONFIG = {
		presale1: {
			name: "Presale 1",
			price: 75000,
			maxSeats: 500,
			soldSeats: 0,
			status: "available",
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

	class CloudStore {
		constructor() {
			this.isFirebaseReady = false;
			this.initPromise = null;
			this.firebaseApp = null;
			this.db = null;
			this.fsModules = null;

			this.ticketListeners = new Set();
			this.ordersListeners = new Set();
			this.statusListeners = new Set();

			this.unsubTicketSnapshot = null;
			this.unsubOrdersSnapshot = null;

			this.ticketConfig = this.loadLocalTicketConfig();
			this.ordersData = this.loadLocalOrders();

			// Listen to local storage events for same-browser cross-tab sync
			window.addEventListener("storage", (e) => {
				if (e.key === "artfest_ticket_config") {
					this.ticketConfig = this.loadLocalTicketConfig();
					this.notifyTicketListeners();
				} else if (e.key === "hiddenIslandAllOrders") {
					this.ordersData = this.loadLocalOrders();
					this.notifyOrdersListeners();
				} else if (e.key === "artfest_firebase_config") {
					this.reconnect();
				}
			});
		}

		// Load from LocalStorage
		loadLocalTicketConfig() {
			const raw = localStorage.getItem("artfest_ticket_config");
			if (raw) {
				try {
					const parsed = JSON.parse(raw);
					return {
						presale1: { ...DEFAULT_TICKET_CONFIG.presale1, ...parsed.presale1 },
						presale2: { ...DEFAULT_TICKET_CONFIG.presale2, ...parsed.presale2 }
					};
				} catch (e) {
					console.warn("Error parsing local ticket config", e);
				}
			}
			return JSON.parse(JSON.stringify(DEFAULT_TICKET_CONFIG));
		}

		loadLocalOrders() {
			const raw = localStorage.getItem("hiddenIslandAllOrders");
			if (raw) {
				try {
					const parsed = JSON.parse(raw);
					if (Array.isArray(parsed)) return parsed;
				} catch (e) {
					console.warn("Error parsing local orders", e);
				}
			}
			return [];
		}

		// Initialize Firebase Connection
		async init() {
			if (this.initPromise) return this.initPromise;

			this.initPromise = (async () => {
				const cfg = typeof window.getFirebaseConfig === "function" ? window.getFirebaseConfig() : null;

				if (!cfg || !cfg.projectId || !cfg.apiKey) {
					this.isFirebaseReady = false;
					this.notifyStatusListeners({
						connected: false,
						message: "Firebase belum terkonfigurasi. Menggunakan penyimpanan lokal (LocalStorage)."
					});
					return false;
				}

				try {
					this.notifyStatusListeners({
						connecting: true,
						message: "Menghubungkan ke Cloud Firestore..."
					});

					// Load Firebase Modular SDK dynamically via CDN
					const [appModule, firestoreModule] = await Promise.all([
						import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
						import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
					]);

					this.fsModules = firestoreModule;
					this.firebaseApp = appModule.initializeApp(cfg, "artfest-client-" + Date.now());
					this.db = firestoreModule.getFirestore(this.firebaseApp);
					this.isFirebaseReady = true;

					// Attach Realtime Listeners
					this.attachTicketListener();
					this.attachOrdersListener();

					this.notifyStatusListeners({
						connected: true,
						projectId: cfg.projectId,
						message: `Terhubung ke Firebase Firestore (${cfg.projectId}) — Sinkronisasi Real-time Aktif`
					});

					return true;
				} catch (err) {
					console.error("Gagal menginisialisasi Firebase Firestore:", err);
					this.isFirebaseReady = false;
					this.notifyStatusListeners({
						connected: false,
						error: err.message,
						message: "Gagal terhubung ke Firebase: " + err.message
					});
					return false;
				}
			})();

			return this.initPromise;
		}

		async reconnect() {
			if (this.unsubTicketSnapshot) {
				this.unsubTicketSnapshot();
				this.unsubTicketSnapshot = null;
			}
			if (this.unsubOrdersSnapshot) {
				this.unsubOrdersSnapshot();
				this.unsubOrdersSnapshot = null;
			}
			this.initPromise = null;
			return this.init();
		}

		// Attach Firestore Snapshot for Ticket Config
		attachTicketListener() {
			if (!this.db || !this.fsModules) return;
			const { doc, onSnapshot, setDoc } = this.fsModules;
			const ticketDocRef = doc(this.db, "config", "tickets");

			this.unsubTicketSnapshot = onSnapshot(ticketDocRef, (snap) => {
				if (snap.exists()) {
					const data = snap.data();
					this.ticketConfig = {
						presale1: { ...DEFAULT_TICKET_CONFIG.presale1, ...(data.presale1 || {}) },
						presale2: { ...DEFAULT_TICKET_CONFIG.presale2, ...(data.presale2 || {}) }
					};
					localStorage.setItem("artfest_ticket_config", JSON.stringify(this.ticketConfig));
					this.notifyTicketListeners();
				} else {
					// Seed initial default config if document does not exist yet
					setDoc(ticketDocRef, this.ticketConfig).catch((e) => console.warn("Seeding initial config failed", e));
				}
			}, (err) => {
				console.warn("Firestore ticket config snapshot error:", err);
			});
		}

		// Attach Firestore Snapshot for Orders Collection
		attachOrdersListener() {
			if (!this.db || !this.fsModules) return;
			const { collection, onSnapshot, query, orderBy } = this.fsModules;
			const ordersColRef = collection(this.db, "orders");

			let q = ordersColRef;
			try {
				q = query(ordersColRef, orderBy("timestamp", "desc"));
			} catch (e) {
				q = ordersColRef;
			}

			this.unsubOrdersSnapshot = onSnapshot(q, (snapshot) => {
				const orders = [];
				snapshot.forEach((docSnap) => {
					const data = docSnap.data();
					orders.push({
						id: docSnap.id,
						...data
					});
				});

				// Sort by date/timestamp descending
				orders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

				this.ordersData = orders;
				localStorage.setItem("hiddenIslandAllOrders", JSON.stringify(this.ordersData));
				this.notifyOrdersListeners();
			}, (err) => {
				console.warn("Firestore orders snapshot error:", err);
			});
		}

		// ==================== TICKET CONFIG APIS ====================
		getTicketConfig() {
			return this.ticketConfig;
		}

		async saveTicketConfig(config) {
			this.ticketConfig = config;
			localStorage.setItem("artfest_ticket_config", JSON.stringify(config));
			this.notifyTicketListeners();

			if (this.isFirebaseReady && this.db && this.fsModules) {
				try {
					const { doc, setDoc } = this.fsModules;
					await setDoc(doc(this.db, "config", "tickets"), config, { merge: true });
					return true;
				} catch (err) {
					console.error("Gagal menyimpan tiket ke Firestore:", err);
					throw err;
				}
			}
			return true;
		}

		onTicketConfig(cb) {
			this.ticketListeners.add(cb);
			// Immediately trigger callback with current cached state
			cb(this.ticketConfig);
			return () => this.ticketListeners.delete(cb);
		}

		notifyTicketListeners() {
			for (const cb of this.ticketListeners) {
				try {
					cb(this.ticketConfig);
				} catch (e) {
					console.error("Error in ticket listener callback", e);
				}
			}
		}

		// ==================== ORDERS APIS ====================
		getOrders() {
			return this.ordersData;
		}

		async saveOrder(orderRecord) {
			const orderId = orderRecord.id;
			if (!orderRecord.timestamp) {
				orderRecord.timestamp = Date.now();
			}

			// Prepend locally for instant responsiveness
			const existingIndex = this.ordersData.findIndex((o) => o.id === orderId);
			if (existingIndex >= 0) {
				this.ordersData[existingIndex] = orderRecord;
			} else {
				this.ordersData.unshift(orderRecord);
			}

			localStorage.setItem("hiddenIslandAllOrders", JSON.stringify(this.ordersData));
			this.notifyOrdersListeners();

			// Save to Cloud Firestore
			if (this.isFirebaseReady && this.db && this.fsModules) {
				try {
					const { doc, setDoc } = this.fsModules;
					await setDoc(doc(this.db, "orders", orderId), orderRecord);

					// Also increment sold seats in config if tier is valid
					const tierKey = orderRecord.tier ? orderRecord.tier.toLowerCase().replace(/\s+/g, "") : "";
					if (this.ticketConfig[tierKey]) {
						this.ticketConfig[tierKey].soldSeats = (this.ticketConfig[tierKey].soldSeats || 0) + (Number(orderRecord.qty) || 1);
						await setDoc(doc(this.db, "config", "tickets"), this.ticketConfig, { merge: true });
					}
					return true;
				} catch (err) {
					console.error("Gagal menyimpan pesanan ke Firestore:", err);
				}
			}
			return true;
		}

		async updateOrderCheckIn(orderId, checkedIn, checkInTime) {
			const found = this.ordersData.find((o) => o.id === orderId);
			if (found) {
				found.checkedIn = checkedIn;
				found.checkInTime = checkInTime;
				localStorage.setItem("hiddenIslandAllOrders", JSON.stringify(this.ordersData));
				this.notifyOrdersListeners();
			}

			if (this.isFirebaseReady && this.db && this.fsModules) {
				try {
					const { doc, updateDoc } = this.fsModules;
					await updateDoc(doc(this.db, "orders", orderId), {
						checkedIn: checkedIn,
						checkInTime: checkInTime
					});
					return true;
				} catch (err) {
					console.error("Gagal mengupdate check-in di Firestore:", err);
				}
			}
			return true;
		}

		async clearAllOrders() {
			this.ordersData = [];
			localStorage.removeItem("hiddenIslandAllOrders");

			// Reset sold seats
			this.ticketConfig.presale1.soldSeats = 0;
			this.ticketConfig.presale2.soldSeats = 0;
			localStorage.setItem("artfest_ticket_config", JSON.stringify(this.ticketConfig));

			this.notifyOrdersListeners();
			this.notifyTicketListeners();

			if (this.isFirebaseReady && this.db && this.fsModules) {
				try {
					const { collection, getDocs, deleteDoc, doc, setDoc } = this.fsModules;
					const snap = await getDocs(collection(this.db, "orders"));
					const deletions = [];
					snap.forEach((d) => deletions.push(deleteDoc(d.ref)));
					await Promise.all(deletions);

					await setDoc(doc(this.db, "config", "tickets"), this.ticketConfig, { merge: true });
					return true;
				} catch (err) {
					console.error("Gagal mengosongkan orders di Firestore:", err);
				}
			}
			return true;
		}

		onOrders(cb) {
			this.ordersListeners.add(cb);
			cb(this.ordersData);
			return () => this.ordersListeners.delete(cb);
		}

		notifyOrdersListeners() {
			for (const cb of this.ordersListeners) {
				try {
					cb(this.ordersData);
				} catch (e) {
					console.error("Error in orders listener callback", e);
				}
			}
		}

		// Status Listeners
		onStatus(cb) {
			this.statusListeners.add(cb);
			return () => this.statusListeners.delete(cb);
		}

		notifyStatusListeners(status) {
			for (const cb of this.statusListeners) {
				try {
					cb(status);
				} catch (e) {}
			}
		}
	}

	window.ArtfestCloud = new CloudStore();

	// Auto-init on page load
	document.addEventListener("DOMContentLoaded", () => {
		window.ArtfestCloud.init().catch((e) => console.log("Cloud init caught:", e));
	});
})(window);
