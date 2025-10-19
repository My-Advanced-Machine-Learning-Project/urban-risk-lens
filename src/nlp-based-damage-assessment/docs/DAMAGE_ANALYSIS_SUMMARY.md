# 🗺️ Earthquake Damage Analysis from News Data

**Project:** Urban Risk Lens - NLP Disaster Analysis
**Date:** October 19, 2025
**Data Source:** Turkish newspaper articles about 2023 Kahramanmaraş earthquake

---

## 📊 Overview

This analysis uses **Natural Language Processing (NLP)** to extract damage information from Turkish newspaper articles about the February 6, 2023 earthquake. By analyzing damage-related keywords in news text and mapping them to geographic locations, we create a damage assessment map based on media reports.

### Key Statistics

- **Total Articles Analyzed:** 735
- **Articles with Damage Mentions:** 440 (59.9%)
- **Articles with Coordinates:** 735 (100%)
- **Average Damage Score:** 13.28/100
- **Cities Covered:** 7 major cities
- **Date Range:** February 2023 - August 2025

---

## 🔍 Methodology

### 1. Data Collection (`orijinal_gazete.py`)
- **News Sources:** Sabah, Milliyet, Hürriyet, CNN Türk, Posta
- **Keywords Used:**
  - Earthquake terms: deprem, yıkım, enkaz, felaket
  - Response terms: arama kurtarma, AFAD, çadır kent
  - Damage terms: hasar tespiti, kalıcı konut
  - Affected cities: Hatay, Kahramanmaraş, Gaziantep, Adana, Malatya, etc.

### 2. Text Cleaning & Processing (`clean_sort.py`)
- Removed HTML tags, special characters, extra whitespace
- Normalized Turkish characters
- TF-IDF analysis for keyword importance
- Date sorting and deduplication

### 3. Geolocation Enrichment (`geoloc.py`, `city_district.py`)
- Extracted city/district names from article text
- Used OpenStreetMap Nominatim API for geocoding
- Added latitude/longitude coordinates to each article

### 4. Damage Classification (`damage_classifier.py`)
Created a keyword-based damage severity system:

#### Damage Levels & Keywords

**🔴 SEVERE (Ağır Hasar)**
- Keywords: ağır hasar, tamamen yıkıldı, yıkım, yerle bir, çöktü, enkaz, acil yıkılacak
- Score Weight: 10 points per mention
- Examples: "Building completely collapsed", "Heavy damage assessment"

**🟠 MODERATE (Orta Hasar)**
- Keywords: orta hasar, hasar gördü, kısmen hasar, çatlak, zarar gördü
- Score Weight: 5 points per mention
- Examples: "Building partially damaged", "Cracks appeared"

**🟡 LIGHT (Hafif Hasar)**
- Keywords: hafif hasar, az hasar, küçük hasar, ufak hasar
- Score Weight: 2 points per mention
- Examples: "Minor damage", "Light structural issues"

**⚫ EMERGENCY (Acil Durum)**
- Keywords: arama kurtarma, can kaybı, yaralı, çadır kent, tahliye
- Score Weight: 7 points per mention
- Examples: "Search and rescue operations", "Emergency evacuation"

#### Damage Scoring System
- **Damage Score:** 0-100 (calculated from keyword frequency × weights)
- **Primary Level:** Determined by highest severity keywords found
- Scores capped at 100 for normalization

---

## 📈 Results

### Damage Level Distribution

| Level | Count | Percentage |
|-------|-------|------------|
| None (No damage mentioned) | 295 | 40.1% |
| **Severe** | 210 | 28.6% |
| **Emergency** | 154 | 21.0% |
| **Moderate** | 76 | 10.3% |
| Light | 0 | 0% |

### Top Cities by Damage Intensity

| City | Avg Score | Total Score | Articles |
|------|-----------|-------------|----------|
| **Adana** | 26.0 | 1,431 | 55 |
| **Gaziantep** | 19.5 | 801 | 41 |
| **Kahramanmaraş** | 15.7 | 1,478 | 94 |
| **Hatay** | 14.0 | 1,250 | 89 |
| **Malatya** | 13.9 | 361 | 26 |
| Kilis | 10.0 | 130 | 13 |
| Osmaniye | 8.4 | 42 | 5 |

### Most Damaged Articles (Sample)

1. **"Deprem felaketinde 5. gün! İşte son haberler..."**
   - City: Adana | Score: 100/100 | Date: 10.02.2023

2. **"Bakan Kurum: 13 grup, bilim insanlarımızın..."**
   - City: Gaziantep | Score: 100/100 | Date: 11.03.2023

3. **"10 kenti yıkan depremde son durum: Mucize kurtuluşlar..."**
   - City: Adana | Score: 100/100 | Date: 14.02.2023

---

## 🗺️ Visualizations Created

### 1. **Detailed Damage Map** (`damage_map_detailed.html`)
- **Size:** 1.8 MB
- **Features:**
  - 735 interactive markers (one per article)
  - Color-coded by damage severity (red=severe, orange=moderate, etc.)
  - Marker size proportional to damage score
  - Click popup shows: title, location, date, damage metrics, article link
  - Layered view: Toggle between damage levels
  - **Heat map overlay:** Shows damage intensity hotspots

**Layers Available:**
- 🔴 Severe Damage (210 articles)
- 🟠 Moderate Damage (76 articles)
- ⚫ Emergency (154 articles)
- 🟡 Light Damage
- 🔵 No Damage Mentioned (295 articles)
- 🔥 Damage Heatmap

### 2. **City Summary Map** (`damage_map_city_summary.html`)
- **Size:** 20 KB
- **Features:**
  - 7 city-level aggregations
  - Circle size = Total damage mentions
  - Color intensity = Average damage severity
  - Shows: Article count, avg/max/total damage per city

---

## 📁 Output Files

### Data Files
1. **`haberler_with_damage.csv`** (3.8 MB)
   - Original articles + damage classification
   - Columns added:
     - `damage_level`: severe/moderate/light/emergency/none
     - `damage_score`: 0-100
     - `severe_count`, `moderate_count`, `light_count`, `emergency_count`

2. **`koordine_edilmis_haberler.csv`** (3.8 MB)
   - Cleaned articles with coordinates
   - Columns: title, text, date, cities, latitude, longitude, etc.

### Map Files
3. **`damage_map_detailed.html`** (1.8 MB)
   - Interactive map with all 735 articles
   - Multiple layers and heatmap

4. **`damage_map_city_summary.html`** (20 KB)
   - City-level summary visualization

### Code Files
5. **`damage_classifier.py`**
   - Damage classification logic
   - Keyword extraction and scoring

6. **`create_damage_map.py`**
   - Map generation using Folium
   - Visualization configuration

---

## 💡 Key Insights

### Geographic Patterns
1. **Adana** has the highest average damage score (26.0) despite fewer articles than Kahramanmaraş
2. **Kahramanmaraş** (epicenter) has the most articles (94) but moderate average damage score (15.7)
3. **Hatay** shows consistent high damage across 89 articles

### Temporal Analysis
- Most severe damage reports: February 10-14, 2023 (immediate aftermath)
- Coverage continues through 2025 (reconstruction phase)

### Damage Keyword Frequency
- **"enkaz" (debris):** Most common severe damage indicator
- **"hasar tespiti" (damage assessment):** Frequent in moderate damage articles
- **"çadır kent" (tent city):** Strong emergency response indicator

---

## 🔧 Usage Instructions

### Viewing the Maps
1. Navigate to: `/home/fatma/project/urban-risk-lens-main/nlp-disaster/`
2. Open in browser:
   - `damage_map_detailed.html` - For detailed analysis
   - `damage_map_city_summary.html` - For city overview

### Running the Analysis (if you modify data)
```bash
cd /home/fatma/project/urban-risk-lens-main/nlp-disaster/

# Step 1: Classify damage
python3 damage_classifier.py

# Step 2: Generate maps
/home/fatma/project/urban-risk-lens-main/map_venv/bin/python create_damage_map.py
```

---

## ⚠️ Limitations & Considerations

### Data Quality
1. **Media Bias:** News articles may over-report dramatic damage
2. **Geographic Coverage:** Only areas covered by media (urban bias)
3. **Temporal Bias:** More coverage immediately after event
4. **Keyword Limitations:** Simple keyword matching (no deep NLP)

### Methodological Notes
- This is a **proxy measure** of damage, not official assessment
- Complements (doesn't replace) engineering damage surveys
- Best used for: Media coverage analysis, public perception, regional trends

### Not Suitable For
- ❌ Official damage reports
- ❌ Insurance claims
- ❌ Engineering decisions
- ❌ Building-level assessments

### Suitable For
- ✅ Media coverage analysis
- ✅ Public awareness patterns
- ✅ Regional damage trends
- ✅ Temporal narrative analysis
- ✅ Exploratory data analysis

---

## 🔮 Future Improvements

1. **Advanced NLP:**
   - Use Turkish BERT models for sentiment analysis
   - Named Entity Recognition (NER) for precise location extraction
   - Classify damage types (structural, infrastructure, casualties)

2. **Integration:**
   - Combine with official AFAD damage data
   - Cross-reference with satellite imagery
   - Link to building database

3. **Temporal Analysis:**
   - Track damage narrative over time
   - Recovery/reconstruction progress tracking
   - Compare early vs. late reports

4. **Enhanced Visualization:**
   - Time-slider animation
   - District-level granularity
   - 3D damage intensity maps

---

## 📞 Contact & Credits

**Analysis by:** Fatma (Urban Risk Lens Project)
**Date Created:** October 19, 2025
**Tools Used:** Python, Pandas, Folium, Geopy, Nominatim (OSM)

**Data Sources:**
- Turkish newspapers (Sabah, Milliyet, Hürriyet, CNN Türk, Posta)
- OpenStreetMap geocoding
- Manual keyword classification

---

## 📜 License & Usage

This analysis is for **research and educational purposes only**.
Do not use for official damage assessments or critical decision-making.

**Citation:**
```
Urban Risk Lens - NLP Earthquake Damage Analysis (2025)
Source: Turkish newspaper analysis of 2023 Kahramanmaraş earthquake
Created: October 2025
```

---

**Last Updated:** October 19, 2025
