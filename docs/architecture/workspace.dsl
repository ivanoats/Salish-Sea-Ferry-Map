workspace "Salish Sea Ferry Map" "C4 model for the static-first ferry route map." {
    !identifiers hierarchical

    model {
        // Relationships are declared once, at the most specific level that is
        // true, and Structurizr implies the container- and system-level edges
        // from them. Declaring them per level by hand is what let the container
        // and component views disagree about who calls OpenStreetMap.
        !impliedRelationships true

        user = person "Map user" "Browses and filters ferry routes."
        maintainer = person "Maintainer" "Curates operators, terminals, routes, and geometry inputs."

        osm = softwareSystem "OpenStreetMap" "Raster tiles for the basemap." "External"
        wsdot = softwareSystem "WSDOT Vessel Locations API" "Optional live vessel positions." "External"

        ferryMap = softwareSystem "Salish Sea Ferry Map" "Interactive route map spanning multiple ferry operators." {

            // Server side. The vessel route handler lives here rather than as
            // its own container: it runs inside the same Next.js application
            // and is not a separate runtime boundary. Dataset, domain, and
            // GeoJSON derivation are the shared modules the app bundles, and
            // they execute both when prerendering and in the browser.
            webApp = container "Next.js web app" "Serves the site, exposes the vessel proxy, and bundles the curated dataset and domain logic." "Next.js App Router, React, TypeScript" {
                pages = component "App Router pages" "Route entries and layout for the map and About pages." "src/app/"
                proxyRoute = component "Vessel proxy route" "Server-side WSDOT call that keeps the API key off the client." "src/app/api/vessels/route.ts"
                geojson = component "GeoJSON derivation" "Builds route lines and terminal points, including shared-leg offsets." "src/domain/geojson.ts"
                domain = component "Domain model" "Operator, Terminal, FerryRoute, vessel parsing, and pure helpers." "src/domain/"
                dataset = component "Static ferry dataset" "Curated operators, terminals, routes, and generated route-leg geometry." "src/data/"
            }

            // Client side. A browser application is a container in its own
            // right; these are the components that run there.
            browserMap = container "Browser map UI" "Renders routes, terminals, filters, and optional vessels over the basemap." "MapLibre GL JS, React" {
                shell = component "App shell" "Owns operator filter state and wires the panel to the map." "src/components/layout/app-shell.tsx"
                filter = component "Operator filter" "Ark UI checkboxes for per-operator visibility." "src/components/panels/operator-filter.tsx"
                ferryMapUi = component "Ferry map" "MapLibre GL map, layers, and interactions." "src/components/map/ferry-map.tsx"
                vesselHook = component "Vessel positions hook" "Polls the proxy for live WSF vessels." "src/components/map/use-vessel-positions.ts"
            }
        }

        user -> ferryMap.webApp.pages "Requests pages"
        user -> ferryMap.browserMap.shell "Views and filters ferry routes"
        maintainer -> ferryMap.webApp.dataset "Curates operators, terminals, routes, and geometry"

        ferryMap.webApp.pages -> ferryMap.browserMap.shell "Delivers to the browser"
        ferryMap.webApp.geojson -> ferryMap.webApp.domain "Core types"
        ferryMap.webApp.geojson -> ferryMap.webApp.dataset "Leg geometry"
        ferryMap.webApp.proxyRoute -> ferryMap.webApp.domain "Parses payloads"
        ferryMap.webApp.proxyRoute -> wsdot "Vessel locations"

        ferryMap.browserMap.shell -> ferryMap.browserMap.filter "Filter state"
        ferryMap.browserMap.shell -> ferryMap.browserMap.ferryMapUi "Visible routes"
        ferryMap.browserMap.shell -> ferryMap.browserMap.vesselHook "Live vessels"
        ferryMap.browserMap.shell -> ferryMap.webApp.dataset "Operators, routes"
        ferryMap.browserMap.ferryMapUi -> ferryMap.webApp.geojson "Feature collections"
        ferryMap.browserMap.ferryMapUi -> ferryMap.webApp.dataset "Routes, terminals"
        ferryMap.browserMap.ferryMapUi -> osm "Basemap tiles"
        ferryMap.browserMap.vesselHook -> ferryMap.webApp.proxyRoute "GET /api/vessels"
    }

    views {
        systemContext ferryMap "system-context" "System context" {
            include *
            autoLayout lr
        }

        container ferryMap "container-view" "Container view" {
            include *
            autoLayout lr
        }

        component ferryMap.webApp "component-view-web-app" "Component view — Next.js web app" {
            include *
            autoLayout lr
        }

        component ferryMap.browserMap "component-view-browser-map" "Component view — browser map UI" {
            include *
            autoLayout lr
        }
    }
}
