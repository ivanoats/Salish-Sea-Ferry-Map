"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Checkbox } from "@ark-ui/react/checkbox";
import type { OperatorId } from "@/domain/ferry";
import { OPERATORS } from "@/data/operators";
import { ROUTES } from "@/data/routes";
import { BASEMAPS, type BasemapId } from "@/components/map/basemaps";
import { FerryMap } from "@/components/map/ferry-map";
import { OperatorFilter } from "@/components/panels/operator-filter";
import { useVesselPositions } from "@/components/map/use-vessel-positions";

const ALL_OPERATOR_IDS = new Set<OperatorId>(OPERATORS.map((operator) => operator.id));

function FerryMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" role="img">
        <path d="M4 20.5h24l-3 5H8l-4-5Z" />
        <path d="M9 18V10h11l4 8H9Z" />
        <path d="M12 13h4v3h-4zm6 0h2.8l1.4 3H18z" className="brand-mark-window" />
        <path d="M6 28c3-1.2 5.2-1.2 8 0s5 1.2 8 0 5-1.2 7 0" className="brand-mark-wave" />
      </svg>
    </span>
  );
}

function SidebarHeader() {
  return (
    <header className="sidebar-header">
      <Link href="/" className="brand" aria-label="Salish Sea Ferry Map home">
        <FerryMark />
        <span>
          <span className="brand-name">Salish Sea</span>
          <span className="brand-subtitle">Ferry Map</span>
        </span>
      </Link>
      <Link href="/about" className="about-link" aria-label="About this map">About <span aria-hidden="true">↗</span></Link>
    </header>
  );
}

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
      <div className="route-count" aria-live="polite">
        <span className="route-count-number">{visibleRouteCount}</span>
        <span>routes visible</span>
      </div>
    </div>
  );
}

function OperatorSection({ visibleOperatorIds, onToggle, showInactiveRoutes, onToggleInactive, onShowAll }: {
  visibleOperatorIds: ReadonlySet<OperatorId>;
  onToggle: (operatorId: OperatorId, checked: boolean) => void;
  showInactiveRoutes: boolean;
  onToggleInactive: (checked: boolean) => void;
  onShowAll: () => void;
}) {
  return (
    <section className="filter-section" aria-labelledby="operators-heading">
      <div className="section-heading-row">
        <h2 id="operators-heading">Operators</h2>
        <button type="button" className="text-button" onClick={onShowAll}>Show all</button>
      </div>
      <OperatorFilter
        visibleOperatorIds={visibleOperatorIds}
        onToggle={onToggle}
        showInactiveRoutes={showInactiveRoutes}
        onToggleInactive={onToggleInactive}
      />
    </section>
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

function SidebarFooter() {
  return (
    <footer className="sidebar-footer">
      <p>Approximate locations for reference only.<br /><strong>Not for navigation.</strong></p>
      <span>Updated September 2026</span>
    </footer>
  );
}

export function AppShell() {
  const [visibleOperatorIds, setVisibleOperatorIds] = useState<ReadonlySet<OperatorId>>(ALL_OPERATOR_IDS);
  const [basemapId, setBasemapId] = useState<BasemapId>("positron");
  const [showInactiveRoutes, setShowInactiveRoutes] = useState(false);
  const [showLiveVessels, setShowLiveVessels] = useState(false);
  const { vessels, unavailable: vesselsUnavailable } = useVesselPositions(showLiveVessels);

  const handleToggleOperator = (operatorId: OperatorId, checked: boolean) => {
    setVisibleOperatorIds((current) => {
      const next = new Set(current);
      if (checked) next.add(operatorId);
      else next.delete(operatorId);
      return next;
    });
  };

  const visibleRouteCount = useMemo(
    () => ROUTES.filter((route) => visibleOperatorIds.has(route.operatorId) &&
      (showInactiveRoutes || route.status !== "suspended")).length,
    [visibleOperatorIds, showInactiveRoutes]
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <SidebarHeader />

        <SidebarIntro visibleRouteCount={visibleRouteCount} />

        <OperatorSection visibleOperatorIds={visibleOperatorIds} onToggle={handleToggleOperator} showInactiveRoutes={showInactiveRoutes} onToggleInactive={setShowInactiveRoutes} onShowAll={() => setVisibleOperatorIds(ALL_OPERATOR_IDS)} />

        <LiveLayers showLiveVessels={showLiveVessels} vesselsUnavailable={vesselsUnavailable} onToggle={setShowLiveVessels} />

        <BasemapSection basemapId={basemapId} onChange={setBasemapId} />

        <SidebarFooter />
      </aside>

      <main className="map-panel">
        <FerryMap basemapId={basemapId} visibleOperatorIds={visibleOperatorIds} showInactiveRoutes={showInactiveRoutes} vessels={vessels} />
        <div className="map-caption" aria-hidden="true"><span className="map-caption-dot" /> Salish Sea region</div>
      </main>
    </div>
  );
}
