declare module "react-simple-maps" {
  import { ComponentType, PropsWithChildren, ReactNode } from "react";

  interface GeoFeature {
    type: string;
    properties: {
      name: string;
      [key: string]: unknown;
    };
    geometry: {
      type: string;
      coordinates: number[][];
    };
  }

  interface ComposableMapProps {
    projectionConfig?: object;
    width?: number;
    height?: number;
    [key: string]: unknown;
  }

  interface GeographyProps {
    geography: GeoFeature;
    [key: string]: unknown;
  }

  export const ComposableMap: ComponentType<
    PropsWithChildren<ComposableMapProps>
  >;
  export const Geographies: ComponentType<{
    geography: string | object;
    children: (props: { geographies: GeoFeature[] }) => ReactNode;
  }>;
  export const Geography: ComponentType<GeographyProps>;
  export const ZoomableGroup: ComponentType<
    PropsWithChildren<{
      zoom?: number;
      center?: [number, number];
      onMoveEnd?: (position: {
        coordinates: [number, number];
        zoom: number;
      }) => void;
    }>
  >;
}
