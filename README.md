# Baltimore County Councilmanic District Lookup

Residents can enter a Baltimore County address and see their **current** and **future (2026)** councilmanic district. Data is provided by Baltimore County GIS (geocoding and district boundaries).

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS**
- Server-side geocoding and district lookup via Baltimore County’s public GIS services

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure layer URLs (required for district results):

   - Copy `.env.example` to `.env.local`.
   - Get the **Feature Server** base URL for each layer from [Baltimore County Open Data](https://opendata.baltimorecountymd.gov). Step-by-step: see **docs/GETTING_LAYER_URLS.md**.
     - **Current districts:** search for **“Councilmanic Districts”** → open the dataset → use the API/Query URL. The base URL should end at the layer (e.g. `.../FeatureServer/0`), without `/query`.
     - **Future (2026) districts:** search for **“Bill 55-25 - As Amended”** → same process.
   - Set in `.env.local`:
     - `BC_CURRENT_DISTRICTS_LAYER_URL=<current layer URL>`
     - `BC_FUTURE_DISTRICTS_LAYER_URL=<Bill 55-25 As Amended layer URL>`

   **Optional – USPS address autocomplete:** To get address suggestions as you type, sign up at [Smarty](https://www.smarty.com/) (US Autocomplete Pro, free tier available) and set `SMARTY_AUTH_ID` and `SMARTY_AUTH_TOKEN` in `.env.local`. Without these, the address field has no dropdown suggestions but users can still type and submit.

   Geocoding uses Baltimore County’s geocoder by default; you can override it with `BC_GEOCODER_URL` if needed.

3. Run the app:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), enter an address, and click **Find my district**.

## How it works

1. **Address entry:** The address field autocompletes when [Geoapify](https://www.geoapify.com/) (free) or [Smarty US Autocomplete Pro](https://www.smarty.com/docs/cloud/us-autocomplete-pro-api) is configured. Geoapify is tried first to preserve Smarty allocation. Users can also type a full address and submit.
2. **Geocode:** The submitted address is geocoded with the US Census geocoder (USPS/MAF-TIGER) first, then Baltimore County’s [AddressPointGeocoder](https://bcgis.baltimorecountymd.gov/arcgis/rest/services/Geocoders/AddressPointGeocoder/GeocodeServer) if needed. Result is WGS84 coordinates.
3. **Current district:** A spatial query (point-in-polygon) is run against the **Councilmanic Districts** feature layer.
4. **Future district (2026):** A spatial query is run against the **Bill 55-25 - As Amended** feature layer (9 districts).
5. The API returns both districts (and representative info when the layer provides it) and the UI shows them side by side.

## Disclaimer

This tool is unofficial. Data comes from Baltimore County’s public GIS; verify your district with [Baltimore County](https://www.baltimorecountymd.gov) or the Board of Elections when it matters.
