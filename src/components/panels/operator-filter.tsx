"use client";

import { Checkbox } from "@ark-ui/react/checkbox";
import type { OperatorId } from "@/domain/ferry";
import { OPERATORS } from "@/data/operators";

interface OperatorFilterProps {
  readonly visibleOperatorIds: ReadonlySet<OperatorId>;
  readonly onToggle: (operatorId: OperatorId, checked: boolean) => void;
  readonly showInactiveRoutes: boolean;
  readonly onToggleInactive: (checked: boolean) => void;
}

export function OperatorFilter({ visibleOperatorIds, onToggle, showInactiveRoutes, onToggleInactive }: OperatorFilterProps) {
  return (
    <div className="operator-list">
      {OPERATORS.map((operator) => (
        <Checkbox.Root key={operator.id} className="operator-row" checked={visibleOperatorIds.has(operator.id)}
          onCheckedChange={(details) => onToggle(operator.id, details.checked === true)}>
          <Checkbox.HiddenInput />
          <Checkbox.Control className="custom-checkbox"><span aria-hidden="true">✓</span></Checkbox.Control>
          <span className="operator-swatch" style={{ backgroundColor: operator.color }} aria-hidden="true" />
          <Checkbox.Label>{operator.shortName}</Checkbox.Label>
        </Checkbox.Root>
      ))}
      <div className="filter-divider" />
      <Checkbox.Root className="operator-row muted-row" checked={showInactiveRoutes}
        onCheckedChange={(details) => onToggleInactive(details.checked === true)}>
        <Checkbox.HiddenInput />
        <Checkbox.Control className="custom-checkbox"><span aria-hidden="true">✓</span></Checkbox.Control>
        <Checkbox.Label>Show suspended routes</Checkbox.Label>
      </Checkbox.Root>
    </div>
  );
}
