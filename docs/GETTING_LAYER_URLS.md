# How to Get the Raw Layer URLs from Baltimore County GIS

You need the **Feature Server layer URL** for:

1. **Councilmanic Districts** (current)
2. **Bill 55-25 - As Amended** (2026 districts)

The URL should look like:  
`https://.../FeatureServer/0`  
or  
`https://.../MapServer/0`  

Use that **base** URL (no `?` and no `/query`) in `.env.local` as  
`BC_CURRENT_DISTRICTS_LAYER_URL` and `BC_FUTURE_DISTRICTS_LAYER_URL`.

---

## Method 1: API / Query tab on the dataset page (best)

1. Go to [Baltimore County Open Data](https://opendata.baltimorecountymd.gov).
2. Search for **"Councilmanic Districts"** or **"Bill 55-25 - As Amended"** and open the dataset.
3. On the dataset page, look for:
   - **"API"** tab or link  
   - **"Query"** or **"Access the API"** or **"Developer"**
4. That page usually shows the **REST endpoint** or a query builder. Copy the **base** URL (the part before `?` and before `/query`).  
   Example: if you see  
   `https://services.arcgis.com/xxx/arcgis/rest/services/Councilmanic/FeatureServer/0/query?where=1%3D1`  
   use:  
   `https://services.arcgis.com/xxx/arcgis/rest/services/Councilmanic/FeatureServer/0`

---

## Method 2: Export / Download

1. Open the dataset on [opendata.baltimorecountymd.gov](https://opendata.baltimorecountymd.gov).
2. Look for **"Export"** or **"Download"** (often near the map or in a dropdown).
3. Choose **GeoJSON**, **CSV**, or **"Feature Service"** / **"API"**.
4. **Right‑click** the download/export link and **Copy link address** (or open in a new tab and copy from the address bar).
5. The link often looks like:  
   `.../FeatureServer/0/query?outFields=*&f=geojson`  
   Remove everything from **`?`** (and including **`/query`** if you only want the layer base).  
   So the layer URL is:  
   `.../FeatureServer/0`

---

## Method 3: Browser Network tab (when the map loads)

1. Open the dataset page so the **map** is visible.
2. Open **Developer Tools** (F12 or right‑click → Inspect).
3. Go to the **Network** tab.
4. Refresh the page or pan the map so the layer loads.
5. In the filter box, type **`query`** or **`FeatureServer`** or **`MapServer`**.
6. Click one of the requests that look like a feature/query request.
7. Copy the **Request URL**. Remove the query string (`?...`) and, if present, the **`/query`** path so you’re left with the layer base, e.g.  
   `https://.../FeatureServer/0`

---

## Method 4: Baltimore County REST directory (if the layer is there)

Some layers are also on Baltimore County’s ArcGIS Server:

1. Open:  
   [https://bcgis.baltimorecountymd.gov/arcgis/rest/services](https://bcgis.baltimorecountymd.gov/arcgis/rest/services)
2. Browse folders (e.g. **Planning**, **Elections**, **Boundaries**) for **Councilmanic** or **Bill 55-25**.
3. Open a service → open a **Layer** (e.g. **0**).
4. The browser URL is the layer URL, e.g.  
   `https://bcgis.baltimorecountymd.gov/arcgis/rest/services/.../FeatureServer/0`  
   Use that as-is (no `/query`).

---

## What to put in `.env.local`

```bash
# Layer base URL only (no /query, no ?...)
BC_CURRENT_DISTRICTS_LAYER_URL=https://.../FeatureServer/0
BC_FUTURE_DISTRICTS_LAYER_URL=https://.../FeatureServer/0
```

If you only find a **MapServer** URL (e.g. `.../MapServer/21`), you can try that same base URL in the app; many MapServers support the same `/query` operation. If it doesn’t work, the data may only be exposed as a Feature Server from the Open Data portal (Methods 1–3).
