# 🗺️ NLP-Based Damage Assessment

**Automated earthquake damage classification from Turkish news media using Natural Language Processing**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-View%20Maps-blue?style=for-the-badge)](https://yourusername.github.io/nlp-based-damage-assessment/)
[![Python](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

## 📖 About

This project analyzes **735 Turkish newspaper articles** about the devastating February 6, 2023 Kahramanmaraş earthquake. Using NLP keyword extraction and geolocation mapping, it creates interactive visualizations showing damage patterns as reported by the media.

### 🎯 Key Features

- 📰 Scrapes news from 5 major Turkish sources
- 🔍 Keyword-based damage classification
- 🗺️ Interactive maps with heatmaps
- 📊 City-level statistics
- 🌐 Automated geolocation
- 📈 Damage scoring (0-100)

---

## 🚀 Live Demo

👉 **[View Interactive Map](https://yourusername.github.io/nlp-based-damage-assessment/)**

- 735 interactive markers
- Damage heatmap
- Filter by severity
- Click for article details

---

## 📊 Results

| Damage Level | Articles | % |
|--------------|----------|---|
| **Severe** | 210 | 28.6% |
| **Emergency** | 154 | 21.0% |
| **Moderate** | 76 | 10.3% |

**Top Cities:**
- Adana: 26.0/100
- Gaziantep: 19.5/100
- Kahramanmaraş: 15.7/100

---

## 🛠️ Installation

```bash
git clone https://github.com/yourusername/nlp-based-damage-assessment.git
cd nlp-based-damage-assessment
pip install -r requirements.txt
python damage_classifier.py
python create_damage_map.py
```

---

## 📁 Project Structure

```
├── damage_classifier.py        # Core classifier
├── create_damage_map.py        # Map generator
├── orijinal_gazete.py         # News scraper
├── geoloc.py                  # Geocoding
├── damage_map_detailed.html   # Interactive map
└── docs/                      # GitHub Pages
```

---

## 🔬 Methodology

**Damage Keywords:**
- Severe: *ağır hasar, yıkım, enkaz* (10 pts)
- Moderate: *orta hasar, çatlak* (5 pts)
- Emergency: *arama kurtarma* (7 pts)

**Score = Σ(keyword_count × weight), max 100**

---

## ⚠️ Disclaimer

This analyzes media narratives, NOT official damage data.  
For research/education only.

---

## 📝 License

MIT License - see [LICENSE](LICENSE)

---

## 🙏 Acknowledgments

- Turkish newspapers
- OpenStreetMap
- Folium library
- The author respectfully acknowledges the victims and survivors of the 2023 Türkiye earthquakes.

---

**Last Updated:** October 19, 2025
