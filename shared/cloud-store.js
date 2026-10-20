// ============================================================
// CLOUD STORE & REALTIME SYNC ENGINE — THE HIDDEN ISLAND 2026
// ============================================================
// Multi-tier synchronization engine:
// 1. Built-in Global Cloud Sync (zero config, cross-browser & cross-device)
// 2. Firebase Firestore Realtime WebSockets (optional upgrade)
// 3. LocalStorage instant offline cache & fallback

(function (window) {
	const CLOUD_CONFIG_ENDPOINT = "https://api.restful-api.dev/objects/ff808181a09d98f701a158a435992a12";
	const CLOUD_ORDERS_ENDPOINT = "https://api.restful-api.dev/objects/ff808181a09d98f701a158c0649e2aa0";

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

			// Re-fetch cloud state immediately when user switches tabs or returns to browser
			document.addEventListener("visibilitychange", () => {
				if (document.visibilityState === "visible") {
					this.fetchCloudConfig();
					this.fetchCloudOrders();
				}
			});
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

				// Case B: Built-in Global Cloud Relay (Works Out-Of-The-Box)
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
				if (!this.isFirebaseReady && this.isCloudRelayActive) {
					this.fetchCloudConfig();
					this.fetchCloudOrders();
				}
			}, 3000);
		}

		// ==================== GLOBAL CLOUD RELAY APIS ====================
		async fetchCloudConfig() {
			try {
				const res = await fetch(CLOUD_CONFIG_ENDPOINT);
				if (!res.ok) return;
				const json = await res.json();
				if (json && json.data && json.data.presale1) {
					const remote = json.data;
					const changed = JSON.stringify(this.ticketConfig) !== JSON.stringify(remote);
					if (changed) {
						this.ticketConfig = {
							presale1: { ...DEFAULT_TICKET_CONFIG.presale1, ...remote.presale1 },
							presale2: { ...DEFAULT_TICKET_CONFIG.presale2, ...remote.presale2 }
						};
						localStorage.setItem("artfest_ticket_config", JSON.stringify(this.ticketConfig));
						this.notifyTicketListeners();
					}
				}
			} catch (e) {
				// Offline or relay hiccup, keep local cache
			}
		}

		async fetchCloudOrders() {
			try {
				const res = await fetch(CLOUD_ORDERS_ENDPOINT);
				if (!res.ok) return;
				const json = await res.json();
				if (json && json.data && Array.isArray(json.data.orders)) {
					const remoteOrders = json.data.orders;
					const changed = JSON.stringify(this.ordersData) !== JSON.stringify(remoteOrders);
					if (changed) {
						this.ordersData = remoteOrders;
						localStorage.setItem("hiddenIslandAllOrders", JSON.stringify(this.ordersData));
						this.notifyOrdersListeners();
					}
				}
			} catch (e) {
				// Offline or relay hiccup, keep local cache
			}
		}

		async pushCloudConfig(config) {
			try {
				await fetch(CLOUD_CONFIG_ENDPOINT, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: "artfest_ticket_config",
						data: config
					})
				});
			} catch (e) {
				console.warn("Gagal push config ke cloud relay", e);
			}
		}

		async pushCloudOrders(orders) {
			try {
				await fetch(CLOUD_ORDERS_ENDPOINT, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: "hidden_island_all_orders",
						data: { orders: orders }
					})
				});
			} catch (e) {
				console.warn("Gagal push orders ke cloud relay", e);
			}
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

			// 1. Push to Cloud Relay
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

			// 1. Push to Cloud Relay
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

			// 1. Push to Cloud Relay
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

			// 1. Push to Cloud Relay
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
