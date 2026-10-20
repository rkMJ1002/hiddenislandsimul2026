// ============================================================
// CLOUD STORE & REALTIME SYNC ENGINE — THE HIDDEN ISLAND 2026
// ============================================================
// Multi-tier synchronization engine:
// 1. Built-in Global Cloud Sync (zero config, cross-browser & cross-device)
// 2. Firebase Firestore Realtime WebSockets (optional upgrade)
// 3. LocalStorage instant offline cache & fallback

(function (window) {
	const BLOB_CONFIG_ENDPOINT = "https://superjsonblob.com/api/jsonBlob/4cd7691d-01c3-4048-bba5-be29c55338d9";
	const BLOB_ORDERS_ENDPOINT = "https://superjsonblob.com/api/jsonBlob/f274c402-a959-4132-9117-0c89444e7793";

	function getApiBase() {
		if (typeof window !== "undefined" && window.location && window.location.origin) {
			const o = window.location.origin.toLowerCase();
			if (o.includes("thehiddenisland.site") || o.includes("localhost") || o.includes("127.0.0.1") || o.includes(".vercel.app")) {
				return "";
			}
		}
		return "https://thehiddenisland.site";
	}

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
			this.isCloudRelayActive = true;
			this.initPromise = null;
			this.firebaseApp = null;
			this.db = null;
			this.fsModules = null;

			this.ticketListeners = new Set();
			this.ordersListeners = new Set();
			this.statusListeners = new Set();

			this.unsubTicketSnapshot = null;
			this.unsubOrdersSnapshot = null;
			this.pollingInterval = null;

			this.ticketConfig = this.loadLocalTicketConfig();
			this.ordersData = this.loadLocalOrders();

			// Listen to local storage events for same-browser cross-tab instant sync
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

			// Re-fetch cloud state immediately when user switches tabs or returns to browser
			const refreshOnFocus = () => {
				if (!document.hidden) {
					this.fetchCloudConfig();
					this.fetchCloudOrders();
				}
			};
			document.addEventListener("visibilitychange", refreshOnFocus);
			window.addEventListener("focus", refreshOnFocus);
		}

		// Load from LocalStorage (Instant cache)
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

		// Initialize Connection (Firebase if configured, else Global Cloud Relay)
		async init() {
			if (this.initPromise) return this.initPromise;

			this.initPromise = (async () => {
				const fbCfg = typeof window.getFirebaseConfig === "function" ? window.getFirebaseConfig() : null;

				// Case A: User has provided Firebase Credentials
				if (fbCfg && fbCfg.projectId && fbCfg.apiKey) {
					try {
						this.notifyStatusListeners({
							connecting: true,
							message: "Menghubungkan ke Cloud Firestore..."
						});

						const [appModule, firestoreModule] = await Promise.all([
							import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
							import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
						]);

						this.fsModules = firestoreModule;
						this.firebaseApp = appModule.initializeApp(fbCfg, "artfest-client-" + Date.now());
						this.db = firestoreModule.getFirestore(this.firebaseApp);
						this.isFirebaseReady = true;

						this.attachFirebaseTicketListener();
						this.attachFirebaseOrdersListener();

						this.notifyStatusListeners({
							connected: true,
							mode: "firebase",
							projectId: fbCfg.projectId,
							message: `Terhubung ke Firebase Firestore (${fbCfg.projectId}) — Real-time Aktif`
						});

						return true;
					} catch (err) {
						console.warn("Inisialisasi Firebase gagal, beralih ke Global Cloud Relay:", err);
					}
				}

				// Case B: Built-in Global Cloud Sync (Works Out-Of-The-Box)
				this.isFirebaseReady = false;
				this.isCloudRelayActive = true;

				await Promise.all([this.fetchCloudConfig(), this.fetchCloudOrders()]);
				this.startRelayPolling();

				this.notifyStatusListeners({
					connected: true,
					mode: "global_relay",
					projectId: "Global Cloud",
					message: "Terhubung ke Global Cloud Database — Sinkronisasi Lintas Browser & HP Aktif"
				});

				return true;
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
			if (this.pollingInterval) {
				clearInterval(this.pollingInterval);
				this.pollingInterval = null;
			}
			this.initPromise = null;
			return this.init();
		}

		startRelayPolling() {
			if (this.pollingInterval) clearInterval(this.pollingInterval);
			this.pollingInterval = setInterval(() => {
				if (document.hidden) return; // paused when tab is inactive
				if (!this.isFirebaseReady && this.isCloudRelayActive) {
					this.fetchCloudConfig();
					this.fetchCloudOrders();
				}
			}, 3500);
		}

		// ==================== GLOBAL CLOUD APIS ====================
		async fetchCloudConfig() {
			let remote = null;

			// Method 1: Same-origin / Vercel API
			try {
				const apiBase = getApiBase();
				const res = await fetch(`${apiBase}/api/tickets?_t=${Date.now()}`, {
					headers: { Accept: "application/json" },
					cache: "no-store"
				});
				if (res.ok) {
					const json = await res.json();
					if (json && json.presale1) remote = json;
					else if (json && json.data && json.data.presale1) remote = json.data;
				}
			} catch (e) {}

			// Method 2: Direct Blob Storage Fallback
			if (!remote) {
				try {
					const res = await fetch(`${BLOB_CONFIG_ENDPOINT}?_t=${Date.now()}`, {
						headers: { Accept: "application/json" },
						cache: "no-store"
					});
					if (res.ok) {
						const json = await res.json();
						if (json && json.presale1) remote = json;
					}
				} catch (e) {}
			}

			if (remote && remote.presale1) {
				const nextConfig = {
					presale1: { ...DEFAULT_TICKET_CONFIG.presale1, ...remote.presale1 },
					presale2: { ...DEFAULT_TICKET_CONFIG.presale2, ...remote.presale2 }
				};
				const changed = JSON.stringify(this.ticketConfig) !== JSON.stringify(nextConfig);
				if (changed) {
					this.ticketConfig = nextConfig;
					localStorage.setItem("artfest_ticket_config", JSON.stringify(this.ticketConfig));
					this.notifyTicketListeners();
				}
			}
		}

		async fetchCloudOrders() {
			let remoteOrders = null;

			// Method 1: Same-origin / Vercel API
			try {
				const apiBase = getApiBase();
				const res = await fetch(`${apiBase}/api/orders?_t=${Date.now()}`, {
					headers: { Accept: "application/json" },
					cache: "no-store"
				});
				if (res.ok) {
					const json = await res.json();
					if (Array.isArray(json)) remoteOrders = json;
					else if (json && Array.isArray(json.orders)) remoteOrders = json.orders;
				}
			} catch (e) {}

			// Method 2: Direct Blob Storage Fallback
			if (!remoteOrders) {
				try {
					const res = await fetch(`${BLOB_ORDERS_ENDPOINT}?_t=${Date.now()}`, {
						headers: { Accept: "application/json" },
						cache: "no-store"
					});
					if (res.ok) {
						const json = await res.json();
						if (Array.isArray(json)) remoteOrders = json;
					}
				} catch (e) {}
			}

			if (remoteOrders && Array.isArray(remoteOrders)) {
				const changed = JSON.stringify(this.ordersData) !== JSON.stringify(remoteOrders);
				if (changed) {
					this.ordersData = remoteOrders;
					localStorage.setItem("hiddenIslandAllOrders", JSON.stringify(this.ordersData));
					this.notifyOrdersListeners();
				}
			}
		}

		async pushCloudConfig(config) {
			const apiBase = getApiBase();

			// 1. Vercel API
			try {
				fetch(`${apiBase}/api/tickets`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(config)
				}).catch(() => {});
			} catch (e) {}

			// 2. Direct Blob fallback
			try {
				fetch(BLOB_CONFIG_ENDPOINT, {
					method: "PUT",
					headers: { "Content-Type": "application/json", "Accept": "application/json" },
					body: JSON.stringify(config)
				}).catch(() => {});
			} catch (e) {}
		}

		async pushCloudOrders(orders) {
			const apiBase = getApiBase();

			// 1. Vercel API
			try {
				fetch(`${apiBase}/api/orders`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(orders)
				}).catch(() => {});
			} catch (e) {}

			// 2. Direct Blob fallback
			try {
				fetch(BLOB_ORDERS_ENDPOINT, {
					method: "PUT",
					headers: { "Content-Type": "application/json", "Accept": "application/json" },
					body: JSON.stringify(orders)
				}).catch(() => {});
			} catch (e) {}
		}

		// ==================== FIREBASE FIRESTORE LISTENERS ====================
		attachFirebaseTicketListener() {
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
					setDoc(ticketDocRef, this.ticketConfig).catch((e) => console.warn("Seed initial config failed", e));
				}
			}, (err) => console.warn("Firestore ticket config snapshot error:", err));
		}

		attachFirebaseOrdersListener() {
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
					orders.push({
						id: docSnap.id,
						...docSnap.data()
					});
				});

				orders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
				this.ordersData = orders;
				localStorage.setItem("hiddenIslandAllOrders", JSON.stringify(this.ordersData));
				this.notifyOrdersListeners();
			}, (err) => console.warn("Firestore orders snapshot error:", err));
		}

		// ==================== PUBLIC TICKET CONFIG APIS ====================
		getTicketConfig() {
			return this.ticketConfig;
		}

		async saveTicketConfig(config) {
			this.ticketConfig = config;
			localStorage.setItem("artfest_ticket_config", JSON.stringify(config));
			this.notifyTicketListeners();

			// 1. Push to Cloud
			this.pushCloudConfig(config);

			// 2. Push to Firestore if configured
			if (this.isFirebaseReady && this.db && this.fsModules) {
				try {
					const { doc, setDoc } = this.fsModules;
					await setDoc(doc(this.db, "config", "tickets"), config, { merge: true });
				} catch (err) {
					console.error("Gagal update Firestore:", err);
				}
			}
			return true;
		}

		onTicketConfig(cb) {
			this.ticketListeners.add(cb);
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

		// ==================== PUBLIC ORDERS APIS ====================
		getOrders() {
			return this.ordersData;
		}

		async saveOrder(orderRecord) {
			const orderId = orderRecord.id;
			if (!orderRecord.timestamp) {
				orderRecord.timestamp = Date.now();
			}

			// Prepend locally for instant UI update
			const existingIndex = this.ordersData.findIndex((o) => o.id === orderId);
			if (existingIndex >= 0) {
				this.ordersData[existingIndex] = orderRecord;
			} else {
				this.ordersData.unshift(orderRecord);
			}

			// Automatically increment soldSeats in config
			const tierKey = orderRecord.tier ? orderRecord.tier.toLowerCase().replace(/\s+/g, "") : "";
			if (this.ticketConfig[tierKey]) {
				this.ticketConfig[tierKey].soldSeats = (this.ticketConfig[tierKey].soldSeats || 0) + (Number(orderRecord.qty) || 1);
			}

			localStorage.setItem("hiddenIslandAllOrders", JSON.stringify(this.ordersData));
			localStorage.setItem("artfest_ticket_config", JSON.stringify(this.ticketConfig));
			this.notifyOrdersListeners();
			this.notifyTicketListeners();

			// 1. Push to Cloud
			this.pushCloudOrders(this.ordersData);
			this.pushCloudConfig(this.ticketConfig);

			// 2. Push to Firestore if configured
			if (this.isFirebaseReady && this.db && this.fsModules) {
				try {
					const { doc, setDoc } = this.fsModules;
					await setDoc(doc(this.db, "orders", orderId), orderRecord);
					await setDoc(doc(this.db, "config", "tickets"), this.ticketConfig, { merge: true });
				} catch (err) {
					console.error("Gagal save order ke Firestore:", err);
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

			// 1. Push to Cloud
			this.pushCloudOrders(this.ordersData);

			// 2. Push to Firestore if configured
			if (this.isFirebaseReady && this.db && this.fsModules) {
				try {
					const { doc, updateDoc } = this.fsModules;
					await updateDoc(doc(this.db, "orders", orderId), {
						checkedIn: checkedIn,
						checkInTime: checkInTime
					});
				} catch (err) {
					console.error("Gagal update check-in di Firestore:", err);
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

			// 1. Push to Cloud
			try {
				const apiBase = getApiBase();
				fetch(`${apiBase}/api/orders`, { method: "DELETE" }).catch(() => {});
			} catch (e) {}

			this.pushCloudOrders([]);
			this.pushCloudConfig(this.ticketConfig);

			// 2. Push to Firestore if configured
			if (this.isFirebaseReady && this.db && this.fsModules) {
				try {
					const { collection, getDocs, deleteDoc, doc, setDoc } = this.fsModules;
					const snap = await getDocs(collection(this.db, "orders"));
					const deletions = [];
					snap.forEach((d) => deletions.push(deleteDoc(d.ref)));
					await Promise.all(deletions);
					await setDoc(doc(this.db, "config", "tickets"), this.ticketConfig, { merge: true });
				} catch (err) {
					console.error("Gagal reset orders di Firestore:", err);
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
