"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Checkbox } from "@ark-ui/react/checkbox";
import { css } from "styled-system/css";
import type { OperatorId } from "@/domain/ferry";
import { OPERATORS } from "@/data/operators";
import { ROUTES } from "@/data/routes";
import { FerryMap } from "@/components/map/ferry-map";
import { OperatorFilter } from "@/components/panels/operator-filter";
import { useVesselPositions } from "@/components/map/use-vessel-positions";

const ALL_OPERATOR_IDS = new Set<OperatorId>(OPERATORS.map((o) => o.id));

export function AppShell() {
  const [visibleOperatorIds, setVisibleOperatorIds] = useState<ReadonlySet<OperatorId>>(ALL_OPERATOR_IDS);
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
    () =>
      ROUTES.filter(
        (route) =>
          visibleOperatorIds.has(route.operatorId) && (showInactiveRoutes || route.status !== "suspended")
      ).length,
    [visibleOperatorIds, showInactiveRoutes]
  );

  return (
    <div className={css({ display: "flex", flexDirection: { base: "column", md: "row" }, height: "100dvh", width: "100%" })}>
      <aside
        className={css({
          width: { base: "full", md: "80" },
          flexShrink: 0,
          borderBottomWidth: { base: "1px", md: "0" },
          borderRightWidth: { base: "0", md: "1px" },
          borderColor: "border.default",
          bg: "bg.default",
          p: "4",
          display: "flex",
          flexDirection: "column",
          gap: "4",
          overflowY: "auto",
          maxHeight: { base: "40dvh", md: "100dvh" },
        })}
      >
        <div>
          <h1 className={css({ fontSize: "lg", fontWeight: "bold", lineHeight: "tight" })}>
            Salish Sea Ferry Map
          </h1>
          <p className={css({ fontSize: "xs", color: "fg.muted", mt: "1" })}>
            {visibleRouteCount} route{visibleRouteCount === 1 ? "" : "s"} shown · Puget Sound, the
            Strait of Georgia &amp; the Strait of Juan de Fuca
          </p>
          <Link
            href="/about"
            className={css({
              display: "inline-flex",
              mt: "2",
              fontSize: "sm",
              fontWeight: "medium",
              color: "colorPalette.9",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
            })}
          >
            About this map
          </Link>
        </div>

        <div>
          <h2 className={css({ fontSize: "xs", fontWeight: "semibold", color: "fg.muted", textTransform: "uppercase", letterSpacing: "wide", mb: "2" })}>
            Operators
          </h2>
          <OperatorFilter
            visibleOperatorIds={visibleOperatorIds}
            onToggle={handleToggleOperator}
            showInactiveRoutes={showInactiveRoutes}
            onToggleInactive={setShowInactiveRoutes}
          />
        </div>

        <div>
          <h2 className={css({ fontSize: "xs", fontWeight: "semibold", color: "fg.muted", textTransform: "uppercase", letterSpacing: "wide", mb: "2" })}>
            Live
          </h2>
          <Checkbox.Root
            className={css({ display: "flex", alignItems: "center", gap: "2", cursor: "pointer" })}
            checked={showLiveVessels}
            onCheckedChange={(details) => setShowLiveVessels(details.checked === true)}
          >
            <Checkbox.Control
              className={css({
                width: "4",
                height: "4",
                borderRadius: "sm",
                borderWidth: "1.5px",
                borderColor: "border.default",
                flexShrink: 0,
                _checked: { bg: "colorPalette.9", borderColor: "colorPalette.9" },
              })}
            />
            <Checkbox.HiddenInput />
            <Checkbox.Label className={css({ fontSize: "sm" })}>WSF vessel positions (beta)</Checkbox.Label>
          </Checkbox.Root>
          {showLiveVessels && vesselsUnavailable ? (
            <p className={css({ fontSize: "xs", color: "fg.subtle", mt: "1" })}>
              Live positions need a free WSDOT API key — see README.md.
            </p>
          ) : null}
        </div>

        <p className={css({ fontSize: "xs", color: "fg.subtle" })}>
          Route geometry prefers OSM ferry lines where they are vendored, then the navigable-water
          mesh, then a straight-line fallback.
        </p>

        <p className={css({ fontSize: "xs", color: "fg.subtle", mt: "auto", pt: "4" })}>
          Route lines and terminal locations are approximate and for reference only —{" "}
          <strong>not for navigation.</strong> Data compiled from operator websites, September 2026.
        </p>
      </aside>

      <main className={css({ flex: "1", position: "relative", minHeight: { base: "60dvh", md: "auto" } })}>
        <FerryMap
          visibleOperatorIds={visibleOperatorIds}
          showInactiveRoutes={showInactiveRoutes}
          vessels={vessels}
        />
      </main>
    </div>
  );
}
