# RoadSync — Round 3 demo

One simulated forecast engine driving five dashboards. Every number is simulated and uncalibrated;
nothing connects to Mappls.

## Run

```
npm install
npm run dev          # http://localhost:5173
npm run build        # static copy in dist/ — serve it with `npm run preview` (works offline)
npm run experiments  # re-runs the 20-seed experiment → src/engine/results.json
```

## Dashboards (tabs)

1. **Corridor Control Room**: fixed timer vs local adaptive vs RoadSync on the same cars (seed 1000).
2. **Disruption Console**: load the Missing Link (unplanned) or Kolkata Puja (planned) event, drag the split, approve an option.
3. **Fleet Delivery-Risk**: sample orders flip to at risk / will miss from the same event.
4. **Commuter ETA**: phone mock-up, last-trip estimate vs RoadSync forecast, departure advice.
5. **Pilot Impact**: 20-seed results, pilot gates, empty before/after panel for real data.

A loaded event is shared state (`src/engine/store.jsx`), so it shows up on every tab at once.

## Where to change things

| What | File |
|---|---|
| Corridor engine, controllers, scenario demand | `src/engine/corridor.js` |
| Event cards (names, times, volumes) | `src/engine/events.js` |
| Diversion curves and options | `src/engine/closure.js` |
| Delivery orders, restriction calendar | `src/engine/fleet.js` |
| Pilot gates | `src/screens/PilotImpact.jsx` |

After changing `corridor.js`, run `npm run experiments` so the Pilot Impact and Commuter numbers update.
