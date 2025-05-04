"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-gray-100 animate-pulse rounded-2xl" />
    ),
  }
);

interface ClientMapProps {
  children: React.ReactNode;
}

const ClientMap = ({ children }: ClientMapProps) => {
  useEffect(() => {
    // Client-side only code
    if (typeof window !== "undefined") {
      console.log(window.innerWidth);
    }
  }, []);

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      className="h-full w-full"
      scrollWheelZoom={true}
    >
      {children}
    </MapContainer>
  );
};

export default ClientMap;
