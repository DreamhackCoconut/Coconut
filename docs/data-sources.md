# Coconut data sources

All provider reads follow **live → fresh cache → stale cache → deterministic demo fallback**. Appwrite TablesDB stores persistent cache rows when connected. In zero-credential local mode, the UI labels the result as demo and uses deterministic seeded data.

| Source | Purpose and data used | Cache / fallback | Demo status |
| --- | --- | --- | --- |
| OpenRouteService | Road distance/time matrices and route geometry for seller pickups. | Persistent external cache; deterministic route geometry if unavailable. | Demo fallback is verified; live when a key is supplied. |
| Open-Meteo Marine | Wave, wind, swell, and marine conditions. | Short-lived cache, stale read, then seeded sea state. | Demo fallback is always available. |
| Open-Meteo Forecast | Normal weather context for operations. | Short-lived cache, stale read, then seeded forecast. | Demo fallback is always available. |
| EasyPost | Final-mile rate enrichment for destination-aware quotes. | Shipping-rate cache, stale read, then pooled demo rate. | Optional; demo rate is default. |
| Frankfurter | Currency conversion context. | External cache, stale read, then seeded conversion. | Optional; demo conversion is default. |
| UN Comtrade | Public trade-category demand signal. | External cache, stale read, then seeded market signal. | Optional; seeded signals are default. |
| World Bank | Public macro/digital/purchasing-power indicators. | External cache, stale read, then seeded indicator. | Optional; seeded indicators are default. |
| NGA World Port Index | Port names, locations, and bootstrap metadata. | External cache, then seeded ports. | Seeded ports are used by default. |
| OpenStreetMap | MapLibre basemap tiles and attribution. | Browser tile cache; route still renders from returned GeoJSON. | Used by the map when network is available. |

Google OR-Tools is an optimization library, not a data provider. It receives validated inputs from Coconut and returns a constrained route.
