import { NextResponse } from "next/server";
import { parseVesselLocations, type RawWsdotVesselLocation } from "@/domain/vessel";

/**
 * Proxies the WSDOT Vessel Locations API so the access code never reaches
 * the browser, and so the client gets our own simplified `VesselPosition`
 * shape rather than WSDOT's field names.
 *
 * Requires a free WSDOT Traveler API access code — see README.md — set as
 * `WSF_API_KEY` in `.env.local`. Every other operator in this dataset (BC
 * Ferries, Black Ball, the county ferries) has no equivalent public feed,
 * so this route only ever covers WSF vessels.
 */
export async function GET() {
  const apiKey = process.env.WSF_API_KEY;
  if (apiKey === undefined || apiKey === "") {
    return NextResponse.json(
      { error: "WSF_API_KEY is not configured; live vessel positions are unavailable.", vessels: [] },
      { status: 503 }
    );
  }

  const url = `https://www.wsdot.wa.gov/Ferries/API/Vessels/rest/vessellocations?apiaccesscode=${apiKey}`;

  let response: Response;
  try {
    response = await fetch(url, { next: { revalidate: 10 } });
  } catch {
    return NextResponse.json({ error: "Could not reach the WSDOT vessel API.", vessels: [] }, { status: 502 });
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: `WSDOT vessel API returned HTTP ${response.status}.`, vessels: [] },
      { status: 502 }
    );
  }

  const raw = (await response.json()) as RawWsdotVesselLocation[];
  return NextResponse.json({ vessels: parseVesselLocations(raw) });
}
