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

// Mobile Navigation Toggle
function toggleMobileNav() {
	const menu = document.getElementById('mainNavMenu');
	const btn = document.getElementById('navHamburgerBtn');
	if (!menu || !btn) return;
	const isOpen = menu.classList.toggle('open');
	btn.classList.toggle('active', isOpen);
	btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function closeMobileNav() {
	const menu = document.getElementById('mainNavMenu');
	const btn = document.getElementById('navHamburgerBtn');
	if (menu) menu.classList.remove('open');
	if (btn) {
		btn.classList.remove('active');
		btn.setAttribute('aria-expanded', 'false');
	}
}

document.addEventListener('click', (e) => {
	const nav = document.getElementById('mainNavBar');
	const menu = document.getElementById('mainNavMenu');
	if (nav && menu && menu.classList.contains('open')) {
		if (!nav.contains(e.target)) {
			closeMobileNav();
		}
	}
});

// ============================================================
// ABOUT ARTFEST PHOTO CAROUSEL (Frameless Multi-Card Stage)
// ============================================================
(function initAboutCarousel() {
	const track = document.getElementById('carouselTrack');
	const prevBtn = document.getElementById('carouselPrevBtn');
	const nextBtn = document.getElementById('carouselNextBtn');
	const dotsContainer = document.getElementById('carouselDots');
	const carousel = document.getElementById('aboutCarousel');

	if (!track || !carousel) return;

	const slides = track.querySelectorAll('.gallerySlide, .carouselSlide');
	const dots = dotsContainer ? dotsContainer.querySelectorAll('.galleryDotItem, .carouselDot') : [];
	const totalSlides = slides.length;
	let currentIndex = 0;
	let autoplayTimer = null;

	function updateCarousel() {
		const activeSlide = slides[currentIndex];
		if (!activeSlide) return;

		const slideWidth = activeSlide.offsetWidth;
		const containerWidth = carousel.offsetWidth;
		const centerOffset = (containerWidth - slideWidth) / 2;
		const targetX = centerOffset - (currentIndex * slideWidth);

		track.style.transform = `translateX(${targetX}px)`;

		slides.forEach((s, idx) => {
			s.classList.toggle('active', idx === currentIndex);
		});
		dots.forEach((d, idx) => {
			d.classList.toggle('active', idx === currentIndex);
			d.setAttribute('aria-current', idx === currentIndex ? 'true' : 'false');
		});
	}

	function goToSlide(index) {
		currentIndex = (index + totalSlides) % totalSlides;
		updateCarousel();
	}

	function nextSlide() {
		goToSlide(currentIndex + 1);
	}

	function prevSlide() {
		goToSlide(currentIndex - 1);
	}

	if (prevBtn) prevBtn.addEventListener('click', () => {
		prevSlide();
		restartAutoplay();
	});

	if (nextBtn) nextBtn.addEventListener('click', () => {
		nextSlide();
		restartAutoplay();
	});

	dots.forEach((dot, idx) => {
		dot.addEventListener('click', () => {
			goToSlide(idx);
			restartAutoplay();
		});
	});

	function startAutoplay() {
		if (autoplayTimer) clearInterval(autoplayTimer);
		autoplayTimer = setInterval(nextSlide, 4500);
	}

	function stopAutoplay() {
		if (autoplayTimer) {
			clearInterval(autoplayTimer);
			autoplayTimer = null;
		}
	}

	function restartAutoplay() {
		stopAutoplay();
		startAutoplay();
	}

	carousel.addEventListener('mouseenter', stopAutoplay);
	carousel.addEventListener('mouseleave', startAutoplay);

	window.addEventListener('resize', updateCarousel, { passive: true });

	// Mobile Touch Swipe Navigation
	let touchStartX = 0;
	let touchEndX = 0;

	carousel.addEventListener('touchstart', (e) => {
		touchStartX = e.changedTouches[0].screenX;
		stopAutoplay();
	}, { passive: true });

	carousel.addEventListener('touchend', (e) => {
		touchEndX = e.changedTouches[0].screenX;
		const diff = touchStartX - touchEndX;
		if (Math.abs(diff) > 40) {
			if (diff > 0) nextSlide();
			else prevSlide();
		}
		startAutoplay();
	}, { passive: true });

	// Initial layout rendering
	setTimeout(updateCarousel, 50);
	startAutoplay();
})();

