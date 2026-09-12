import { describe, expect, it } from "vitest";
import { parseVesselLocations, type RawWsdotVesselLocation } from "@/domain/vessel";

describe("parseVesselLocations", () => {
  it("maps a well-formed WSDOT entry", () => {
    const raw: RawWsdotVesselLocation[] = [
      {
        VesselID: 1,
        VesselName: "Cathlamet",
        Latitude: 47.62,
        Longitude: -122.51,
        Speed: 15.2,
        Heading: 90,
        InService: true,
        AtDock: false,
        DepartingTerminalName: "Bainbridge Island",
        ArrivingTerminalName: "Seattle",
      },
    ];

    const vessels = parseVesselLocations(raw);
    expect(vessels).toHaveLength(1);
    expect(vessels[0]).toEqual({
      vesselId: 1,
      name: "Cathlamet",
      coordinates: [-122.51, 47.62],
      speed: 15.2,
      heading: 90,
      inService: true,
      atDock: false,
      departingTerminal: "Bainbridge Island",
      arrivingTerminal: "Seattle",
    });
  });

  it("drops entries missing an id, name, or coordinate", () => {
    const raw: RawWsdotVesselLocation[] = [
      { VesselName: "No id", Latitude: 47, Longitude: -122 },
      { VesselID: 2, Latitude: 47, Longitude: -122 },
      { VesselID: 3, VesselName: "No coords" },
      { VesselID: 4, VesselName: "Fine", Latitude: 47, Longitude: -122 },
    ];

    const vessels = parseVesselLocations(raw);
    expect(vessels.map((v) => v.vesselId)).toEqual([4]);
  });

  it("defaults missing optional fields", () => {
    const raw: RawWsdotVesselLocation[] = [
      { VesselID: 5, VesselName: "Minimal", Latitude: 47, Longitude: -122 },
    ];
    const [vessel] = parseVesselLocations(raw);
    expect(vessel).toMatchObject({
      speed: 0,
      heading: 0,
      inService: true,
      atDock: false,
      departingTerminal: null,
      arrivingTerminal: null,
    });
  });
});
