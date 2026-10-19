/**
 * The Hidden Island - Cookie Consent Banner
 * Self-contained vanilla JS widget with zero external dependencies.
 * Respects theme palette: #CFD4D0, #B7A97C, #213D3A, #4B5E35, #282B28
 */
(function() {
	// If consent already saved, do not render banner
	if (localStorage.getItem('hiddenIslandCookieConsent')) {
		return;
	}

	// Determine link to Cookie Policy depending on current directory
	let cookiePolicyUrl = '../legal/index.html#cookie';
	const pathname = window.location.pathname;
	if (pathname.includes('/legal/')) {
		cookiePolicyUrl = 'index.html#cookie';
	} else if (pathname.endsWith('/') || pathname.endsWith('index.html') && !pathname.includes('/home/') && !pathname.includes('/tiket/') && !pathname.includes('/checkout/') && !pathname.includes('/404/')) {
		cookiePolicyUrl = 'legal/index.html#cookie';
	}

	// Inject styles
	const style = document.createElement('style');
	style.textContent = `
		.cookieConsentBanner {
			position: fixed;
			bottom: 24px;
			right: 24px;
			max-width: 420px;
			width: calc(100% - 48px);
			background-color: rgba(26, 29, 26, 0.96);
			background: radial-gradient(circle at 100% 0%, #213D3A 0%, rgba(26, 29, 26, 0.96) 70%);
			border: 1px solid rgba(183, 169, 124, 0.35);
			border-radius: 8px;
			padding: 22px 24px;
			box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55);
			backdrop-filter: blur(14px);
			-webkit-backdrop-filter: blur(14px);
			z-index: 99999;
			font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
			color: #CFD4D0;
			opacity: 0;
			transform: translateY(20px);
			transition: opacity 0.35s ease, transform 0.35s ease;
		}

		.cookieConsentBanner.visible {
			opacity: 1;
			transform: translateY(0);
		}

		.cookieConsentBanner.dismissing {
			opacity: 0;
			transform: translateY(20px);
			pointer-events: none;
		}

		.cookieHeaderRow {
			display: flex;
			align-items: center;
			gap: 10px;
			margin-bottom: 10px;
		}

		.cookieSvgIcon {
			color: #B7A97C;
			flex-shrink: 0;
			display: flex;
			align-items: center;
		}

		.cookieBannerTitle {
			font-family: 'Syne', sans-serif;
			font-size: 16px;
			font-weight: 700;
			color: #CFD4D0;
			letter-spacing: 0.02em;
			margin: 0;
		}

		.cookieBannerText {
			font-size: 13px;
			line-height: 1.6;
			color: rgba(207, 212, 208, 0.8);
			margin: 0 0 18px 0;
		}

		.cookiePolicyLink {
			color: #B7A97C;
			text-decoration: underline;
			text-underline-offset: 3px;
			font-weight: 600;
			transition: color 0.2s;
		}

		.cookiePolicyLink:hover {
			color: #CFD4D0;
		}

		.cookieButtonRow {
			display: flex;
			align-items: center;
			gap: 10px;
			flex-wrap: wrap;
		}

		.btnCookieAccept {
			background-color: #B7A97C;
			color: #282B28;
			border: 1px solid #B7A97C;
			border-radius: 6px;
			padding: 9px 18px;
			font-family: 'Plus Jakarta Sans', sans-serif;
			font-size: 13px;
			font-weight: 700;
			cursor: pointer;
			transition: background-color 0.2s, transform 0.15s;
		}

		.btnCookieAccept:hover {
			background-color: #CFD4D0;
			border-color: #CFD4D0;
			transform: translateY(-1px);
		}

		.btnCookieEssential {
			background-color: transparent;
			color: #CFD4D0;
			border: 1px solid rgba(183, 169, 124, 0.35);
			border-radius: 6px;
			padding: 9px 16px;
			font-family: 'Plus Jakarta Sans', sans-serif;
			font-size: 13px;
			font-weight: 600;
			cursor: pointer;
			transition: background-color 0.2s, border-color 0.2s, color 0.2s;
		}

		.btnCookieEssential:hover {
			background-color: rgba(75, 94, 53, 0.3);
			border-color: #B7A97C;
			color: #B7A97C;
		}

		@media (max-width: 600px) {
			.cookieConsentBanner {
				bottom: 12px;
				right: 12px;
				left: 12px;
				width: auto;
				padding: 18px 18px;
			}
			.cookieButtonRow {
				flex-direction: column;
				align-items: stretch;
			}
			.btnCookieAccept, .btnCookieEssential {
				text-align: center;
			}
		}
	`;
	document.head.appendChild(style);

	// Create and render banner
	function initBanner() {
		const banner = document.createElement('div');
		banner.className = 'cookieConsentBanner';
		banner.setAttribute('role', 'dialog');
		banner.setAttribute('aria-label', 'Persetujuan Cookie');
		banner.innerHTML = `
			<div class="cookieHeaderRow">
				<span class="cookieSvgIcon">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"></circle>
						<circle cx="10" cy="8" r="1.5" fill="currentColor"></circle>
						<circle cx="14" cy="11" r="1" fill="currentColor"></circle>
						<circle cx="8" cy="14" r="1" fill="currentColor"></circle>
						<circle cx="15" cy="16" r="1.5" fill="currentColor"></circle>
					</svg>
				</span>
				<h3 class="cookieBannerTitle">Persetujuan Cookie</h3>
			</div>
			<p class="cookieBannerText">
				The Hidden Island menggunakan cookie esensial untuk menyimpan kategori tiket dan sesi pemesanan Anda. Dengan melanjutkan, Anda menyetujui <a href="${cookiePolicyUrl}" class="cookiePolicyLink">Kebijakan Cookie</a> kami.
			</p>
			<div class="cookieButtonRow">
				<button type="button" class="btnCookieAccept" id="btnAcceptCookies">Terima Semua</button>
				<button type="button" class="btnCookieEssential" id="btnEssentialCookies">Hanya Esensial</button>
			</div>
		`;

		document.body.appendChild(banner);

		// Trigger entrance animation slightly after mount
		setTimeout(() => {
			banner.classList.add('visible');
		}, 150);

		// Dismiss handler
		function dismiss(choice) {
			localStorage.setItem('hiddenIslandCookieConsent', choice);
			banner.classList.remove('visible');
			banner.classList.add('dismissing');
			setTimeout(() => {
				banner.remove();
			}, 350);
		}

		document.getElementById('btnAcceptCookies').addEventListener('click', () => dismiss('all'));
		document.getElementById('btnEssentialCookies').addEventListener('click', () => dismiss('essential'));
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initBanner);
	} else {
		initBanner();
	}
})();
