import type { Metadata } from "next";
import { SchematicShell } from "@/components/schematic/schematic-shell";

export const metadata: Metadata = {
  title: "Route diagram | Salish Sea Ferry Map",
  description:
    "Every Salish Sea ferry route as an octolinear transit-style diagram: what connects to what, on whose boats, and where to change.",
};

export default function SchematicPage() {
  return <SchematicShell />;
}
