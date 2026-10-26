# AI Change Analysis System

Bu proje, yapay zeka destekli değişiklik analizi (AI Change Analysis) için geliştirilmiş modern, container tabanlı bir Full-Stack uygulamadır.

---

## 📌 1. Mevcut Sistem Durumu

Sistem şu anda **tamamen çalışır durumdadır** ve 3 ana bileşenden oluşmaktadır:

| Servis | Teknoloji | Durum | Port / URL |
| :--- | :--- | :---: | :--- |
| **Frontend** | React 18, Vite 5, TypeScript, MUI | 🟢 Aktif (Up) | [http://localhost:3000](http://localhost:3000) |
| **Backend** | Express.js, TypeScript, Prisma ORM | 🟢 Aktif (Up) | [http://localhost:4000](http://localhost:4000) (Sağlık: `/health`) |
| **Veritabanı** | PostgreSQL 16 (Alpine) | 🟢 Aktif (Up) | `localhost:5432` |

---

## 🚀 2. Sistemi Çalıştırma Rehberi

Proje **Docker Compose** ile tek komutla çalışacak şekilde yapılandırılmıştır.

### Ön Koşullar
- **Docker Desktop** (çalışır vaziyette olmalıdır)
- **Node.js** (lokal geliştirmeler için, v20+)

---

### A. Docker ile Çalıştırma (Önerilen)

Terminalinizi (PowerShell veya CMD) proje ana dizininde açın:

```powershell
cd C:\Users\berkay.kurt\Desktop\Deneme\Test-AI
```

#### 1. Sistemi Başlatma (İlk Kurulum veya Güncelleme Sonrası)
Konteynerleri yeniden derleyip arka planda başlatmak için:
```powershell
docker compose up -d --build
```

#### 2. Normal Başlatma (Daha önce derlendiyse)
```powershell
docker compose up -d
```

#### 3. Sistemi Durdurma
Veriler kaybolmadan sadece konteynerleri durdurmak için:
```powershell
docker compose down
```

Veritabanı dâhil her şeyi sıfırlayarak durdurmak için:
```powershell
docker compose down -v
```

#### 4. Servis Durumlarını ve Logları Kontrol Etme
Çalışan konteynerleri listelemek için:
```powershell
docker compose ps
```

Frontend loglarını canlı izlemek için:
```powershell
docker logs -f frontend
```

Backend loglarını canlı izlemek için:
```powershell
docker logs -f backend
```

---

### B. Lokal Olarak (Docker Olmadan) Çalıştırma

Eğer Docker yerine doğrudan kendi bilgisayarınızda geliştirmek isterseniz:

#### 1. Backend'i Başlatma
```powershell
cd backend
npm install
npx prisma generate
npm run dev
```
Backend `http://localhost:4000` adresinde açılır.

#### 2. Frontend'i Başlatma (Yeni bir terminalde)
```powershell
cd frontend
npm install
npm run dev
```
Frontend `http://localhost:3000` adresinde açılır.

---

## 📁 3. Proje Dizin Yapısı

```text
Test-AI/
├── docker-compose.yml          # Tüm servislerin Docker orkestrasyonu
├── README.md                   # Proje kullanım dokümantasyonu
│
├── backend/
│   ├── Dockerfile              # Backend container imajı
│   ├── package.json            # Node.js bağımlılıkları ve scriptler
│   ├── tsconfig.json           # TypeScript derleyici ayarları
│   ├── .env                    # Ortam değişkenleri (DB URL, Port vb.)
│   ├── prisma/
│   │   └── schema.prisma       # Veritabanı veri modeli
│   └── src/
│       └── index.ts            # Express API sunucusu ve endpoint'ler
│
└── frontend/
    ├── Dockerfile              # Frontend container imajı
    ├── index.html              # Web sayfası kök HTML dosyası
    ├── package.json            # React & Vite bağımlılıkları
    ├── vite.config.ts          # Vite geliştirme sunucusu yapılandırması
    ├── tsconfig.json           # Frontend TypeScript ayarları
    └── src/
        ├── main.tsx            # React başlangıç noktası
        ├── App.tsx             # Ana Dashboard arayüzü (MUI)
        └── index.css           # Global stil tanımlamaları
```

---

## 🛠️ 4. Sık Karşılaşılan Sorunlar ve Çözümleri

1. **`localhost bağlanmayı reddetti` veya `ERR_CONNECTION_REFUSED`:**
   - Docker Desktop uygulamasının açık ve çalışır olduğunu kontrol edin.
   - `docker compose ps` komutunu çalıştırarak konteynerlerin `Up` olup olmadığını kontrol edin.

2. **`ERR_EMPTY_RESPONSE`:**
   - Genellikle port yönlendirmesi uyuşmazlığından kaynaklanır. `docker-compose.yml` içinde frontend portunun `3000:3000` olduğundan emin olun.

3. **Konteyneri Sıfırdan Temizleyip Yeniden Kurma:**
   ```powershell
   docker compose down -v
   docker compose build --no-cache
   docker compose up -d
   ```
