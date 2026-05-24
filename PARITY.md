# @scoova/routing — Cross-platform Parity

Five standalone SDKs, one API surface. All target the Valhalla-compatible
endpoints at `routing.scoo-va.info`. Mirrors the routing client embedded inside
`@scoova/navigation` and the mobile nav SDKs, but with no dependencies on
voice/audio engines so apps that just need a route stay lean.

| Platform     | Package / Path                                                | Tests   |
|--------------|---------------------------------------------------------------|---------|
| Web (TS)     | `@scoova/routing` — `/scoova-routing-web`                     | 8 ✅    |
| React Native | `@scoova/routing-react-native` — `/scoova-routing-react-native` | 6 ✅  |
| Flutter      | `scoova_routing` — `/scoova_routing_flutter`                  | 6 ✅    |
| iOS Swift    | `ScoovaRoutingKit` — `/ScoovaRoutingKit`                      | 4 ✅    |
| Android JVM  | `info.scoo-va:scoova-routing` — `/scoova-routing-android`     | 6 ✅    |

## Common surface

```
RoutingClient(baseUrl?, defaultCosting?)
  route(locations, options?)         → RouteResult { trip: { legs, summary, … } }
  optimizedRoute(locations, options?)→ RouteResult
  isochrone(location, options)       → JSON
  matrix(sources, targets, costing?) → JSON
  height(shape, range?)              → JSON
  mapMatch(shape, costing?)          → RouteResult
  locate(locations, costing?)        → JSON
  status()                           → JSON

decodePolyline(encoded, precision=6) → LatLng[]
```

Costing types: `auto`, `bicycle`, `scooter` (default), `pedestrian`, `truck`,
`motorcycle`, `motor_scooter`. Default language `en`, units `kilometers`.
