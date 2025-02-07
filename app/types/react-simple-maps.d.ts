declare module "react-simple-maps" {
  import { ComponentType, PropsWithChildren, ReactNode } from "react";

  export const ComposableMap: ComponentType<PropsWithChildren<any>>;
  export const Geographies: ComponentType<{
    geography: string | object;
    children: (props: { geographies: any[] }) => ReactNode;
  }>;
  export const Geography: ComponentType<any>;
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
