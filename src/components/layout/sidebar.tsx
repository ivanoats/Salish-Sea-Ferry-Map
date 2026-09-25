"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { OperatorId } from "@/domain/ferry";
import { OPERATORS } from "@/data/operators";
import { ROUTES } from "@/data/routes";
import { OperatorFilter } from "@/components/panels/operator-filter";

/** Sidebar pieces shared by the geographic map and the route diagram. */

export const ALL_OPERATOR_IDS: ReadonlySet<OperatorId> = new Set(OPERATORS.map((operator) => operator.id));

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

export function SidebarHeader() {
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

export type SidebarView = "map" | "diagram";

export function ViewSwitch({ current }: { current: SidebarView }) {
  const views = [
    { id: "map", href: "/", label: "Map" },
    { id: "diagram", href: "/schematic", label: "Route diagram" },
  ] as const;
  return (
    <nav className="view-switch" aria-label="View">
      {views.map((view) => (
        <Link key={view.id} href={view.href} className="view-switch-link"
          aria-current={view.id === current ? "page" : undefined}>
          {view.label}
        </Link>
      ))}
    </nav>
  );
}

export function RouteCount({ count }: { count: number }) {
  return (
    <div className="route-count" aria-live="polite">
      <span className="route-count-number">{count}</span>
      <span>routes visible</span>
    </div>
  );
}

export function OperatorSection({ visibleOperatorIds, onToggle, showInactiveRoutes, onToggleInactive, onShowAll }: {
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

export function SidebarFooter({ children }: { children: React.ReactNode }) {
  return (
    <footer className="sidebar-footer">
      <p>{children}<br /><strong>Not for navigation.</strong></p>
      <span>Updated September 2026</span>
    </footer>
  );
}

/** Operator and suspended-route filter state, and the routes it leaves visible. */
export function useRouteFilter() {
  const [visibleOperatorIds, setVisibleOperatorIds] = useState<ReadonlySet<OperatorId>>(ALL_OPERATOR_IDS);
  const [showInactiveRoutes, setShowInactiveRoutes] = useState(false);

  const toggleOperator = (operatorId: OperatorId, checked: boolean) => {
    setVisibleOperatorIds((current) => {
      const next = new Set(current);
      if (checked) next.add(operatorId);
      else next.delete(operatorId);
      return next;
    });
  };

  const visibleRoutes = useMemo(
    () => ROUTES.filter((route) => visibleOperatorIds.has(route.operatorId) &&
      (showInactiveRoutes || route.status !== "suspended")),
    [visibleOperatorIds, showInactiveRoutes]
  );

  return {
    visibleOperatorIds,
    toggleOperator,
    showAllOperators: () => setVisibleOperatorIds(ALL_OPERATOR_IDS),
    showInactiveRoutes,
    setShowInactiveRoutes,
    visibleRoutes,
  };
}
