// ============================================================
// FIREBASE CONFIGURATION — THE HIDDEN ISLAND 2026
// ============================================================
// Masukkan konfigurasi Firebase web app di sini, atau hubungkan
// langsung melalui menu "Cloud Database (Firebase)" di Dasbor Subseksi (/subseksi/).
//
// Langkah mudah mendapatkan konfigurasi Firebase (100% Gratis):
// 1. Buka https://console.firebase.google.com/ dan login dengan akun Google
// 2. Klik "Add project" / "Buat project" (nama misal: hidden-island-2026)
// 3. Di menu samping, pilih "Build" -> "Firestore Database" -> "Create Database"
//    (Pilih lokasi asia-southeast2 / Jakarta atau default, mulai dalam test mode)
// 4. Buka Project Settings (ikon gerigi) -> scroll ke "Your apps" -> klik ikon Web (</>)
// 5. Salin objek `firebaseConfig` dan tempel di bawah ini atau di dasbor Subseksi.

window.DEFAULT_FIREBASE_CONFIG = {
	apiKey: "",
	authDomain: "",
	projectId: "",
	storageBucket: "",
	messagingSenderId: "",
	appId: ""
};

window.getFirebaseConfig = function () {
	const saved = localStorage.getItem("artfest_firebase_config");
	if (saved) {
		try {
			const parsed = JSON.parse(saved);
			if (parsed && parsed.projectId && parsed.apiKey) return parsed;
		} catch (e) {
			console.warn("Error parsing saved Firebase config", e);
		}
	}
	if (window.DEFAULT_FIREBASE_CONFIG && window.DEFAULT_FIREBASE_CONFIG.projectId && window.DEFAULT_FIREBASE_CONFIG.apiKey) {
		return window.DEFAULT_FIREBASE_CONFIG;
	}
	return null;
};

window.saveFirebaseConfig = function (cfg) {
	if (!cfg || !cfg.projectId) {
		localStorage.removeItem("artfest_firebase_config");
		return false;
	}
	localStorage.setItem("artfest_firebase_config", JSON.stringify(cfg));
	return true;
};
