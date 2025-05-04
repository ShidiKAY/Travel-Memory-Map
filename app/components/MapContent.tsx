"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

interface MapContentProps {
  setZoomLevel?: (zoom: number) => void;
  setDialogOpen: (open: boolean) => void;
}

export default function MapContent({
  setZoomLevel,
  setDialogOpen,
}: MapContentProps) {
  const map = useMap();

  useEffect(() => {
    const handleZoomEnd = () => {
      if (setZoomLevel) {
        setZoomLevel(map.getZoom());
      }
      setDialogOpen(false);
    };

    const handleMoveStart = () => {
      setDialogOpen(false);
    };

    map.on("zoomend", handleZoomEnd);
    map.on("movestart", handleMoveStart);

    return () => {
      map.off("zoomend", handleZoomEnd);
      map.off("movestart", handleMoveStart);
    };
  }, [map, setZoomLevel, setDialogOpen]);

  return null;
}
