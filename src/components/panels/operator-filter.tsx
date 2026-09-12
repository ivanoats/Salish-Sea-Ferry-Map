"use client";

import { Checkbox } from "@ark-ui/react/checkbox";
import { css } from "styled-system/css";
import type { OperatorId } from "@/domain/ferry";
import { OPERATORS } from "@/data/operators";

interface OperatorFilterProps {
  readonly visibleOperatorIds: ReadonlySet<OperatorId>;
  readonly onToggle: (operatorId: OperatorId, checked: boolean) => void;
  readonly showInactiveRoutes: boolean;
  readonly onToggleInactive: (checked: boolean) => void;
}

const rowStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  cursor: "pointer",
  py: "1",
});

const controlStyle = css({
  width: "4",
  height: "4",
  borderRadius: "sm",
  borderWidth: "1.5px",
  borderColor: "border.default",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  _checked: { bg: "colorPalette.9", borderColor: "colorPalette.9" },
});

const swatchStyle = (color: string) =>
  css({
    width: "2.5",
    height: "2.5",
    borderRadius: "full",
    flexShrink: 0,
    bg: color,
  });

export function OperatorFilter({
  visibleOperatorIds,
  onToggle,
  showInactiveRoutes,
  onToggleInactive,
}: OperatorFilterProps) {
  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "0.5" })}>
      {OPERATORS.map((operator) => (
        <Checkbox.Root
          key={operator.id}
          className={rowStyle}
          checked={visibleOperatorIds.has(operator.id)}
          onCheckedChange={(details) => onToggle(operator.id, details.checked === true)}
        >
          <Checkbox.Control className={controlStyle} />
          <Checkbox.HiddenInput />
          <span className={swatchStyle(operator.color)} aria-hidden />
          <Checkbox.Label className={css({ fontSize: "sm" })}>{operator.shortName}</Checkbox.Label>
        </Checkbox.Root>
      ))}

      <hr className={css({ my: "2", borderColor: "border.default" })} />

      <Checkbox.Root
        className={rowStyle}
        checked={showInactiveRoutes}
        onCheckedChange={(details) => onToggleInactive(details.checked === true)}
      >
        <Checkbox.Control className={controlStyle} />
        <Checkbox.HiddenInput />
        <Checkbox.Label className={css({ fontSize: "sm", color: "fg.muted" })}>
          Show suspended routes
        </Checkbox.Label>
      </Checkbox.Root>
    </div>
  );
}
