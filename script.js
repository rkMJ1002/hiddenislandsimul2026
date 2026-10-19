// Waktu target Open Gate Pentas Seni
// 23 Oktober 2026, 15:00:00 WIB
const openGateDate = new Date("2026-10-23T15:00:00").getTime();

function updateCountdown() {
	const now = new Date().getTime();
	const distance = openGateDate - now;

	if (distance > 0) {
		const days = Math.floor(distance / (1000 * 60 * 60 * 24));
		const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((distance % (1000 * 60)) / 1000);

		document.getElementById("days").textContent = String(days).padStart(2, "0");
		document.getElementById("hours").textContent = String(hours).padStart(2, "0");
		document.getElementById("minutes").textContent = String(minutes).padStart(2, "0");
		document.getElementById("seconds").textContent = String(seconds).padStart(2, "0");
	} else {
		document.getElementById("days").textContent = "00";
		document.getElementById("hours").textContent = "00";
		document.getElementById("minutes").textContent = "00";
		document.getElementById("seconds").textContent = "00";
	}
}

// Jalankan langsung dan perbarui setiap 1 detik
updateCountdown();
setInterval(updateCountdown, 1000);

// Dynamic Navbar: Stays in place, adds shade and shadow when scrolling
const mainNavBar = document.getElementById('mainNavBar') || document.querySelector('.navBar');

function handleNavbarScroll() {
	if (!mainNavBar) return;
	if (window.scrollY > 20) {
		mainNavBar.classList.add('scrolled');
	} else {
		mainNavBar.classList.remove('scrolled');
	}
}

window.addEventListener('scroll', handleNavbarScroll, { passive: true });
handleNavbarScroll();

// Copy venue coordinates with toast feedback
let homeToastTimer = null;
function copyCoordinates(coords) {
	if (navigator.clipboard && navigator.clipboard.writeText) {
		navigator.clipboard.writeText(coords).then(() => {
			showHomeToast('Koordinat GPS (' + coords + ') berhasil disalin ke papan klip!');
		}).catch(() => {
			fallbackHomeCopy(coords);
		});
	} else {
		fallbackHomeCopy(coords);
	}
}

function fallbackHomeCopy(text) {
	const temp = document.createElement('input');
	temp.value = text;
	document.body.appendChild(temp);
	temp.select();
	document.execCommand('copy');
	document.body.removeChild(temp);
	showHomeToast('Koordinat GPS (' + text + ') berhasil disalin ke papan klip!');
}

function showHomeToast(msg) {
	const toast = document.getElementById('homeToast');
	if (!toast) return;
	toast.textContent = msg;
	toast.classList.add('show');
	clearTimeout(homeToastTimer);
	homeToastTimer = setTimeout(() => {
		toast.classList.remove('show');
	}, 3000);
}
