// Vercel Serverless Function — Ticket Orders API
// Endpoint: /api/orders

const BLOB_URL = "https://superjsonblob.com/api/jsonBlob/f274c402-a959-4132-9117-0c89444e7793";

let memoryOrders = [];

module.exports = async (req, res) => {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
	res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

	if (req.method === "OPTIONS") {
		return res.status(200).end();
	}

	try {
		if (req.method === "GET") {
			try {
				const response = await fetch(BLOB_URL, {
					headers: { "Accept": "application/json" }
				});
				if (response.ok) {
					const data = await response.json();
					if (Array.isArray(data)) {
						memoryOrders = data;
						return res.status(200).json(data);
					}
				}
			} catch (fetchErr) {
				console.warn("Blob orders fetch failed, using fallback:", fetchErr);
			}
			return res.status(200).json(memoryOrders);
		}

		if (req.method === "POST") {
			let payload = req.body;
			if (typeof payload === "string") {
				try {
					payload = JSON.parse(payload);
				} catch (e) {
					return res.status(400).json({ error: "Invalid JSON body" });
				}
			}

			// Fetch latest orders
			let currentOrders = memoryOrders;
			try {
				const response = await fetch(BLOB_URL, { headers: { "Accept": "application/json" } });
				if (response.ok) {
					const data = await response.json();
					if (Array.isArray(data)) currentOrders = data;
				}
			} catch (e) {}

			if (Array.isArray(payload)) {
				// Bulk replace
				currentOrders = payload;
			} else if (payload && payload.id) {
				// Single order add or update
				const existingIndex = currentOrders.findIndex(o => o.id === payload.id);
				if (existingIndex >= 0) {
					currentOrders[existingIndex] = { ...currentOrders[existingIndex], ...payload };
				} else {
					currentOrders.unshift(payload);
				}
			}

			memoryOrders = currentOrders;

			try {
				await fetch(BLOB_URL, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						"Accept": "application/json"
					},
					body: JSON.stringify(currentOrders)
				});
			} catch (putErr) {
				console.warn("Failed persisting orders to blob:", putErr);
			}

			return res.status(200).json({ success: true, count: currentOrders.length, orders: currentOrders });
		}

		if (req.method === "PUT") {
			let payload = req.body;
			if (typeof payload === "string") {
				try {
					payload = JSON.parse(payload);
				} catch (e) {
					return res.status(400).json({ error: "Invalid JSON body" });
				}
			}

			let listToSave = Array.isArray(payload) ? payload : (payload.orders || memoryOrders);
			memoryOrders = listToSave;

			try {
				await fetch(BLOB_URL, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						"Accept": "application/json"
					},
					body: JSON.stringify(listToSave)
				});
			} catch (putErr) {
				console.warn("Failed persisting orders to blob:", putErr);
			}

			return res.status(200).json({ success: true, count: listToSave.length });
		}

		if (req.method === "DELETE") {
			memoryOrders = [];
			try {
				await fetch(BLOB_URL, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						"Accept": "application/json"
					},
					body: JSON.stringify([])
				});
			} catch (delErr) {
				console.warn("Failed resetting orders in blob:", delErr);
			}
			return res.status(200).json({ success: true, orders: [] });
		}

		return res.status(405).json({ error: "Method not allowed" });
	} catch (err) {
		console.error("API /api/orders error:", err);
		return res.status(500).json({ error: "Internal Server Error", details: err.message });
	}
};
