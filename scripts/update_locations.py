import json
import time
import requests
import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent.parent
JSON_PATH = BASE_DIR / 'docs' / 'data' / 'shops.json'
PROGRESS_FILE = BASE_DIR / 'docs' / 'data' / 'geocode_progress.json'

# API User-Agent (Important for Geocoding.jp)
HEADERS = {
    'User-Agent': 'Gabai Sakaeru Pay Map Updater (Contact: midnight480)'
}

def load_data():
    if not JSON_PATH.exists():
        print(f"Error: {JSON_PATH} not found.")
        return []
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_data(data):
    # Backup original before overwriting just in case
    backup_path = JSON_PATH.with_suffix('.json.bak')
    if not backup_path.exists():
        import shutil
        shutil.copy2(JSON_PATH, backup_path)
        
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_progress():
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {'processed_indices': []}

def save_progress(progress):
    with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
        json.dump(progress, f)

def geocode(query):
    """Fetch coordinates from geocoding.jp API"""
    url = f"https://www.geocoding.jp/api/?q={requests.utils.quote(query)}"
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        
        # The API returns XML. A simple string parse is used here to avoid extra dependencies like lxml/bs4
        text = response.text
        if "<lat>" in text and "<lng>" in text:
            lat = text.split("<lat>")[1].split("</lat>")[0]
            lng = text.split("<lng>")[1].split("</lng>")[0]
            return float(lat), float(lng)
        elif "<error>" in text:
            error = text.split("<error>")[1].split("</error>")[0]
            print(f"  API Error: {error}")
            return None, None
    except Exception as e:
        print(f"  Request Error: {e}")
        return None, None
    
    return None, None

def main():
    print("Starting Geocoding Process for Gabai Sakaeru Pay Map...")
    print("API Rate Limit: 1 request per 10 seconds.")
    print("You can stop this script at any time (Ctrl+C). It will resume from where it left off.\n")

    shops = load_data()
    if not shops:
        return

    progress = load_progress()
    processed = set(progress.get('processed_indices', []))

    # Identify shops that still need precise coordinates
    # We check if they still have the proxy '130.3' generic mapping from our initial extractor
    # Or if their index isn't in 'processed'
    
    pending_count = len(shops) - len(processed)
    print(f"Total shops: {len(shops)}. Already processed: {len(processed)}. Remaining: {pending_count}.\n")

    updated_count = 0
    try:
        for i, shop in enumerate(shops):
            if i in processed:
                continue

            # Construct query: Saga City + Area Name + Shop Name
            # We prefix "佐賀県佐賀市" to help the API narrow it down. We omit the category.
            # Some areas like "中心市街地" might confuse the API, so we prioritize the shop name itself within Saga.
            query = f"佐賀県佐賀市 {shop['name']}"
            
            print(f"[{i+1}/{len(shops)}] Geocoding: {shop['name']} (Query: {query})")
            
            lat, lng = geocode(query)
            
            if lat and lng:
                # Update shop coordinates
                shop['lat'] = lat
                shop['lng'] = lng
                shop['has_exact_location'] = True
                print(f"  => Success: {lat}, {lng}")
            else:
                # If geocoding fails, we mark it as processed but keep the old fuzzy coordinates
                shop['has_exact_location'] = False
                print(f"  => Failed to find exact location. Keeping approximate area coordinates.")

            processed.add(i)
            updated_count += 1
            
            # ジオコーディング間隔の制限と保存
            # Save every record to prevent data loss safely and update live
            if updated_count > 0:
                save_data(shops)
                progress['processed_indices'] = list(processed)
                save_progress(progress)
                print("  [Data Saved]")

            # STRCIT RATE LIMIT: 10 seconds per API request
            time.sleep(10.5)

    except KeyboardInterrupt:
        print("\nProcess interrupted by user.")
    except Exception as e:
        print(f"\nUnexpected error: {e}")
    finally:
        # Final save on exit
        if updated_count > 0:
            save_data(shops)
            progress['processed_indices'] = list(processed)
            save_progress(progress)
            print(f"\nSaved progress. Total updated this session: {updated_count}")
        print("Done.")

if __name__ == "__main__":
    main()
