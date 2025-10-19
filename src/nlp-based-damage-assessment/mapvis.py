# map_viz.py
import pandas as pd
import folium
from folium.plugins import MarkerCluster

# 1. Veri yükle
df = pd.read_csv("koordine_edilmis_haberler.csv")

# 2. Koordinat bilgisi eksik olanları çıkar
df = df.dropna(subset=["latitude", "longitude"])

# 3. Folium haritasını başlat
start_coords = [37.0, 36.5]  # Türkiye merkezine yakın
m = folium.Map(location=start_coords, zoom_start=6)

# 4. MarkerCluster ile yoğunluğu grupla
marker_cluster = MarkerCluster().add_to(m)

# 5. Her haber için marker ekle
for idx, row in df.iterrows():
    popup_text = f"<b>Şehir:</b> {row.get('main_city', '')}<br><b>Tarih:</b> {row.get('date', '')[:10]}<br><b>Haber:</b> {row.get('text', '')[:200]}..."
    folium.Marker(
        location=[row["latitude"], row["longitude"]],
        popup=folium.Popup(popup_text, max_width=350),
        icon=folium.Icon(color='red', icon='info-sign')
    ).add_to(marker_cluster)

# 6. Kaydet
m.save("haber_haritasi.html")
print("✅ Harita başarıyla oluşturuldu: 'haber_haritasi.html'")
