"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Box,
  Autocomplete,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  IconButton,
  Typography,
  Switch,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { ChromePicker } from "react-color";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "tailwindcss/tailwind.css";
import type { Layer, FeatureGroup, StyleFunction } from "leaflet";
import type { Feature, Geometry, GeoJsonProperties } from "geojson";

// Dynamically import map components with no SSR
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import("react-leaflet").then((mod) => mod.GeoJSON),
  { ssr: false }
);

interface TravelData {
  country: string;
  color: string;
  comment: string;
  trips: {
    startDate: string;
    endDate: string;
  }[];
  cities: {
    name: string;
    color: string;
    comment: string;
    trips: {
      startDate: string;
      endDate: string;
    }[];
  }[];
}

interface GeoJSONFeature {
  type: string;
  properties: {
    name: string;
    name_local?: string;
    continent?: string;
    featureType?: string;
  };
  geometry: {
    type: string;
    coordinates: number[][];
  };
}

interface GeoJSON {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

interface ExtendedLayer extends Layer {
  labelMarker?: L.Marker;
}

function FocusOnCountry({
  country,
  geoJsonData,
}: {
  country: string | null;
  geoJsonData: { features: GeoJSONFeature[] } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (country && geoJsonData) {
      const countryFeature = geoJsonData.features.find(
        (f) => f.properties.name === country
      );

      if (countryFeature) {
        try {
          const allCoords: [number, number][] = [];

          type GeoCoordinate = number | number[] | number[][];

          const extractCoords = (coords: GeoCoordinate): void => {
            if (
              Array.isArray(coords) &&
              coords.length === 2 &&
              typeof coords[0] === "number" &&
              typeof coords[1] === "number"
            ) {
              allCoords.push([coords[0], coords[1]]);
            } else if (Array.isArray(coords)) {
              coords.forEach((c) => extractCoords(c));
            }
          };

          extractCoords(countryFeature.geometry.coordinates);

          const latLngs = allCoords.map((coord) =>
            L.latLng(coord[1], coord[0])
          );

          if (latLngs.length > 0) {
            const bounds = L.latLngBounds(latLngs);
            const area =
              (bounds.getNorth() - bounds.getSouth()) *
              (bounds.getEast() - bounds.getWest());

            let zoomPadding: [number, number];
            if (area > 1000) {
              zoomPadding = [50, 50];
            } else if (area > 100) {
              zoomPadding = [30, 30];
            } else if (area > 10) {
              zoomPadding = [20, 20];
            } else {
              zoomPadding = [10, 10];
            }

            map.flyToBounds(bounds, {
              padding: zoomPadding,
              duration: 1,
              maxZoom: 8,
            });
          }
        } catch (error) {
          console.error("Error focusing on country:", error);
        }
      }
    }
  }, [country, geoJsonData, map]);

  return null;
}

const MAP_STYLES = {
  default: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  terrain: "https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg",
};

// Define the props interface
interface MapContentProps {
  setZoomLevel: (zoom: number) => void; // Type for setZoomLevel
  setDialogOpen: (open: boolean) => void; // Type for setDialogOpen
}

// New MapContent component
const MapContent: React.FC<MapContentProps> = ({
  setZoomLevel,
  setDialogOpen,
}) => {
  const map = useMap(); // Access the map instance

  useEffect(() => {
    const handleZoomEnd = () => {
      setZoomLevel(map.getZoom());
      setDialogOpen(false);
    };

    const handleMoveStart = () => {
      setDialogOpen(false);
    };

    // Attach event listeners
    map.on("zoomend", handleZoomEnd);
    map.on("movestart", handleMoveStart);

    // Cleanup function to remove event listeners
    return () => {
      map.off("zoomend", handleZoomEnd);
      map.off("movestart", handleMoveStart);
    };
  }, [map, setZoomLevel, setDialogOpen]);

  return null; // This component does not render anything
};

const translations = {
  en: {
    title: "Travel Memory Map",
    explore: "Explore the World",
    description1:
      "Discover new places, track your travels, and create memories that last a lifetime. Our interactive map allows you to visualize your journeys and share your experiences with friends and family.",
    description2:
      "Whether you are planning your next adventure or reminiscing about past trips, our app provides the tools you need to document your travels. Add cities, trips, and personal notes to each location, and customize your map with colors that represent your experiences.",
    description3:
      "Join us on this journey and start mapping your adventures today!",
    language: "Language",
    darkMode: "Toggle Dark Mode",
  },
  fr: {
    title: "Carte de Mémoire de Voyage",
    explore: "Explorez le Monde",
    description1:
      "Découvrez de nouveaux endroits, suivez vos voyages et créez des souvenirs qui durent toute une vie. Notre carte interactive vous permet de visualiser vos voyages et de partager vos expériences avec vos amis et votre famille.",
    description2:
      "Que vous planifiez votre prochaine aventure ou que vous vous remémoriez des voyages passés, notre application vous fournit les outils nécessaires pour documenter vos voyages. Ajoutez des villes, des voyages et des notes personnelles à chaque emplacement, et personnalisez votre carte avec des couleurs qui représentent vos expériences.",
    description3:
      "Rejoignez-nous dans ce voyage et commencez à cartographier vos aventures dès aujourd'hui!",
    language: "Langue",
    darkMode: "Activer le mode sombre",
  },
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [geoJsonData, setGeoJsonData] = useState<GeoJSON | null>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<keyof typeof MAP_STYLES>("default");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [travelData, setTravelData] = useState<{ [key: string]: TravelData }>(
    {}
  );
  const [currentData, setCurrentData] = useState<TravelData>({
    country: "",
    color: "#1976d2",
    comment: "",
    trips: [
      {
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      },
    ],
    cities: [],
  });
  const [zoomLevel, setZoomLevel] = useState(2);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [language, setLanguage] = useState("en");
  const [darkMode, setDarkMode] = useState<boolean>(false);

  const t = translations[language as keyof typeof translations];

  useEffect(() => {
    setMounted(true);
    const savedData = localStorage.getItem("travelData");
    if (savedData) {
      setTravelData(JSON.parse(savedData));
    }
  }, []);

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
    )
      .then((response) => response.json())
      .then((data) => {
        const excludedNames = ["Maldives", "Archipelago", "Islands", "Isles"];

        const filteredFeatures = data.features.filter((f: GeoJSONFeature) => {
          return !excludedNames.some((name) =>
            f.properties.name.includes(name)
          );
        });

        const filteredData: GeoJSON = {
          type: "FeatureCollection",
          features: filteredFeatures,
        };

        setGeoJsonData(filteredData);
        const countryNames = filteredFeatures
          .map((f: GeoJSONFeature) => f.properties.name)
          .sort();
        setCountries(countryNames);
      })
      .catch((error) => console.error("Error loading map data:", error));
  }, []);

  const getCountryStyle = (feature: Feature<Geometry, GeoJsonProperties>) => {
    const featureProperties = feature?.properties || {}; // Provide a default empty object
    return {
      fillColor:
        (featureProperties.name && travelData[featureProperties.name]?.color) ||
        "#CCCCCC",
      weight:
        featureProperties.name === selectedCountry
          ? 3
          : featureProperties.name === hoveredCountry
          ? 2
          : 1,
      color:
        featureProperties.name === selectedCountry
          ? "#000"
          : featureProperties.name === hoveredCountry
          ? "#444"
          : "#333",
      fillOpacity:
        featureProperties.name && travelData[featureProperties.name]
          ? 0.8
          : featureProperties.name === hoveredCountry
          ? 0.7
          : 0.6,
    };
  };

  const handleCountryClick = (countryName: string) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastClickTime;

    if (timeDiff < 300) {
      setSelectedCountry(countryName);
    } else {
      const countryData = travelData[countryName] || {
        country: countryName,
        color: "#1976d2",
        comment: "",
        trips: [
          {
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
          },
        ],
        cities: [],
      };
      setCurrentData(countryData);
      setSelectedCountry(countryName);
      setDialogOpen(true);
    }
    setLastClickTime(currentTime);
  };

  const handleCountrySelect = (countryName: string | null) => {
    if (countryName) {
      setSelectedCountry(countryName);
      const countryData = travelData[countryName] || {
        country: countryName,
        color: "#1976d2",
        comment: "",
        trips: [
          {
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
          },
        ],
        cities: [],
      };
      setCurrentData(countryData);
    }
  };

  const handleSave = () => {
    if (selectedCountry) {
      const newTravelData = {
        ...travelData,
        [selectedCountry]: currentData,
      };
      setTravelData(newTravelData);
      localStorage.setItem("travelData", JSON.stringify(newTravelData));
    }
    setDialogOpen(false);
  };

  const handleRemoveCountry = () => {
    if (selectedCountry) {
      const newTravelData = { ...travelData };
      delete newTravelData[selectedCountry];
      setTravelData(newTravelData);
      localStorage.setItem("travelData", JSON.stringify(newTravelData));
      setDialogOpen(false);
      setSelectedCountry(null);
    }
  };

  const addCity = () => {
    setCurrentData((prev) => ({
      ...prev,
      cities: [
        ...prev.cities,
        {
          name: "",
          color: "#1976d2",
          comment: "",
          trips: [
            {
              startDate: new Date().toISOString(),
              endDate: new Date().toISOString(),
            },
          ],
        },
      ],
    }));
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        sx={{
          height: "100vh",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", gap: 2 }}>
          <Autocomplete
            options={countries}
            sx={{ width: 300 }}
            renderInput={(params) => (
              <TextField {...params} label="Search Country" />
            )}
            onChange={(_, value) => value && handleCountrySelect(value)}
          />
          <FormControl sx={{ width: 200 }}>
            <InputLabel>Map Style</InputLabel>
            <Select
              value={mapStyle}
              label="Map Style"
              onChange={(e) =>
                setMapStyle(e.target.value as keyof typeof MAP_STYLES)
              }
            >
              <MenuItem value="default">Default</MenuItem>
              <MenuItem value="satellite">Satellite</MenuItem>
              <MenuItem value="terrain">Terrain</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Paper elevation={3} sx={{ flexGrow: 1 }}>
          {mounted && (
            <MapContainer
              center={[20, 0]}
              zoom={2}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer url={MAP_STYLES[mapStyle]} />
              {geoJsonData && (
                <>
                  <FocusOnCountry
                    country={selectedCountry}
                    geoJsonData={geoJsonData}
                  />
                  <GeoJSON
                    data={geoJsonData}
                    style={getCountryStyle as StyleFunction}
                    onEachFeature={(
                      feature: Feature<Geometry, GeoJsonProperties> | undefined,
                      layer: ExtendedLayer
                    ) => {
                      if (!feature || !feature.properties) return; // Handle undefined feature or properties

                      const geoJsonFeature =
                        feature.properties as GeoJSONFeature["properties"]; // Type assertion
                      const bounds = (layer as FeatureGroup).getBounds();
                      const center = bounds.getCenter();
                      const area = bounds.getNorth() - bounds.getSouth();

                      const minZoomForLabels = 3;
                      const shouldShowLabel = () => {
                        if (zoomLevel < minZoomForLabels) return false;

                        const importance =
                          (area > 20 ? 4 : area > 10 ? 3 : area > 5 ? 2 : 1) +
                          (geoJsonFeature && travelData[geoJsonFeature.name]
                            ? 2
                            : 0) + // Use geoJsonFeature
                          (geoJsonFeature?.name === selectedCountry ? 3 : 0) +
                          (geoJsonFeature?.name === hoveredCountry ? 2 : 0);

                        return (
                          zoomLevel >= 7 ||
                          (zoomLevel >= 5 && importance >= 4) ||
                          (zoomLevel >= 4 && importance >= 6) ||
                          (zoomLevel >= 3 && importance >= 7) ||
                          geoJsonFeature.name === selectedCountry ||
                          geoJsonFeature.name === hoveredCountry
                        );
                      };

                      if (shouldShowLabel()) {
                        const baseFontSize = Math.min(
                          Math.max(8, area * (zoomLevel / 3)),
                          14
                        );

                        const label = L.divIcon({
                          className: "country-label",
                          html: `
                            <div style="
                              font-size: ${baseFontSize}px;
                              font-weight: ${
                                geoJsonFeature.name === selectedCountry
                                  ? "700"
                                  : geoJsonFeature.name === hoveredCountry
                                  ? "600"
                                  : "500"
                              };
                              background-color: rgba(255, 255, 255, 0.95);
                              padding: ${baseFontSize / 4}px ${
                            baseFontSize / 2
                          }px;
                              border-radius: ${baseFontSize / 2}px;
                              border: 1px solid rgba(0, 0, 0, 0.1);
                              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                              white-space: nowrap;
                              pointer-events: none;
                              transform: translate(-50%, -50%);
                              opacity: ${
                                geoJsonFeature.name === selectedCountry
                                  ? "1"
                                  : geoJsonFeature.name === hoveredCountry
                                  ? "0.95"
                                  : "0.9"
                              };
                            ">${geoJsonFeature.name}</div>
                          `,
                          iconSize: [0, 0],
                          iconAnchor: [0, 0],
                        });

                        layer.on("add", (e) => {
                          if (e.target._map) {
                            const labelMarker = L.marker(center, {
                              icon: label,
                              zIndexOffset: Math.floor(area * 100),
                            }).addTo(e.target._map);
                            layer.labelMarker = labelMarker;
                          }
                        });

                        layer.on("remove", () => {
                          if (layer.labelMarker) {
                            layer.labelMarker.remove();
                          }
                        });
                      }

                      layer.on({
                        click: () => handleCountryClick(geoJsonFeature.name),
                        mouseover: () => setHoveredCountry(geoJsonFeature.name),
                        mouseout: () => setHoveredCountry(null),
                      });

                      if (geoJsonFeature.name === selectedCountry) {
                        layer
                          .bindPopup(
                            `<div class="text-center p-2">
                              <strong class="text-lg">${
                                geoJsonFeature.name
                              }</strong>
                              ${
                                geoJsonFeature?.name_local
                                  ? `<br/><em class="text-gray-600">${geoJsonFeature.name_local}</em>`
                                  : ""
                              }
                            </div>`
                          )
                          .openPopup();
                      }
                    }}
                  />
                  <MapContent
                    setZoomLevel={setZoomLevel}
                    setDialogOpen={setDialogOpen}
                  />
                </>
              )}
            </MapContainer>
          )}
        </Paper>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="md"
          fullWidth
          className="rounded-2xl"
          PaperProps={{
            className: "rounded-2xl",
          }}
        >
          <DialogTitle className="bg-gray-800 text-white py-6 font-bold text-2xl">
            {selectedCountry}
          </DialogTitle>
          <DialogContent className="space-y-8 p-8">
            <div className="grid gap-8">
              <div className="p-6 bg-white rounded-xl shadow-lg">
                <Typography
                  variant="h6"
                  className="mb-4 font-bold text-gray-700"
                >
                  Country Color
                </Typography>
                <ChromePicker
                  color={currentData.color}
                  onChange={(color) =>
                    setCurrentData((prev) => ({ ...prev, color: color.hex }))
                  }
                />
              </div>

              <TextField
                label="Country Comment"
                multiline
                rows={4}
                value={currentData.comment}
                onChange={(e) =>
                  setCurrentData((prev) => ({
                    ...prev,
                    comment: e.target.value,
                  }))
                }
                className="bg-white rounded-xl shadow-lg"
              />

              <div className="space-y-6">
                <Typography variant="h6" className="font-bold text-gray-700">
                  Trips
                </Typography>
                {currentData.trips.map((trip, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap gap-4 items-center bg-white p-6 rounded-xl shadow-lg transition-all hover:shadow-xl"
                  >
                    <TextField
                      label="Start Date"
                      type="date"
                      value={trip.startDate.split("T")[0]}
                      onChange={(e) => {
                        const newTrips = [...currentData.trips];
                        newTrips[index].startDate = new Date(
                          e.target.value
                        ).toISOString();
                        setCurrentData((prev) => ({
                          ...prev,
                          trips: newTrips,
                        }));
                      }}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                    <TextField
                      label="End Date"
                      type="date"
                      value={trip.endDate.split("T")[0]}
                      onChange={(e) => {
                        const newTrips = [...currentData.trips];
                        newTrips[index].endDate = new Date(
                          e.target.value
                        ).toISOString();
                        setCurrentData((prev) => ({
                          ...prev,
                          trips: newTrips,
                        }));
                      }}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                    <IconButton
                      onClick={() => {
                        const newTrips = currentData.trips.filter(
                          (_, i) => i !== index
                        );
                        setCurrentData((prev) => ({
                          ...prev,
                          trips: newTrips,
                        }));
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </div>
                ))}
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setCurrentData((prev) => ({
                      ...prev,
                      trips: [
                        ...prev.trips,
                        {
                          startDate: new Date().toISOString(),
                          endDate: new Date().toISOString(),
                        },
                      ],
                    }));
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full py-3 px-6 transition-all"
                >
                  Add Trip
                </Button>
              </div>

              <div className="space-y-6">
                <Typography variant="h6" className="font-bold text-gray-700">
                  Cities
                </Typography>
                {currentData.cities.map((city, cityIndex) => (
                  <div
                    key={cityIndex}
                    className="bg-white p-8 rounded-xl shadow-lg space-y-6 transition-all hover:shadow-xl"
                  >
                    <TextField
                      label="City Name"
                      value={city.name}
                      onChange={(e) => {
                        const newCities = [...currentData.cities];
                        newCities[cityIndex].name = e.target.value;
                        setCurrentData((prev) => ({
                          ...prev,
                          cities: newCities,
                        }));
                      }}
                      fullWidth
                      className="rounded-lg"
                    />
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <ChromePicker
                        color={city.color}
                        onChange={(color) => {
                          const newCities = [...currentData.cities];
                          newCities[cityIndex].color = color.hex;
                          setCurrentData((prev) => ({
                            ...prev,
                            cities: newCities,
                          }));
                        }}
                      />
                    </div>
                    <TextField
                      label="City Comment"
                      multiline
                      rows={2}
                      value={city.comment}
                      onChange={(e) => {
                        const newCities = [...currentData.cities];
                        newCities[cityIndex].comment = e.target.value;
                        setCurrentData((prev) => ({
                          ...prev,
                          cities: newCities,
                        }));
                      }}
                      fullWidth
                      className="rounded-lg"
                    />
                    {city.trips.map((trip, tripIndex) => (
                      <div
                        key={tripIndex}
                        className="flex flex-wrap gap-4 items-center p-4 bg-gray-50 rounded-lg"
                      >
                        <TextField
                          label="Start Date"
                          type="date"
                          value={trip.startDate.split("T")[0]}
                          onChange={(e) => {
                            const newCities = [...currentData.cities];
                            newCities[cityIndex].trips[tripIndex].startDate =
                              new Date(e.target.value).toISOString();
                            setCurrentData((prev) => ({
                              ...prev,
                              cities: newCities,
                            }));
                          }}
                          InputLabelProps={{
                            shrink: true,
                          }}
                        />
                        <TextField
                          label="End Date"
                          type="date"
                          value={trip.endDate.split("T")[0]}
                          onChange={(e) => {
                            const newCities = [...currentData.cities];
                            newCities[cityIndex].trips[tripIndex].endDate =
                              new Date(e.target.value).toISOString();
                            setCurrentData((prev) => ({
                              ...prev,
                              cities: newCities,
                            }));
                          }}
                          InputLabelProps={{
                            shrink: true,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ))}
                <Button
                  startIcon={<AddIcon />}
                  onClick={addCity}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full py-3 px-6 transition-all"
                >
                  Add City
                </Button>
              </div>
            </div>
          </DialogContent>
          <DialogActions className="p-6 bg-gray-50 border-t">
            <Button
              onClick={handleRemoveCountry}
              className="text-red-600 hover:text-red-800 transition-colors"
              startIcon={<DeleteIcon />}
            >
              Remove Country
            </Button>
            <Button
              onClick={() => setDialogOpen(false)}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full py-2 px-6 transition-all"
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
        <footer
          className={`mt-12 p-6 ${
            darkMode ? "bg-gray-700 text-gray-200" : "bg-white text-gray-600"
          } rounded-lg shadow-lg`}
        >
          <h3 className="text-xl font-semibold mb-4">About This App</h3>
          <p>
            This app is designed to help you track your travels and create a
            visual representation of your adventures. You can add countries,
            cities, and trips, and customize your map with colors and comments.
          </p>
          <p>
            Built with React, Leaflet, and Tailwind CSS, this app aims to
            provide a seamless user experience for travel enthusiasts.
          </p>
          <p>2025 Travel Memory Map.</p>
        </footer>
      </Box>
    </LocalizationProvider>
  );
}
