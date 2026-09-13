workspace "Salish Sea Ferry Map" "C4 model for the static-first ferry route map." {
    !identifiers hierarchical

    model {
        !impliedRelationships false

        user = person "Map user" "Browses and filters ferry routes."
        maintainer = person "Maintainer" "Curates operators, terminals, routes, and geometry inputs."

        osm = softwareSystem "OpenStreetMap" "Raster tiles for the basemap." "External"
        wsdot = softwareSystem "WSDOT Vessel Locations API" "Optional live vessel positions." "External"

        ferryMap = softwareSystem "Salish Sea Ferry Map" "Interactive route map spanning multiple ferry operators." {
            webApp = container "Next.js web app" "Serves the site and bundles the curated dataset and domain logic." "Next.js App Router, React, TypeScript" {
                pages = component "App Router pages" "Route entries and layout for the map and About pages." "src/app/"
                shell = component "App shell" "Owns operator filter state and wires the panel to the map." "src/components/layout/app-shell.tsx"
                filter = component "Operator filter" "Ark UI checkboxes for per-operator visibility." "src/components/panels/operator-filter.tsx"
                ferryMapComponent = component "Ferry map" "MapLibre GL map, layers, and interactions." "src/components/map/ferry-map.tsx"
                geojson = component "GeoJSON derivation" "Builds route lines and terminal points, including shared-leg offsets." "src/domain/geojson.ts"
                dataset = component "Static ferry dataset" "Curated operators, terminals, routes, and generated route-leg geometry." "src/data/"
                domain = component "Domain model" "Operator, Terminal, FerryRoute, vessel parsing, and pure helpers." "src/domain/"
                vesselHook = component "Vessel positions hook" "Polls the proxy for live WSF vessels." "src/components/map/use-vessel-positions.ts"
                proxyRoute = component "Vessel proxy route" "Server-side WSDOT call that keeps the API key off the client." "src/app/api/vessels/route.ts"
            }
            browserMap = container "Browser map UI" "Renders routes, terminals, filters, and optional vessels over the basemap." "MapLibre GL JS"
            vesselProxy = container "Live vessel proxy" "Keeps the WSDOT API key server-side and normalizes live vessel responses." "Next.js route handler"
        }

        user -> ferryMap "Browses routes, terminals, and optional live vessels"
        maintainer -> ferryMap "Updates the static dataset and generated geometry"
        ferryMap -> osm "Uses raster map tiles at runtime"
        ferryMap -> wsdot "Fetches optional live vessel data through a server-side proxy"

        user -> ferryMap.browserMap "Views and filters ferry routes"
        ferryMap.webApp -> ferryMap.browserMap "Delivers to the browser"
        ferryMap.browserMap -> osm "Requests basemap tiles"
        ferryMap.browserMap -> ferryMap.vesselProxy "Requests optional live vessels"
        ferryMap.vesselProxy -> wsdot "Fetches vessel positions"

        user -> ferryMap.webApp.pages "Requests pages"
        ferryMap.webApp.pages -> ferryMap.webApp.shell "Renders"
        ferryMap.webApp.shell -> ferryMap.webApp.filter "Filter state"
        ferryMap.webApp.shell -> ferryMap.webApp.ferryMapComponent "Visible routes"
        ferryMap.webApp.shell -> ferryMap.webApp.vesselHook "Live vessels"
        ferryMap.webApp.shell -> ferryMap.webApp.dataset "Operators, routes"
        ferryMap.webApp.ferryMapComponent -> ferryMap.webApp.geojson "Feature collections"
        ferryMap.webApp.ferryMapComponent -> ferryMap.webApp.dataset "Routes, terminals"
        ferryMap.webApp.geojson -> ferryMap.webApp.domain "Core types"
        ferryMap.webApp.geojson -> ferryMap.webApp.dataset "Leg geometry"
        ferryMap.webApp.vesselHook -> ferryMap.webApp.proxyRoute "GET /api/vessels"
        ferryMap.webApp.proxyRoute -> ferryMap.webApp.domain "Parses payloads"
        ferryMap.webApp.ferryMapComponent -> osm "Basemap tiles"
        ferryMap.webApp.proxyRoute -> wsdot "Vessel locations"
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

        component ferryMap.webApp "component-view" "Component view" {
            include *
            autoLayout lr
        }

    }
}
