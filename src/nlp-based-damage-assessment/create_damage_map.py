"""
Interactive Damage Map Visualization
Creates a map showing damage levels from newspaper analysis
"""

import pandas as pd
import folium
from folium.plugins import HeatMap, MarkerCluster
from datetime import datetime

def get_color_by_damage(damage_level, damage_score):
    """
    Get marker color based on damage level
    """
    if damage_level == 'severe' or damage_score >= 40:
        return 'red'
    elif damage_level == 'moderate' or damage_score >= 20:
        return 'orange'
    elif damage_level == 'emergency':
        return 'darkred'
    elif damage_level == 'light':
        return 'yellow'
    else:
        return 'blue'

def create_damage_map(df, output_file='damage_map.html'):
    """
    Create interactive folium map with damage visualization
    """
    print(f"🗺️ Creating damage map with {len(df)} articles...")

    # Filter out records without coordinates
    df_mapped = df.dropna(subset=['latitude', 'longitude'])
    print(f"   - {len(df_mapped)} articles have coordinates")

    # Center map on Turkey's earthquake region (approx Kahramanmaraş)
    center_lat = 37.5
    center_lon = 36.9

    # Create base map
    m = folium.Map(
        location=[center_lat, center_lon],
        zoom_start=7,
        tiles='OpenStreetMap',
        control_scale=True
    )

    # Add different tile layers
    folium.TileLayer('cartodbdark_matter', name='Dark Mode').add_to(m)
    folium.TileLayer('cartodb positron', name='Light Mode').add_to(m)

    # Create feature groups for different damage levels
    severe_group = folium.FeatureGroup(name='🔴 Severe Damage (Ağır Hasar)')
    moderate_group = folium.FeatureGroup(name='🟠 Moderate Damage (Orta Hasar)')
    emergency_group = folium.FeatureGroup(name='⚫ Emergency (Acil Durum)')
    light_group = folium.FeatureGroup(name='🟡 Light Damage (Hafif Hasar)')
    none_group = folium.FeatureGroup(name='🔵 No Damage Mentioned')

    # Add markers for each article
    for idx, row in df_mapped.iterrows():
        lat = row['latitude']
        lon = row['longitude']
        damage_level = row.get('damage_level', 'none')
        damage_score = row.get('damage_score', 0)

        # Create popup HTML
        popup_html = f"""
        <div style="width: 300px; font-family: Arial;">
            <h4 style="color: #2c3e50; margin: 0 0 10px 0;">{row['title'][:80]}...</h4>
            <hr style="margin: 5px 0;">
            <p style="margin: 5px 0;"><b>📍 Location:</b> {row.get('main_city', 'Unknown')}</p>
            <p style="margin: 5px 0;"><b>📅 Date:</b> {row.get('date', 'Unknown')}</p>
            <p style="margin: 5px 0;"><b>💥 Damage Level:</b> <span style="color: {get_color_by_damage(damage_level, damage_score)}; font-weight: bold;">{damage_level.upper()}</span></p>
            <p style="margin: 5px 0;"><b>📊 Damage Score:</b> {damage_score}/100</p>
            <p style="margin: 5px 0;"><b>🔍 Keywords:</b></p>
            <ul style="margin: 5px 0; padding-left: 20px; font-size: 11px;">
                <li>Severe mentions: {row.get('severe_count', 0)}</li>
                <li>Moderate mentions: {row.get('moderate_count', 0)}</li>
                <li>Emergency mentions: {row.get('emergency_count', 0)}</li>
            </ul>
            <p style="margin: 5px 0; font-size: 11px;"><b>🔗 Keyword:</b> {row.get('keyword', 'N/A')}</p>
            <a href="{row.get('url', '#')}" target="_blank" style="color: #3498db;">Read Article</a>
        </div>
        """

        # Create marker
        marker = folium.CircleMarker(
            location=[lat, lon],
            radius=max(5, damage_score / 10),  # Size based on damage score
            popup=folium.Popup(popup_html, max_width=320),
            tooltip=f"{row['title'][:50]}... | {damage_level.upper()} | Score: {damage_score}",
            color=get_color_by_damage(damage_level, damage_score),
            fill=True,
            fillColor=get_color_by_damage(damage_level, damage_score),
            fillOpacity=0.6,
            weight=2
        )

        # Add to appropriate group
        if damage_level == 'severe':
            marker.add_to(severe_group)
        elif damage_level == 'moderate':
            marker.add_to(moderate_group)
        elif damage_level == 'emergency':
            marker.add_to(emergency_group)
        elif damage_level == 'light':
            marker.add_to(light_group)
        else:
            marker.add_to(none_group)

    # Add all groups to map
    severe_group.add_to(m)
    moderate_group.add_to(m)
    emergency_group.add_to(m)
    light_group.add_to(m)
    none_group.add_to(m)

    # Create heatmap layer for damage intensity
    heat_data = []
    for idx, row in df_mapped[df_mapped['damage_score'] > 0].iterrows():
        heat_data.append([
            row['latitude'],
            row['longitude'],
            row['damage_score'] / 100  # Normalize to 0-1
        ])

    if heat_data:
        HeatMap(
            heat_data,
            name='🔥 Damage Heatmap',
            min_opacity=0.3,
            max_opacity=0.8,
            radius=25,
            blur=20,
            gradient={
                0.0: 'blue',
                0.3: 'yellow',
                0.6: 'orange',
                1.0: 'red'
            }
        ).add_to(m)

    # Add layer control
    folium.LayerControl(collapsed=False).add_to(m)

    # Add title
    title_html = f'''
    <div style="position: fixed;
                top: 10px;
                left: 50px;
                width: 500px;
                height: auto;
                background-color: white;
                border: 2px solid #2c3e50;
                border-radius: 5px;
                z-index: 9999;
                font-size: 14px;
                padding: 10px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h3 style="margin: 0 0 10px 0; color: #2c3e50;">🗺️ Earthquake Damage Map from News Analysis</h3>
        <p style="margin: 5px 0; font-size: 12px;">
            <b>Total Articles:</b> {len(df_mapped)} |
            <b>With Damage:</b> {len(df_mapped[df_mapped['damage_score'] > 0])} |
            <b>Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')}
        </p>
        <p style="margin: 5px 0; font-size: 11px; color: #7f8c8d;">
            📰 Data source: Turkish newspaper articles about 2023 earthquake
        </p>
    </div>
    '''
    m.get_root().html.add_child(folium.Element(title_html))

    # Save map
    m.save(output_file)
    print(f"✅ Map saved to: {output_file}")

    return m

def create_city_summary_map(df, output_file='city_damage_summary.html'):
    """
    Create a summary map showing damage by city
    """
    print(f"\n🏙️ Creating city summary map...")

    # Group by city
    city_summary = df.groupby('main_city').agg({
        'damage_score': ['mean', 'sum', 'max'],
        'latitude': 'first',
        'longitude': 'first',
        'title': 'count'
    }).reset_index()

    city_summary.columns = ['city', 'avg_damage', 'total_damage', 'max_damage', 'lat', 'lon', 'article_count']
    city_summary = city_summary.dropna(subset=['lat', 'lon'])

    print(f"   - {len(city_summary)} cities with data")

    # Create map
    center_lat = 37.5
    center_lon = 36.9

    m = folium.Map(
        location=[center_lat, center_lon],
        zoom_start=7,
        tiles='OpenStreetMap'
    )

    # Add city markers
    for idx, row in city_summary.iterrows():
        # Size based on total damage
        radius = max(10, min(50, row['total_damage'] / 20))

        # Color based on average damage
        if row['avg_damage'] >= 30:
            color = 'darkred'
        elif row['avg_damage'] >= 20:
            color = 'red'
        elif row['avg_damage'] >= 10:
            color = 'orange'
        else:
            color = 'blue'

        popup_html = f"""
        <div style="width: 250px;">
            <h3 style="margin: 0 0 10px 0; color: #2c3e50;">{row['city']}</h3>
            <hr>
            <p><b>📰 Articles:</b> {int(row['article_count'])}</p>
            <p><b>📊 Average Damage:</b> {row['avg_damage']:.1f}/100</p>
            <p><b>📈 Total Damage:</b> {row['total_damage']:.0f}</p>
            <p><b>🔥 Max Damage:</b> {row['max_damage']:.0f}</p>
        </div>
        """

        folium.CircleMarker(
            location=[row['lat'], row['lon']],
            radius=radius,
            popup=folium.Popup(popup_html, max_width=270),
            tooltip=f"{row['city']}: {int(row['article_count'])} articles, avg damage: {row['avg_damage']:.1f}",
            color=color,
            fill=True,
            fillColor=color,
            fillOpacity=0.7,
            weight=3
        ).add_to(m)

        # Add city label
        folium.Marker(
            location=[row['lat'], row['lon']],
            icon=folium.DivIcon(html=f"""
                <div style="font-size: 12px; font-weight: bold; color: #2c3e50;
                            text-shadow: 1px 1px 2px white, -1px -1px 2px white;">
                    {row['city']}
                </div>
            """)
        ).add_to(m)

    # Add title
    title_html = f'''
    <div style="position: fixed; top: 10px; left: 50px; width: 400px;
                background-color: white; border: 2px solid #2c3e50;
                border-radius: 5px; z-index: 9999; padding: 10px;">
        <h3 style="margin: 0;">🏙️ City Damage Summary</h3>
        <p style="font-size: 12px; margin: 5px 0;">Circle size = Total damage mentions</p>
        <p style="font-size: 12px; margin: 5px 0;">Color = Average damage severity</p>
    </div>
    '''
    m.get_root().html.add_child(folium.Element(title_html))

    m.save(output_file)
    print(f"✅ City summary map saved to: {output_file}")

    return m

if __name__ == "__main__":
    print("="*60)
    print("DAMAGE MAP VISUALIZATION")
    print("="*60)

    # Load enriched data
    df = pd.read_csv('haberler_with_damage.csv')

    # Create detailed damage map
    create_damage_map(df, 'damage_map_detailed.html')

    # Create city summary map
    create_city_summary_map(df, 'damage_map_city_summary.html')

    print("\n" + "="*60)
    print("✅ MAPS CREATED SUCCESSFULLY!")
    print("="*60)
    print("\n📂 Output files:")
    print("   1. damage_map_detailed.html - Detailed map with all articles")
    print("   2. damage_map_city_summary.html - City-level summary map")
    print("\n💡 Open these HTML files in your browser to view the maps")
