"use client";

import { useState } from "react";
import { Checkbox } from "@ark-ui/react/checkbox";
import { BASEMAPS, type BasemapId } from "@/components/map/basemaps";
import { FerryMap } from "@/components/map/ferry-map";
import { useVesselPositions } from "@/components/map/use-vessel-positions";
import { OperatorSection, RouteCount, SidebarFooter, SidebarHeader, ViewSwitch, useRouteFilter } from "@/components/layout/sidebar";

function LiveLayers({ showLiveVessels, vesselsUnavailable, onToggle }: {
  showLiveVessels: boolean;
  vesselsUnavailable: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <section className="filter-section live-section" aria-labelledby="live-heading">
      <p className="eyebrow" id="live-heading">Live layers</p>
      <Checkbox.Root className="toggle-row" checked={showLiveVessels}
        onCheckedChange={(details) => onToggle(details.checked === true)}>
        <Checkbox.HiddenInput />
        <Checkbox.Label>WSF vessel positions <span className="beta-pill">Beta</span></Checkbox.Label>
        <Checkbox.Control className="switch"><span className="switch-thumb" /></Checkbox.Control>
      </Checkbox.Root>
      {showLiveVessels && vesselsUnavailable ? <p className="helper-text">Live positions need a free WSDOT API key — see README.md.</p> : null}
    </section>
  );
}

function SidebarIntro({ visibleRouteCount }: { visibleRouteCount: number }) {
  return (
    <div className="sidebar-intro">
      <p className="eyebrow">Explore the coast</p>
      <h1>Find your way<br />across the water.</h1>
      <p className="intro-copy">Ferry routes connecting the communities of the Salish Sea.</p>
      <RouteCount count={visibleRouteCount} />
    </div>
  );
}

function BasemapSection({ basemapId, onChange }: { basemapId: BasemapId; onChange: (id: BasemapId) => void }) {
  return (
    <section className="filter-section" aria-labelledby="basemap-label">
      <label id="basemap-label" htmlFor="basemap" className="basemap-label">Basemap</label>
      <select
        id="basemap"
        value={basemapId}
        onChange={(event) => {
          const id = event.target.value;
          if (Object.hasOwn(BASEMAPS, id)) onChange(id as BasemapId);
        }}
        className="basemap-select"
      >
        {Object.entries(BASEMAPS).map(([id, basemap]) => (
          <option key={id} value={id}>{basemap.label}</option>
        ))}
      </select>
    </section>
  );
}

export function AppShell() {
  const filter = useRouteFilter();
  const [basemapId, setBasemapId] = useState<BasemapId>("positron");
  const [showLiveVessels, setShowLiveVessels] = useState(false);
  const { vessels, unavailable: vesselsUnavailable } = useVesselPositions(showLiveVessels);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <SidebarHeader />

        <ViewSwitch current="map" />

        <SidebarIntro visibleRouteCount={filter.visibleRoutes.length} />

        <OperatorSection visibleOperatorIds={filter.visibleOperatorIds} onToggle={filter.toggleOperator} showInactiveRoutes={filter.showInactiveRoutes} onToggleInactive={filter.setShowInactiveRoutes} onShowAll={filter.showAllOperators} />

        <LiveLayers showLiveVessels={showLiveVessels} vesselsUnavailable={vesselsUnavailable} onToggle={setShowLiveVessels} />

        <BasemapSection basemapId={basemapId} onChange={setBasemapId} />

        <SidebarFooter>Approximate locations for reference only.</SidebarFooter>
      </aside>

      <main className="map-panel">
        <FerryMap basemapId={basemapId} visibleOperatorIds={filter.visibleOperatorIds} showInactiveRoutes={filter.showInactiveRoutes} vessels={vessels} />
        <div className="map-caption" aria-hidden="true"><span className="map-caption-dot" /> Salish Sea region</div>
      </main>
    </div>
  );
}
