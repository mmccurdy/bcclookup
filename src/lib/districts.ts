/**
 * Query Baltimore County councilmanic district feature layers by point (spatial query).
 * Current: Councilmanic Districts
 * Future (2026): Bill 55-25 - As Amended
 */

const CURRENT_DISTRICTS_URL =
  process.env.BC_CURRENT_DISTRICTS_LAYER_URL || "";
const FUTURE_DISTRICTS_URL =
  process.env.BC_FUTURE_DISTRICTS_LAYER_URL || "";

export type DistrictInfo = {
  districtId: string;
  name?: string;
  representative?: string;
  [key: string]: unknown;
};

/**
 * Run an ArcGIS Feature Layer query: point-in-polygon (intersects).
 * geometry in WGS84 (x=longitude, y=latitude) with geometryType=esriGeometryPoint.
 */
async function queryLayerByPoint(
  layerUrl: string,
  x: number,
  y: number,
  inSR: number = 4326
): Promise<DistrictInfo | null> {
  if (!layerUrl) return null;

  const params = new URLSearchParams({
    f: "json",
    returnGeometry: "false",
    outFields: "*",
    inSR: String(inSR),
    geometryType: "esriGeometryPoint",
    geometry: `${x},${y}`,
    spatialRel: "esriSpatialRelIntersects",
  });

  const url = `${layerUrl.replace(/\/?$/, "")}/query?${params.toString()}`;
  const res = await fetch(url).catch(() => null);
  if (!res?.ok) return null;

  const data = await res.json();
  const features = data.features;
  if (!Array.isArray(features) || features.length === 0) return null;

  const attrs = features[0].attributes || {};
  // Current layer (MapServer/3): COUNCILMANIC_DISTRICTS
  // Future layer (Bill 55-25): DISTRICT, SHORTNAME, LONGNAME
  const districtId =
    attrs.COUNCILMANIC_DISTRICTS ??
    attrs.DISTRICT ??
    attrs.SHORTNAME ??
    attrs.LONGNAME ??
    attrs.DISTRICTID ??
    attrs.DISTRICT_ID ??
    attrs.NAME ??
    attrs.Name ??
    attrs.name ??
    String(attrs.OBJECTID ?? attrs.FID ?? "");

  return {
    districtId: String(districtId),
    name:
      attrs.LONGNAME ??
      attrs.SHORTNAME ??
      attrs.NAME ??
      attrs.Name ??
      attrs.name ??
      attrs.COUNCILMANIC_DISTRICTS,
    representative: attrs.REPNAME1 ?? attrs.RepName ?? attrs.repname1,
    ...attrs,
  };
}

export async function getCurrentDistrict(
  x: number,
  y: number
): Promise<DistrictInfo | null> {
  return queryLayerByPoint(CURRENT_DISTRICTS_URL, x, y);
}

export async function getFutureDistrict(
  x: number,
  y: number
): Promise<DistrictInfo | null> {
  return queryLayerByPoint(FUTURE_DISTRICTS_URL, x, y);
}
