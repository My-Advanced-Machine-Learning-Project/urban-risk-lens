# 🚀 GitHub Deployment Guide

## GitHub'a Projeyi Yükleme Adımları

### 1️⃣ GitHub Repository Oluşturma

1. **GitHub'da yeni repository oluşturun:**
   - https://github.com/new adresine gidin
   - Repository name: `urban-risk-lens` (veya istediğiniz isim)
   - Description: "NLP-based earthquake damage analysis from Turkish news media"
   - **Public** seçin (herkes görebilsin)
   - README, .gitignore, license EKLEMEDEN oluşturun (zaten var)

### 2️⃣ Local Repository'yi GitHub'a Bağlama

Terminalinizde şu komutları çalıştırın:

```bash
# GitHub repository URL'inizi buraya yazın (yourusername yerine kendi kullanıcı adınızı yazın)
git remote add origin https://github.com/yourusername/urban-risk-lens.git

# Varsayılan branch'i main olarak ayarlayın
git branch -M main

# İlk push
git push -u origin main
```

### 3️⃣ GitHub Pages Aktifleştirme

1. **Repository Settings'e gidin:**
   - GitHub repository sayfanızda **Settings** sekmesine tıklayın

2. **Pages bölümünü bulun:**
   - Sol menüden **Pages** seçeneğine tıklayın

3. **Source ayarlarını yapın:**
   - **Source:** `Deploy from a branch` seçin
   - **Branch:** `main` seçin
   - **Folder:** `/docs` seçin
   - **Save** butonuna tıklayın

4. **5-10 dakika bekleyin:**
   - GitHub Pages sitenizi yayınlayacak
   - Sayfa otomatik yenilendiğinde link göreceksiniz

### 4️⃣ Canlı Demo Linki

Yayınlandıktan sonra haritalarınız şu adreste görünecek:

```
https://yourusername.github.io/urban-risk-lens/
```

**Alternatif linkler:**
- Ana sayfa (detailed map): `https://yourusername.github.io/urban-risk-lens/`
- City summary: `https://yourusername.github.io/urban-risk-lens/damage_map_city_summary.html`

---

## 📝 README'yi Güncelleme

GitHub Pages linkiniz hazır olunca README.md dosyasındaki linkleri güncelleyin:

```bash
# README.md dosyasını düzenleyin
# "yourusername" kısmını kendi kullanıcı adınızla değiştirin
```

Ardından değişiklikleri commit edin:

```bash
git add README.md
git commit -m "Update live demo links with actual GitHub Pages URL"
git push
```

---

## 🔧 Sorun Giderme

### Problem: 404 Page Not Found
**Çözüm:**
- Settings > Pages bölümünde folder'ın `/docs` olduğundan emin olun
- 5-10 dakika bekleyin (ilk deployment zaman alır)
- `docs/index.html` dosyasının var olduğunu kontrol edin

### Problem: Map görünmüyor
**Çözüm:**
- Browser console'u açın (F12)
- Hata mesajlarını kontrol edin
- CSS/JS dosyalarının yüklendiğinden emin olun

### Problem: Git push hatası
**Çözüm:**
```bash
# GitHub'da repository oluşturduktan sonra:
git remote -v  # Remote'u kontrol edin
git remote set-url origin https://github.com/yourusername/urban-risk-lens.git
git push -u origin main
```

---

## 🌟 Profesyonel İyileştirmeler

### Repository Açıklaması Ekleyin
Repository sayfanızda **About** bölümünün yanındaki ⚙️ ikonuna tıklayın:
- **Description:** "NLP-based earthquake damage analysis from Turkish news media"
- **Website:** GitHub Pages linkinizi ekleyin
- **Topics:** `nlp`, `earthquake`, `disaster-analysis`, `data-visualization`, `turkish`, `folium`, `python`

### Social Preview Resmi
Repository'ye bir thumbnail resmi eklemek için:
1. Haritanızın screenshot'ını alın
2. 1280x640 px boyutunda resize edin
3. Repository Settings > Social Preview > Upload Image

### Badges Ekleyin
README.md'ye badge'ler eklenmiş durumda. Renklerini özelleştirmek için:
- https://shields.io/ sitesini kullanın

---

## 📊 Takip ve Analitik

### GitHub Traffic
- Repository > Insights > Traffic
- Ziyaretçi sayılarını ve trafik kaynaklarını görebilirsiniz

### Google Analytics (İsteğe Bağlı)
HTML dosyalarına GA kodu ekleyerek detaylı analitik yapabilirsiniz.

---

## 🔄 Gelecekte Güncellemeler

Haritaları güncelledikten sonra:

```bash
# Değişiklikleri stage'e alın
git add nlp-disaster/damage_map*.html docs/

# Commit mesajı ile kaydedin
git commit -m "Update damage maps with new data"

# GitHub'a push edin
git push
```

GitHub Pages otomatik olarak güncellenecek (1-2 dakika içinde).

---

## ✅ Başarı Kontrol Listesi

- [ ] GitHub repository oluşturuldu
- [ ] Local repository GitHub'a push edildi
- [ ] GitHub Pages aktifleştirildi (`/docs` klasöründen)
- [ ] Canlı demo linki çalışıyor
- [ ] README.md'de linkler güncellendi
- [ ] Repository açıklaması ve topics eklendi
- [ ] Social preview resmi yüklendi (opsiyonel)

---

## 🎉 Tamamlandı!

Projeniz artık herkese açık ve canlı demo ile GitHub'da yayında!

**Paylaşım için kısa link:**
```
https://github.com/yourusername/urban-risk-lens
```

**Demo link:**
```
https://yourusername.github.io/urban-risk-lens/
```

Sosyal medyada, CV'de, portfolyoda paylaşabilirsiniz! 🚀
