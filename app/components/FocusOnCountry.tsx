"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { Feature } from "geojson";

let L: typeof import("leaflet");
if (typeof window !== "undefined") {
  import("leaflet").then((leaflet) => {
    L = leaflet;
  });
}

interface FocusOnCountryProps {
  country: string | null;
  geoJsonData: { features: Feature[] } | null;
}

export default function FocusOnCountry({
  country,
  geoJsonData,
}: FocusOnCountryProps) {
  const map = useMap();

  useEffect(() => {
    if (country && geoJsonData && L) {
      // ... (le reste de votre effet)
    }
  }, [country, geoJsonData, map]);

  return null;
}
