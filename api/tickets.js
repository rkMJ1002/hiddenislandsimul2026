// Vercel Serverless Function — Ticket Configuration API
// Endpoint: /api/tickets

const BLOB_URL = "https://superjsonblob.com/api/jsonBlob/4cd7691d-01c3-4048-bba5-be29c55338d9";

const DEFAULT_CONFIG = {
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

let memoryCache = null;
let lastCacheTime = 0;

module.exports = async (req, res) => {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
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
					memoryCache = data;
					lastCacheTime = Date.now();
					return res.status(200).json(data);
				}
			} catch (fetchErr) {
				console.warn("Blob fetch failed, using fallback cache:", fetchErr);
			}

			if (memoryCache) {
				return res.status(200).json(memoryCache);
			}
			return res.status(200).json(DEFAULT_CONFIG);
		}

		if (req.method === "POST" || req.method === "PUT") {
			let payload = req.body;
			if (typeof payload === "string") {
				try {
					payload = JSON.parse(payload);
				} catch (e) {
					return res.status(400).json({ error: "Invalid JSON body" });
				}
			}

			if (!payload || !payload.presale1) {
				return res.status(400).json({ error: "Invalid ticket config payload" });
			}

			const mergedConfig = {
				presale1: { ...DEFAULT_CONFIG.presale1, ...payload.presale1 },
				presale2: { ...DEFAULT_CONFIG.presale2, ...payload.presale2 }
			};

			memoryCache = mergedConfig;
			lastCacheTime = Date.now();

			try {
				await fetch(BLOB_URL, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						"Accept": "application/json"
					},
					body: JSON.stringify(mergedConfig)
				});
			} catch (putErr) {
				console.warn("Failed persisting to blob:", putErr);
			}

			return res.status(200).json({
				success: true,
				data: mergedConfig
			});
		}

		return res.status(405).json({ error: "Method not allowed" });
	} catch (err) {
		console.error("API /api/tickets error:", err);
		return res.status(500).json({ error: "Internal Server Error", details: err.message });
	}
};
