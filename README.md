# The Hidden Island — Simulasi Artfest Kolese Santo Yusup 2026

Website resmi simulasi acara pentas seni tahunan **Kosayu Artfest 2026: The Hidden Island**, diselenggarakan oleh OSIS SMAK Kolese Santo Yusup Malang.

## 🏝️ Halaman & Rute Aplikasi

- **Beranda (`/home/`)**: Penjelasan festival, hitung mundur open gate (23 Oktober 2026), maskot pulau, peta lokasi interaktif Bukit Doa Immanuel (BDI) Sukolilo Prigen.
- **Pemesanan Tiket (`/tiket/`)**: Pemilihan tier tiket Presale 1 (Rp 75.000) dan Presale 2 (Rp 90.000) dengan popout modal pemesanan interaktif.
- **Checkout (`/checkout/`)**: Rincian pesanan, konversi mata uang (IDR/USD), diskon kupon promo, simulasi metode pembayaran (Pear Pay, Dpay, Transfer Bank, QRIS).
- **Kontak Panitia (`/kontak/`)**: Narahubung resmi panitia ticketing & informasi (Ivy & Cherise).
- **Halaman Legalitas (`/legal/`)**: Kebijakan Privasi, Syarat & Ketentuan Penggunaan, serta Kebijakan Cookie lengkap dengan widget cookie consent banner.
- **Portal Panitia / Admin (`/admin/`)**: Portal administrasi terlindungi autentikasi panitia untuk validasi tiket, simulasi pemindai barcode / QR gate scanner, data pesanan, dan ekspor CSV.
  - **Username:** `artfest`
  - **Password:** `2026`
- **Error 404 (`/404.html`)**: Halaman penunjuk arah navigasi kabut pulau tersembunyi.

## 🚀 Panduan Deploy ke Vercel

1. Buka [Vercel Dashboard](https://vercel.com/dashboard).
2. Klik **Add New...** > **Project**.
3. Pilih repository **`hiddenislandsimul2026`**.
4. Biarkan konfigurasi build sebagai default (*Other* / Static Site), lalu klik **Deploy**.
5. File `vercel.json` dan `index.html` di root sudah terkonfigurasi untuk mengarahkan pengunjung secara otomatis dan mulus.
