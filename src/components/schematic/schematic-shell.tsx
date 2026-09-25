"use client";

import { OperatorSection, RouteCount, SidebarFooter, SidebarHeader, ViewSwitch, useRouteFilter } from "@/components/layout/sidebar";
import { SchematicDiagram } from "@/components/schematic/schematic-diagram";

function SchematicIntro({ visibleRouteCount }: { visibleRouteCount: number }) {
  return (
    <div className="sidebar-intro">
      <p className="eyebrow">Route diagram</p>
      <h1>What connects<br />to what.</h1>
      <p className="intro-copy">
        Every route redrawn at 45° angles, the way a transit map would. Geography gives way so the busy places can breathe.
      </p>
      <RouteCount count={visibleRouteCount} />
    </div>
  );
}

function DiagramKey() {
  return (
    <section className="filter-section" aria-labelledby="key-heading">
      <h2 id="key-heading" className="section-label">Key</h2>
      <ul className="diagram-key">
        <li>
          <svg viewBox="0 0 28 14" aria-hidden="true"><circle cx="14" cy="7" r="5" className="key-interchange" /></svg>
          Interchange: more than one route, or a short trip over land to another dock
        </li>
        <li>
          <svg viewBox="0 0 28 14" aria-hidden="true"><path d="M2 7h24" className="key-land-outer" /><path d="M2 7h24" className="key-land-inner" /></svg>
          Same town or island, different dock
        </li>
        <li>
          <svg viewBox="0 0 28 14" aria-hidden="true"><path d="M2 7h24" className="key-suspended" /></svg>
          Suspended route
        </li>
        <li>
          <svg viewBox="0 0 28 14" aria-hidden="true"><path d="M2 7h24" className="key-border" /></svg>
          Canada–US border
        </li>
      </ul>
    </section>
  );
}

export function SchematicShell() {
  const filter = useRouteFilter();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <SidebarHeader />

        <ViewSwitch current="diagram" />

        <SchematicIntro visibleRouteCount={filter.visibleRoutes.length} />

        <OperatorSection visibleOperatorIds={filter.visibleOperatorIds} onToggle={filter.toggleOperator} showInactiveRoutes={filter.showInactiveRoutes} onToggleInactive={filter.setShowInactiveRoutes} onShowAll={filter.showAllOperators} />

        <DiagramKey />

        <SidebarFooter>Schematic and not to scale.</SidebarFooter>
      </aside>

      <main className="schematic-panel">
        <SchematicDiagram routes={filter.visibleRoutes} />
      </main>
    </div>
  );
}
