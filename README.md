# AI Change Analysis System

Yapay zeka ve kural tabanlı anlamsal analiz motorlarını bir araya getiren **AI Change Analysis System**, yazılım projelerinde gerçekleştirilen kod değişikliklerini, mimari güncellemeleri ve yeni eklenen özellikleri analiz ederek otomatik, adım adım çalıştırılabilir test senaryoları ve etki analiz raporları üreten kapsamlı bir kalite güvence (QA) platformudur.

---

## 📌 Proje Amacı ve Kapsamı

Yazılım geliştirme döngüsünde (SDLC) kod tabanına eklenen yeni özellikler veya yapılan refactor işlemleri; öngörülemeyen yan etkilere, regresyon hatalarına ve entegrasyon problemlerine yol açabilir. 

Bu proje;
- Değişikliklerin etki alanını ve risk seviyesini otomatik olarak hesaplamak,
- Geliştiriciler ve test mühendisleri için doğrulanabilir, ön koşulları ve beklenen sonuçları tanımlanmış test adımları hazırlamak,
- Kod inceleme (Code Review) ve kalite güvence süreçlerindeki manuel test eforunu minimuma indirmek amacıyla tasarlanmıştır.

---

## 🌟 Temel Fonksiyonel Yetenekler

- **Çok Dilli ve Evrensel Kod Analizi:**  
  C# (Unity / .NET), TypeScript, JavaScript, Python, Go, Java, Rust ve SQL gibi modern programlama dillerindeki sınıf, fonksiyon, metod ve veri modellerini anlamsal olarak ayrıştırır.

- **Risk ve Etki Skoru Değerlendirmesi:**  
  Kod değişikliklerinin büyüklüğüne ve kritiklik derecesine göre risk seviyesini (Düşük, Orta, Yüksek, Kritik) ve etki alanlarını belirler.

- **Adım Adım Çalıştırılabilir Test Planı Üretimi:**  
  Her bir işlevsel bileşen için ön koşul, adım adım test talimatı, öncelik derecesi (P1, P2, P3) ve doğrulanabilir beklenen sonuç üretir.

- **Görsel Değişiklik İnceleme (Semantic Diff):**  
  Mevcut kod ile yeni durum arasındaki satır bazlı eklemeleri, silinmeleri ve değişiklikleri renkli ve etkileşimli bir arayüz üzerinde sunar.

- **Etkileşimli Test Takibi ve Dışa Aktarma:**  
  Oluşturulan test adımlarının tamamlanma durumunu interaktif kontrol listeleri üzerinden takip etme; sonuçları Markdown, JSON ve CSV formatlarında dışa aktarma imkânı sunar.

- **Gelişmiş Veri ve Oturum Güvenliği:**  
  Yazım sırasında otomatik yerel taslak kaydetme, `Ctrl + S` kısayolu, olası kesinti ve tarayıcı kapanmalarına karşı oturum kurtarma desteği içerir.

- **Senaryo ve Şablon Motoru:**  
  Farklı platformlar ve senaryolar için hazır test şablonları sunarken, kullanıcıların özel şablonlar tanımlamasına ve arşivlemesine olanak tanır.

- **Çoklu Girdi Desteği (Prompt, PDF, Word, Kaynak Kod):**  
  Değişiklik verilerini manuel kod yapıştırmanın ötesinde; doğal dilde prompt / senaryo metni olarak girebilme, PDF (.pdf), Word (.docx), metin (.txt, .md) veya doğrudan kod dosyalarını sürükle-bırak ile yükleyip otomatik ayrıştırarak test planı üretebilme. Tekil dosya veya eski-yeni versiyon dosyalarını karşılaştırma imkânı.

---

## 🏗️ Mimari ve Teknolojik Altyapı

Proje, modern yazılım mimarisi prensiplerine uygun olarak bağımsız katmanlar halinde yapılandırılmıştır:

- **Kullanıcı Arayüzü (Frontend):**  
  Bileşen tabanlı, modern ve reaktif bir kullanıcı deneyimi sunan React mimarisi, güçlü tip güvenliği sağlayan TypeScript altyapısı ve Material Design tasarım sistemi.

- **Uygulama ve Analiz Sunucusu (Backend):**  
  Modüler katmanlı mimariye (Controller, Service, Route, Middleware) sahip, yüksek performanslı ve genişletilebilir Node.js & Express REST API omurgası.

- **Veri ve Kalıcılık Katmanı:**  
  İlişkisel veri modellemesi için PostgreSQL ve Prisma ORM entegrasyonu; veri güvenliğini ve kesintisizliği garanti altına alan esnek veri yönetim mekanizması.
