# TobeTube — Proje Planı v1.1
> AI Ajan Talimatnamesi | Claude Code / Cursor / Antigravity için hazırlanmıştır
> Tarih: 23 Nisan 2026

---

## ⚠️ AJANA ÖNEMLİ NOTLAR

- Bu belge bir **teknoloji doğrulama projesidir**. Her versiyon farklı bir teknik yaklaşımı test eder.
- **Veritabanı YOKTUR** (ilk aşamada). Sonraki aşamada eklenecek.
- Kod yazarken **her versiyonu izole tut**. Bir versiyonun kodu diğerini etkilemesin.
- **Tesla bypass** bu projenin özüdür. Hangi yöntemin Tesla'yı atlatıp atlatmadığı ancak gerçek Tesla'da test ile anlaşılacak.
- Commit mesajları **Türkçe** olacak.
- Herhangi bir şeyde takılırsan veya kritik bir karar gerekiyorsa **dur ve sor**, devam etme.
- Stop sinyali: `DUR`, `BEKLE`, `DEVAM ETME`

---

## ⚠️ DOSYA YAPISI İLKESİ — ÇOK ÖNEMLİ

> Her HTML, CSS ve JS dosyası **ayrı ayrı** oluşturulacak. Hiçbir CSS veya JS kodu HTML içine gömülmeyecek.

**Bunun nedeni:** Bazı player versiyonları ilerleyen süreçte **devre dışı bırakılacak**, bazıları **aktif kalacak**. Ayrı dosyalar sayesinde:
- Hangi versiyonun açık hangisinin kapalı olduğu net görülür
- Değişiklik tek bir dosyayı etkiler, diğerleri zarar görmez
- Aktif/pasif versiyon yönetimi kolaylaşır

**Kural:** `<style>` ve `<script>` tag'leri HTML içinde **OLMAYACAK**. Her zaman harici `<link rel="stylesheet">` ve `<script src="">` kullanılacak.

---

## 1. PROJE TANIMI

**TobeTube**, Tesla araçlarının tarayıcısında hareket halindeyken video oynatmayı engelleyen kısıtlamayı aşmak amacıyla geliştirilmiş bir YouTube istemcisidir. Kullanıcı Google OAuth ile giriş yapar, YouTube deneyimini (arama, trend, öneri, oynatma) TobeTube arayüzü üzerinden yaşar.

**Temel hedef:** Tesla'nın OS seviyeli video engeline yakalanmadan akıcı, yüksek kaliteli video oynatmak.

---

## 2. TEKNİK ALTYAPI

### 2.1 Stack

```
Backend:  Node.js + Express (Railway üzerinde deploy)
Frontend: Vanilla HTML/CSS/JS (framework YOK — Tesla browser uyumluluğu için)
Auth:     Google OAuth 2.0
YouTube:  youtubei.js (InnerTube API) — resmi API anahtarı GEREKMİYOR
Player:   Versiyona göre değişir (IFrame / Shaka Player / Canvas / WebGL / yt-dlp)
Deploy:   Railway (mevcut)
Lokal:    baslat.bat (Windows)
```

### 2.2 Mimari

```
Kullanıcı (Tesla Browser)
    │
    ▼
Frontend (HTML/CSS/JS)
    │
    ├─── Google OAuth → Kullanıcı oturumu
    │
    ├─── Backend API çağrısı (metadata, arama, trend, öneri)
    │         │
    │         ▼
    │    youtubei.js (InnerTube)
    │         │
    │         ▼
    │    YouTube Sunucuları (metadata)
    │
    └─── Video stream → Doğrudan YouTube'dan kullanıcıya
              (Backend video verisine DOKUNMAZ — sadece URL üretir)
```

> ⚠️ **ÖNEMLİ:** Video verisi backend'den geçmez. Backend yalnızca stream URL'lerini ve manifest dosyalarını üretir. Bu hem maliyeti düşürür hem de 1000 eşzamanlı kullanıcıya destek verir.

### 2.3 Klasör Yapısı

```
/
├── baslat.bat                         # ← Lokal başlatma betiği (Windows)
├── server.js                          # Ana Express sunucusu
├── package.json
├── .env                               # Gizli anahtarlar (commit edilmez)
├── .env.example
├── Dockerfile
├── nixpacks.toml
│
├── routes/
│   ├── auth.js                        # Google OAuth rotaları
│   ├── search.js                      # YouTube arama
│   ├── trending.js                    # Trend videolar
│   ├── video.js                       # Video detayı + stream URL
│   ├── suggestions.js                 # Video önerileri
│   └── proxy.js                       # CORS proxy (Canvas/WebGL için)
│
├── services/
│   ├── innertube.js                   # youtubei.js wrapper
│   ├── cache.js                       # Basit in-memory cache
│   ├── quota.js                       # Kullanıcı başı sorgu sayacı
│   └── ytdlp.js                       # yt-dlp wrapper (sadece V5)
│
├── middleware/
│   └── auth.middleware.js             # Session kontrolü
│
└── public/
    │
    ├── index.html                     # Ana sayfa — SADECE HTML iskelet
    │
    ├── css/
    │   ├── main.css                   # Ana sayfa stilleri
    │   ├── player.css                 # Tüm player'larda ortak temel stiller
    │   ├── player-v1.css              # V1'e özel stiller
    │   ├── player-v2.css              # V2'ye özel stiller
    │   ├── player-v3.css              # V3'e özel stiller
    │   ├── player-v4.css              # V4'e özel stiller
    │   └── player-v5.css              # V5'e özel stiller
    │
    ├── js/
    │   ├── app.js                     # Ana sayfa JS (grid, sekme yönetimi)
    │   ├── auth.js                    # Client-side auth yönetimi
    │   ├── quota-display.js           # Kota göstergesi (54/100)
    │   ├── search.js                  # Arama + sesli arama
    │   ├── player-common.js           # Tüm player'larda ortak JS
    │   ├── player-v1.js               # V1 — IFrame player mantığı
    │   ├── player-v2.js               # V2 — InnerTube + DASH + Shaka
    │   ├── player-v3.js               # V3 — InnerTube + DASH + Canvas
    │   ├── player-v4.js               # V4 — InnerTube + DASH + WebGL
    │   └── player-v5.js               # V5 — yt-dlp + Canvas
    │
    └── players/
        ├── player-v1-iframe.html          # V1: YouTube IFrame Embed
        ├── player-v2-innertube-dash.html  # V2: InnerTube + DASH + Shaka
        ├── player-v3-innertube-canvas.html # V3: InnerTube + DASH + Canvas
        ├── player-v4-innertube-webgl.html  # V4: InnerTube + DASH + WebGL
        └── player-v5-ytdlp-proxy.html      # V5: yt-dlp backend + Canvas
```

---

## 3. BASLAT.BAT — LOKAL BAŞLATMA BETİĞİ

> ⚠️ **AJANA TALİMAT:** `baslat.bat` dosyasını proje kök dizinine oluştur. Aşağıdaki adımları sırasıyla gerçekleştirir. Stack Node.js olduğu için Python venv kullanılmaz — Node'un eşdeğeri `node_modules` + `npm install`'dır.

```batch
@echo off
chcp 65001 > nul
title TobeTube — Başlatıcı

echo.
echo ╔══════════════════════════════════════╗
echo ║         TobeTube Başlatıcı           ║
echo ╚══════════════════════════════════════╝
echo.

:: ADIM 1: Eski Node.js process'lerini öldür
echo [1/5] Eski Node.js process'leri kapatılıyor...
taskkill /F /IM node.exe > nul 2>&1
timeout /t 1 /nobreak > nul

:: ADIM 2: 3000 portunu temizle
echo [2/5] Port 3000 temizleniyor...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" 2^>nul') do (
    taskkill /F /PID %%a > nul 2>&1
)
timeout /t 1 /nobreak > nul

:: ADIM 3: Bağımlılıkları kontrol et ve kur
echo [3/5] Bağımlılıklar kontrol ediliyor...
if not exist "node_modules" (
    echo      node_modules bulunamadı, npm install çalıştırılıyor...
    npm install
    if errorlevel 1 (
        echo HATA: npm install başarısız oldu!
        pause
        exit /b 1
    )
) else (
    echo      node_modules mevcut, atlanıyor.
)

:: ADIM 4: .env dosyası kontrolü
echo [4/5] Ortam değişkenleri kontrol ediliyor...
if not exist ".env" (
    echo.
    echo  ╔══════════════════════════════════════════════════╗
    echo  ║  UYARI: .env dosyası bulunamadı!                ║
    echo  ║  .env.example dosyasını kopyalayıp .env yapın.  ║
    echo  ║                                                  ║
    echo  ║  Gerekli değişkenler:                           ║
    echo  ║    GOOGLE_CLIENT_ID                             ║
    echo  ║    GOOGLE_CLIENT_SECRET                         ║
    echo  ║    GOOGLE_REDIRECT_URI                          ║
    echo  ║    SESSION_SECRET                               ║
    echo  ╚══════════════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)

:: ADIM 5: Uygulamayı başlat ve tarayıcıda aç
echo [5/5] TobeTube başlatılıyor...
echo.
echo  ┌─────────────────────────────────┐
echo  │  Adres : http://localhost:3000  │
echo  │  Çıkış : Ctrl+C                 │
echo  └─────────────────────────────────┘
echo.

:: Tarayıcıyı 2 saniye sonra aç (sunucunun hazır olması için)
start /b cmd /c "timeout /t 2 /nobreak > nul && start http://localhost:3000"

:: Sunucuyu başlat
node server.js
```

---

## 4. AUTH SİSTEMİ

### 4.1 Google OAuth 2.0

Kullanıcı "Google ile Giriş Yap" butonuna basar. Backend Google'a yönlendirir. Callback ile token alınır, session'a kaydedilir. Kullanıcı bir daha bir şey yapmaz.

**Gerekli OAuth scope'lar:**
```
https://www.googleapis.com/auth/youtube.readonly
https://www.googleapis.com/auth/userinfo.profile
```

**Önemli:** OAuth token'ı hem kullanıcı kimliği hem de YouTube API kimliği olarak kullanılır. Cookie/session tabanlı oturum. DB olmadığı için `express-session` + memory store kullanılır.

### 4.2 .env.example

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
SESSION_SECRET=cok-gizli-bir-anahtar-buraya
PORT=3000
```

---

## 5. BACKEND API ENDPOINT'LERİ

### 5.1 Auth

```
GET  /auth/google          → Google OAuth başlat
GET  /auth/callback        → OAuth callback
GET  /auth/logout          → Oturumu kapat
GET  /auth/status          → { loggedIn: bool, user: { name, avatar } }
```

### 5.2 YouTube Verileri

Tüm endpoint'ler session kontrolü yapar. Oturum yoksa 401 döner.

```
GET  /api/trending
     Response: [{ id, title, thumbnail, channel, duration, viewCount, publishedAt, isLive }]

GET  /api/search?q=sorgu
     Kota sayacını artırır (+1)
     Response: { videos: [...], nextPageToken }

GET  /api/video/:videoId
     Response: { title, channel, dashManifestUrl, formats: [{quality, itag, url, mimeType}] }

GET  /api/suggestions/:videoId
     Response: [{ id, title, thumbnail, channel, duration }]

GET  /api/quota
     Response: { used: 54, limit: 100 }

GET  /api/proxy/stream?url=ENCODED_URL
     Sadece googlevideo.com URL'lerine izin ver
     Video verisini pipe et (backend RAM'de tutma)
```

### 5.3 yt-dlp (Sadece V5)

```
GET  /api/ytdlp/stream/:videoId?quality=best
     yt-dlp ile stream URL üretir, doğrudan URL döner
```

---

## 6. FRONTEND — ANA SAYFA

### 6.1 index.html

Sadece HTML iskelet içerir. CSS ve JS harici dosyadan gelir.

```html
<!-- index.html — tüm <link> ve <script> referansları -->
<link rel="stylesheet" href="/css/main.css">
<script src="/js/auth.js" defer></script>
<script src="/js/quota-display.js" defer></script>
<script src="/js/search.js" defer></script>
<script src="/js/app.js" defer></script>
```

### 6.2 Layout

```
┌─────────────────────────────────────────────────────┐
│  [🔍 Arama kutusu]                    [🎤 Sesli ara] │
├─────────────────────────────────────────────────────┤
│  Tümü  Müzik  Haberler  Oyun  Teknoloji  Spor ...   │
├─────────────────────────────────────────────────────┤
│  [thumb][thumb][thumb][thumb][thumb][thumb]          │
│  [thumb][thumb][thumb][thumb][thumb][thumb]          │
│  [thumb][thumb][thumb][thumb][thumb][thumb]          │
├─────────────────────────────────────────────────────┤
│  🏠 Ana  │  V1  │  V2  │  V3  │  V4  │  V5         │
└─────────────────────────────────────────────────────┘
```

### 6.3 Alt Menü — Versiyon Seçici

V1–V5 butonlarına tıklanınca **yukarı doğru panel açılır:**

```
┌──────────────────────┐
│  ⚡ Hızlı (480p)     │
│  ⚖️ Dengeli (720p)   │  ← Yukarı açılır
│  🎯 Kaliteli (1080p) │
│  🤖 Otomatik (ABR)   │
└──────────────────────┘
      [V2 butonu]
```

### 6.4 Sekmeler

```
Ana Sayfa  →  Trend videoları (GET /api/trending)
Sezgisel   →  YouTube'un kullanıcıya özel önerisi
Geçmiş     →  YouTube OAuth ile erişilebiliyorsa; yoksa boş (DB'siz aşama)
```

### 6.5 Kota Göstergesi

```html
<!-- Arama kutusunun yanında küçük indicator -->
🔍 <span id="quotaUsed">0</span>/100
```

Limit dolunca: `"Günlük 100 arama limitine ulaştın. Trend videolara göz at."`

---

## 7. PLAYER SAYFALARI

### 7.1 Ortak Layout

```
┌─────────────────────────────┬──────────────────────┐
│                             │ [Öneri 1]            │
│     VİDEO ALANI             │ [Öneri 2]            │
│                             │ [Öneri 3 ... N]      │
├─────────────────────────────┤                      │
│ ▶ ──────●──────── 4:05/16:05│                      │
│ 🔊  0.75x 1x 1.25x 1.5x 2x │                      │
│ Kalite: Otomatik ▼  [⛶]    │                      │
├─────────────────────────────┴──────────────────────┤
│  🏠 Ana  │  V1  │  V2  │  V3  │  V4  │  V5        │
└─────────────────────────────────────────────────────┘
```

### 7.2 Her Player HTML'inin Referans Yapısı

```html
<!-- Örnek: player-v2-innertube-dash.html — inline CSS/JS YOK -->
<link rel="stylesheet" href="/css/player.css">
<link rel="stylesheet" href="/css/player-v2.css">

<script src="/js/auth.js" defer></script>
<script src="/js/quota-display.js" defer></script>
<script src="/js/player-common.js" defer></script>
<script src="/js/player-v2.js" defer></script>
```

### 7.3 player-common.js İçeriği (Tüm Versiyonlar Kullanır)

- Seek: akış bandına dokunuş → o noktaya atla
- Swipe: sola/sağa 50px+ → ±10 saniye
- Çalma hızı: `videoElement.playbackRate` (YouTube'a istek atmaz)
- Tam ekran: öneri paneli gizlenir, kontroller 3sn sonra kaybolur
- Bağlantı kopukluğu overlay
- Menü geçişinde pause + URL parametresiyle state taşıma
- Versiyon değiştirme: `/players/player-VX.html?videoId=X&t=245`

### 7.4 Versiyon Rozeti (player.css'de tanımlı)

```css
.version-badge { position: absolute; top: 12px; right: 12px; ... }
.badge-v1 { background: #4a4a4a; }  /* Gri   — IFrame */
.badge-v2 { background: #1a73e8; }  /* Mavi  — DASH   */
.badge-v3 { background: #0f9d58; }  /* Yeşil — Canvas */
.badge-v4 { background: #f4b400; color: #000; } /* Sarı — WebGL */
.badge-v5 { background: #db4437; }  /* Kırmızı — yt-dlp */
```

### 7.5 Dokunmatik Kuralı (player.css'de zorunlu)

```css
/* TÜM interaktif elemanlar minimum 60x60px */
button, .control-btn, .progress-bar, .speed-btn, .quality-btn {
  min-height: 60px;
  min-width: 60px;
}
```

---

## 8. PLAYER VERSİYONLARI

> ⚠️ Her versiyonun HTML + CSS + JS dosyası birbirinden **tamamen bağımsız**. Ortak mantık yalnızca `player-common.js` ve `player.css` üzerinden paylaşılır.

---

### V1 — IFrame Embed
**Dosyalar:** `player-v1-iframe.html` + `player-v1.css` + `player-v1.js`
**Bypass gücü:** Zayıf | **Amaç:** Karşılaştırma referansı

`player-v1.js`: YT.Player API ile kontrol. Kalite: `setPlaybackQuality()`. Hız: `setPlaybackRate()`.

---

### V2 — InnerTube + DASH + Shaka Player
**Dosyalar:** `player-v2-innertube-dash.html` + `player-v2.css` + `player-v2.js`
**Bypass gücü:** Orta

`player-v2.js`:
1. `GET /api/video/:id` → DASH manifest URL al
2. Shaka Player ile yükle
3. Ses+video senkronu: Shaka halleder
4. Kalite: `player.selectVariantTrack()`
5. ABR: `player.configure({ abr: { enabled: true } })`

---

### V3 — InnerTube + DASH + Canvas
**Dosyalar:** `player-v3-innertube-canvas.html` + `player-v3.css` + `player-v3.js`
**Bypass gücü:** Güçlü

`player-v3.js`:
1. `GET /api/video/:id` → stream URL (CORS proxy üzerinden)
2. Gizli `<video>` elementi (display: none)
3. `requestAnimationFrame` → `ctx.drawImage(video, ...)`
4. Ses: gizli video'dan otomatik gelir — ayrı ses yönetimi YOK
5. Pause/Resume: `video.pause()` / `video.play()` → senkron korunur

⚠️ Stream URL'si `/api/proxy/stream` üzerinden geçmeli (CORS).

---

### V4 — InnerTube + DASH + WebGL
**Dosyalar:** `player-v4-innertube-webgl.html` + `player-v4.css` + `player-v4.js`
**Bypass gücü:** Çok güçlü

`player-v4.js`:
1. V3 ile aynı video yükleme
2. `canvas.getContext('webgl')` aç
3. Her frame: `gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)`
4. `drawArrays()` ile ekrana bas
5. GPU kullanımı V3'ten iyi, Tesla'da test gerekli

---

### V5 — yt-dlp + Canvas
**Dosyalar:** `player-v5-ytdlp-proxy.html` + `player-v5.css` + `player-v5.js`
**Bypass gücü:** En güçlü (bakım gerektirir)

`player-v5.js`:
1. `GET /api/ytdlp/stream/:id` → URL al
2. V3 ile aynı Canvas render mantığı
3. Fark: stream kaynağı yt-dlp

`nixpacks.toml`'a eklenmeli:
```toml
[phases.setup]
aptPkgs = ["yt-dlp", "ffmpeg"]
```

---

## 9. KRİTİK TEKNİK NOTLAR

### 9.1 Ses-Video Senkronu — Her Versiyonda Zorunlu

- V1: IFrame API halleder
- V2: Shaka Player halleder (DASH'ta ses/video ayrı stream, Shaka senkronize eder)
- V3-V4-V5: Gizli `<video>` hem sesi hem video frame'i taşır. `video.pause()` ikisini birden durdurur.

### 9.2 CORS Proxy — Canvas/WebGL İçin Zorunlu

```javascript
// routes/proxy.js
app.get('/api/proxy/stream', async (req, res) => {
  const { url } = req.query;
  if (!url || !url.includes('googlevideo.com')) return res.status(403).send('Forbidden');
  const response = await fetch(url, { headers: { Range: req.headers.range || 'bytes=0-' } });
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', response.headers.get('content-type'));
  response.body.pipe(res); // Pipe — backend RAM'de tutmaz
});
```

### 9.3 State Taşıma — DB Olmadan

```javascript
// player-common.js
function switchVersion(newVersion) {
  const currentTime = Math.floor(video.currentTime);
  const videoId = new URLSearchParams(window.location.search).get('videoId');
  video.pause();
  window.location.href = `/players/player-${newVersion}.html?videoId=${videoId}&t=${currentTime}`;
}

// Sayfa yüklenince başlangıç pozisyonunu ayarla
const startTime = parseInt(new URLSearchParams(window.location.search).get('t')) || 0;
video.currentTime = startTime;
```

### 9.4 Renk Paleti — main.css CSS değişkenleri

```css
:root {
  --bg-primary:    #0f0f0f;
  --bg-secondary:  #1a1a1a;
  --bg-hover:      #272727;
  --text-primary:  #f1f1f1;
  --text-secondary:#aaaaaa;
  --accent-red:    #ff0000;
  --accent-live:   #cc0000;
  --border:        #303030;
  --overlay:       rgba(0,0,0,0.8);
}
```

---

## 10. GELİŞTİRME SIRASI (AJANA TALİMAT)

```
Adım 1:  package.json
Adım 2:  .env.example
Adım 3:  server.js
Adım 4:  middleware/auth.middleware.js
Adım 5:  routes/auth.js
Adım 6:  services/innertube.js
Adım 7:  services/cache.js
Adım 8:  services/quota.js
Adım 9:  routes/trending.js
Adım 10: routes/search.js
Adım 11: routes/video.js
Adım 12: routes/suggestions.js
Adım 13: routes/proxy.js
Adım 14: services/ytdlp.js
Adım 15: nixpacks.toml + Dockerfile güncelle
Adım 16: public/css/main.css
Adım 17: public/js/auth.js
Adım 18: public/js/quota-display.js
Adım 19: public/js/search.js
Adım 20: public/js/app.js
Adım 21: public/index.html
Adım 22: public/css/player.css   ← ortak stiller + rozet renkleri + 60px kuralı
Adım 23: public/js/player-common.js   ← seek, swipe, hız, tam ekran, bağlantı, state
Adım 24: public/css/player-v1.css
         public/js/player-v1.js
         public/players/player-v1-iframe.html
Adım 25: public/css/player-v2.css
         public/js/player-v2.js
         public/players/player-v2-innertube-dash.html
Adım 26: public/css/player-v3.css
         public/js/player-v3.js
         public/players/player-v3-innertube-canvas.html
Adım 27: public/css/player-v4.css
         public/js/player-v4.js
         public/players/player-v4-innertube-webgl.html
Adım 28: public/css/player-v5.css
         public/js/player-v5.js
         public/players/player-v5-ytdlp-proxy.html
Adım 29: baslat.bat
```

> ⚠️ Her adımda ilgili tüm dosyaları oluştur, sonra bir sonraki adıma geç.

---

## 11. TEST KONTROL LİSTESİ

```
□ baslat.bat hatasız çalışıyor mu?
□ Video açılıyor mu?
□ Ses ve video senkron mu?
□ Pause/Resume doğru çalışıyor mu? (kaldığı yerden devam)
□ Seek (akış bandı) çalışıyor mu?
□ Swipe ile 10 sn ileri/geri çalışıyor mu?
□ Çalma hızı senkronu bozuyor mu?
□ Kalite değişikliği çalışıyor mu?
□ Öneri listesi geliyor mu?
□ Tam ekran çalışıyor mu?
□ Bağlantı kopunca overlay görünüyor mu?
□ Menü geçişinde pause oluyor mu?
□ Geri gelince kaldığı yerden devam ediyor mu?
□ Versiyon rozeti görünüyor mu?
□ Kota sayacı doğru artıyor mu?
□ [TESLA TEST] Video görüntüsü engelleniyor mu?
□ [TESLA TEST] Ses devam ediyor mu?
```

---

## 12. RAKİP ANALİZİ

| Rakip | Yöntem | Fiyat | Zayıf Yanı |
|-------|--------|-------|------------|
| TeslaMirror | Telefon ekran yansıtma (VPN tüneli) | $5.99 | Telefon + hotspot zorunlu |
| TeslaDisplay | Hotspot üzerinden video cast | Ücretsiz(?) | Kurulum zahmetli |
| Motionstream | Web app, araç datası üzerinden | $10/ay | Yeni, UI zayıf |
| FSD Theater | Low-level API, açık kaynak | Ücretsiz | Bakımsız, ticari değil |

**TobeTube'un farkı:** Telefon gerektirmez. Google OAuth ile tam YouTube deneyimi. YouTube'a benzer arayüz. Çoklu bypass versiyonu testi.

---

## 13. İLERİ AŞAMA (Şu An Yapılmayacak)

- Veritabanı (PostgreSQL) — kullanıcı profilleri, izleme geçmişi
- Ücretli üyelik sistemi
- Kullanıcı bazlı sezgisel öneri algoritması
- Diğer araç markaları desteği
- Mobil uygulama

---

*TobeTube Proje Planı v1.1 | 23 Nisan 2026*
*Hazırlayan: Claude Sonnet 4.6*
