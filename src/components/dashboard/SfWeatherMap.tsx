// src/components/dashboard/SfWeatherMap.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ThermometerSun } from "lucide-react";
import { getCorrelationData } from "@/data/RainfallData";
import type { CorrelationPoint } from "@/types/rainfall";

type ClimateStats = {
  rainfall: number;
  temperature: number;
  humidity: number;
};

type HoverInfo = {
  name: string;
  rainfall: number;
};

const SF_CENTER: [number, number] = [-122.4376, 37.7577];
const SF_ZOOM = 11.5;

const SF_NEIGHBORHOODS_URL =
  "https://data.sfgov.org/resource/ajp5-b2md.geojson?$limit=1000";

/**
 * Neighborhood → rainfall factor (west = wetter, southeast = drier)
 * key = `nhood` field in DataSF GeoJSON
 */
const RAIN_FACTOR_BY_NHOOD: Record<string, number> = {
  "Outer Richmond": 1.25,
  "Inner Richmond": 1.2,
  Seacliff: 1.25,
  Presidio: 1.25,
  "Outer Sunset": 1.2,
  "Inner Sunset": 1.15,
  Parkside: 1.15,
  "Golden Gate Park": 1.2,

  "Twin Peaks": 1.05,
  "Noe Valley": 1.0,
  "West of Twin Peaks": 1.05,

  Marina: 1.05,
  "Pacific Heights": 1.0,
  "Western Addition": 1.0,
  "Haight Ashbury": 1.05,

  "Downtown/Civic Center": 0.95,
  "South of Market": 0.9,

  Mission: 0.9,
  "Potrero Hill": 0.9,
  "Bernal Heights": 0.9,

  "Bayview Hunters Point": 0.8,
  "Visitacion Valley": 0.85,
  // others default to 1.0
};

function getRainFactor(nhood: string | undefined): number {
  if (!nhood) return 1.0;
  return RAIN_FACTOR_BY_NHOOD[nhood] ?? 1.0;
}

/**
 * MapLibre expression: rainIndex (≈ 20–50 mm) → color
 * We compress the scale so that small changes in 20–50mm are visible.
 */
function rainfallToColorExpr() {
  return [
    "interpolate",
    ["linear"],
    ["get", "rainIndex"],
    // ≤ 20 mm: blue
    20,
    "#38bdf8",
    // 20–30 mm: green
    30,
    "#22c55e",
    // 30–40 mm: yellow
    40,
    "#fbbf24",
    // 40–50 mm: orange
    50,
    "#f97316",
    // ≥ 55 mm: red
    55,
    "#dc2626",
  ];
}

export function SfWeatherMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const geojsonRef = useRef<GeoJSON.FeatureCollection | null>(null);

  const [mapReady, setMapReady] = useState(false);

  const [rawData, setRawData] = useState<CorrelationPoint[]>([]);
  const [yearBounds, setYearBounds] = useState<{ min: number; max: number }>();
  const [yearRange, setYearRange] = useState<[number, number]>();
  const [stats, setStats] = useState<ClimateStats | null>(null);

  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  // 1) Load historical climate data
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getCorrelationData();
        setRawData(data);

        if (data.length) {
          const years = data.map((d) => d.year);
          const min = Math.min(...years);
          const max = Math.max(...years);
          setYearBounds({ min, max });
          setYearRange([min, max]);
        }
      } catch (e) {
        console.error("Failed to load rainfall correlation data", e);
      }
    };
    loadData();
  }, []);

  // 2) Compute city-wide averages for selected year range
  const baseStats = useMemo(() => {
    if (!rawData.length || !yearRange) return null;

    const filtered = rawData.filter(
      (d) => d.year >= yearRange[0] && d.year <= yearRange[1]
    );
    if (!filtered.length) return null;

    const n = filtered.length;
    const total = filtered.reduce(
      (acc, d) => {
        acc.rainfall += d.rainfall;
        acc.temperature += d.temperature;
        acc.humidity += d.humidity;
        return acc;
      },
      { rainfall: 0, temperature: 0, humidity: 0 }
    );

    return {
      rainfall: total.rainfall / n,
      temperature: total.temperature / n,
      humidity: total.humidity / n,
    };
  }, [rawData, yearRange]);

  useEffect(() => {
    if (baseStats) setStats(baseStats);
  }, [baseStats]);

  // 3) Init MapLibre once (no dependency on baseStats → no white flicker)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: SF_CENTER,
      zoom: SF_ZOOM,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", async () => {
      try {
        const res = await fetch(SF_NEIGHBORHOODS_URL);
        const geojson = (await res.json()) as GeoJSON.FeatureCollection;

        // Default rainfall used before stats are ready (within 20–50mm band)
        const baseRain = 30;

        const enriched: GeoJSON.FeatureCollection = {
          ...geojson,
          features: geojson.features.map((f) => {
            const nhood = (f.properties as any)?.nhood as string | undefined;
            const factor = getRainFactor(nhood);
            const rainIndex = baseRain * factor;
            return {
              ...f,
              properties: { ...(f.properties as any), rainIndex },
            };
          }),
        };

        geojsonRef.current = enriched;

        map.addSource("sf-nhoods", {
          type: "geojson",
          data: enriched,
        });

        map.addLayer({
          id: "sf-nhoods-fill",
          type: "fill",
          source: "sf-nhoods",
          paint: {
            "fill-color": rainfallToColorExpr(),
            "fill-opacity": 0.8,
          },
        });

        map.addLayer({
          id: "sf-nhoods-border",
          type: "line",
          source: "sf-nhoods",
          paint: {
            "line-color": "#ffffff",
            "line-width": 1,
          },
        });

        map.on("mousemove", "sf-nhoods-fill", (e) => {
          const feature = e.features?.[0];
          if (!feature) {
            setHoverInfo(null);
            return;
          }
          const props = feature.properties as any;
          const nhoodName: string = props?.nhood ?? "Unknown";
          const rainIndex: number = props?.rainIndex ?? baseRain;
          setHoverInfo({ name: nhoodName, rainfall: rainIndex });
        });

        map.on("mouseleave", "sf-nhoods-fill", () => {
          setHoverInfo(null);
        });

        setMapReady(true);
      } catch (err) {
        console.error("Failed to load SF neighborhoods GeoJSON", err);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // ← important: empty dependency array

  // 4) When baseStats change AND map is ready, update rainIndex only (no map recreate)
  useEffect(() => {
    if (!mapReady || !mapRef.current || !geojsonRef.current || !baseStats)
      return;

    const baseRain = baseStats.rainfall; // ~ 20–50 mm
    const original = geojsonRef.current;

    const updated: GeoJSON.FeatureCollection = {
      ...original,
      features: original.features.map((f) => {
        const nhood = (f.properties as any)?.nhood as string | undefined;
        const factor = getRainFactor(nhood);
        const rainIndex = baseRain * factor;
        return {
          ...f,
          properties: { ...(f.properties as any), rainIndex },
        };
      }),
    };

    geojsonRef.current = updated;
    // @ts-expect-error MapLibre source type
    const source = mapRef.current.getSource("sf-nhoods") as any;
    if (source && source.setData) {
      source.setData(updated);
    }
  }, [baseStats, mapReady]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-2">
            <CardTitle>San Francisco Historical Climate Map</CardTitle>
            <CardDescription>
              Real San Francisco neighborhood boundaries (DataSF GeoJSON)
              combined with historical climate data. Color shows average annual
              rainfall intensity; coastal districts are wetter and the
              southeastern bay side is drier. Use the year range slider to
              explore long-term trends.
            </CardDescription>
          </div>
          <ThermometerSun className="h-8 w-8 text-primary" />
        </CardHeader>

        <CardContent className="flex flex-col md:flex-row gap-4">
          {/* Map */}
          <div className="flex-1 rounded-lg border overflow-hidden bg-slate-100">
            <div ref={mapContainerRef} className="w-full h-[420px]" />
          </div>

          {/* Side panel */}
          <div className="w-full md:w-80 space-y-4">
            {/* Year range */}
            {yearBounds && yearRange && (
              <div className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-muted-foreground">
                    Year range
                  </div>
                  <div className="text-xs">
                    {yearRange[0]} – {yearRange[1]}
                  </div>
                </div>
                <Slider
                  value={yearRange}
                  min={yearBounds.min}
                  max={yearBounds.max}
                  step={1}
                  onValueChange={(v) => setYearRange(v as [number, number])}
                />
              </div>
            )}

            {/* Hover info + averages */}
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold">
                  {hoverInfo
                    ? hoverInfo.name
                    : "Hover a neighborhood on the map"}
                </div>
                {stats && (
                  <Badge variant="outline">
                    {stats.temperature.toFixed(1)} °C
                  </Badge>
                )}
              </div>
              {stats ? (
                <>
                  <div className="text-xs text-muted-foreground">
                    City-wide mean rainfall (selected years):{" "}
                    {stats.rainfall.toFixed(1)} mm
                  </div>
                  <div className="text-xs text-muted-foreground">
                    City-wide mean temperature (selected years):{" "}
                    {stats.temperature.toFixed(1)} °C
                  </div>
                  <div className="text-xs text-muted-foreground">
                    City-wide mean humidity (selected years):{" "}
                    {stats.humidity.toFixed(1)} %
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Computing historical climate statistics…
                </div>
              )}
            </div>

            {/* Design inspiration */}
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">
                Design inspiration
              </div>
              <p className="text-xs text-muted-foreground">
                Inspired by Windy.com: a continuous basemap with a color ramp
                overlay. Here the ramp goes from blue (low rainfall) through
                green and yellow to orange and red (higher rainfall), while the
                side panel summarizes long-term averages for the selected years.
              </p>
            </div>

            {/* Color legend */}
            <div className="space-y-1 text-xs">
              <div className="font-semibold">
                Color legend (annual rainfall)
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-sm bg-[#38bdf8]" />
                  Low ≤ 20 mm
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-sm bg-[#22c55e]" />
                  Moderately low 20–30 mm
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-sm bg-[#fbbf24]" />
                  Moderate 30–40 mm
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-sm bg-[#f97316]" />
                  Moderately high 40–50 mm
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-sm bg-[#dc2626]" />
                  Very high ≥ 50 mm
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
