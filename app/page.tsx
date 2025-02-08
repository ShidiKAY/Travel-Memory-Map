"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import {
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
  IconButton,
  Typography,
} from "@mui/material";
import { ChromePicker } from "react-color";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import L from "leaflet";
import "tailwindcss/tailwind.css";

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
          const allCoords: number[][] = [];

          const extractCoords = (coords: number[][]) => {
            if (
              coords.length === 2 &&
              typeof coords[0] === "number" &&
              typeof coords[1] === "number"
            ) {
              allCoords.push(coords);
            } else {
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

            // Adjust padding based on country size but keep it minimal
            let zoomPadding;
            if (area > 1000) {
              // Very large countries like Russia
              zoomPadding = [50, 50];
            } else if (area > 100) {
              // Large countries
              zoomPadding = [30, 30];
            } else if (area > 10) {
              // Medium countries
              zoomPadding = [20, 20];
            } else {
              // Small countries
              zoomPadding = [10, 10];
            }

            map.flyToBounds(bounds, {
              padding: zoomPadding,
              duration: 1,
              maxZoom: 8, // Allow closer zoom for better visibility
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

export default function Home() {
  const [geoJsonData, setGeoJsonData] = useState<{
    features: GeoJSONFeature[];
  } | null>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
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

  useEffect(() => {
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
        // Filter out archipelagos but keep individual islands
        const excludedNames = ["Maldives", "Archipelago", "Islands", "Isles"];

        const filteredFeatures = data.features.filter((f: GeoJSONFeature) => {
          return !excludedNames.some((name) =>
            f.properties.name.includes(name)
          );
        });

        const filteredData = {
          ...data,
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

  const getCountryStyle = (feature: GeoJSONFeature) => ({
    fillColor: travelData[feature.properties.name]?.color || "#CCCCCC",
    weight: feature.properties.name === selectedCountry ? 3 : 1,
    color: feature.properties.name === selectedCountry ? "#000" : "#333",
    fillOpacity: travelData[feature.properties.name] ? 0.8 : 0.6,
  });

  const handleCountryClick = (countryName: string) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastClickTime;

    if (timeDiff < 300) {
      // Double click
      setSelectedCountry(countryName);
    } else {
      // Single click
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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-grow max-w-md">
            <Autocomplete
              options={countries}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Country"
                  className="bg-white rounded-lg"
                />
              )}
              onChange={(_, value) => handleCountrySelect(value)}
              value={selectedCountry}
              isOptionEqualToValue={(option, value) => option === value}
            />
          </div>
          <FormControl className="min-w-[200px] bg-white rounded-lg">
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
        </div>

        <div className="h-[70vh] rounded-xl shadow-lg overflow-hidden">
          <MapContainer
            center={[20, 0]}
            zoom={2}
            className="h-full w-full"
            scrollWheelZoom={true}
            whenReady={(map) => {
              map.target.on("zoomend", () => {
                setZoomLevel(map.target.getZoom());
                setDialogOpen(false);
              });
              map.target.on("movestart", () => {
                setDialogOpen(false);
              });
            }}
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
                  style={getCountryStyle}
                  onEachFeature={(feature, layer) => {
                    const bounds = layer.getBounds();
                    const center = bounds.getCenter();
                    const area = bounds.getNorth() - bounds.getSouth();

                    // More selective label display based on zoom and country size
                    const minZoomForLabels = 3;
                    const shouldShowLabel = () => {
                      if (zoomLevel < minZoomForLabels) return false;

                      // Base importance on area and status
                      const importance =
                        (area > 20 ? 4 : area > 10 ? 3 : area > 5 ? 2 : 1) +
                        (travelData[feature.properties.name] ? 2 : 0) +
                        (feature.properties.name === selectedCountry ? 3 : 0);

                      // Stricter conditions for label display
                      return (
                        zoomLevel >= 7 || // Show all at high zoom
                        (zoomLevel >= 5 && importance >= 4) || // Show important at medium zoom
                        (zoomLevel >= 4 && importance >= 6) || // Show very important at medium-low zoom
                        (zoomLevel >= 3 && importance >= 7) // Show only most important at low zoom
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
                              feature.properties.name === selectedCountry
                                ? "700"
                                : "500"
                            };
                            background-color: rgba(255, 255, 255, 0.9);
                            padding: ${baseFontSize / 4}px ${
                          baseFontSize / 2
                        }px;
                            border-radius: ${baseFontSize / 4}px;
                            border: 1px solid rgba(0, 0, 0, 0.1);
                            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                            white-space: nowrap;
                            pointer-events: none;
                            transform: translate(-50%, -50%);
                            opacity: ${
                              feature.properties.name === selectedCountry
                                ? "1"
                                : "0.8"
                            };
                          ">${feature.properties.name}</div>
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
                      click: () => handleCountryClick(feature.properties.name),
                    });

                    if (feature.properties.name === selectedCountry) {
                      layer
                        .bindPopup(
                          `<div class="text-center">
                          <strong>${feature.properties.name}</strong>
                          ${
                            feature.properties.name_local
                              ? `<br/><em>${feature.properties.name_local}</em>`
                              : ""
                          }
                        </div>`
                        )
                        .openPopup();
                    }
                  }}
                />
              </>
            )}
          </MapContainer>
        </div>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="md"
          fullWidth
          className="rounded-lg"
        >
          <DialogTitle className="bg-gray-50 border-b">
            {selectedCountry}
          </DialogTitle>
          <DialogContent className="space-y-6 p-6">
            <div className="grid gap-6">
              <div className="p-4 bg-white rounded-lg shadow">
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
                className="bg-white rounded-lg"
              />

              <div className="space-y-4">
                <Typography variant="h6" className="font-bold">
                  Trips
                </Typography>
                {currentData.trips.map((trip, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow"
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
                      className="text-red-500 hover:text-red-700"
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
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Add Trip
                </Button>
              </div>

              <div className="space-y-4">
                <Typography variant="h6" className="font-bold">
                  Cities
                </Typography>
                {currentData.cities.map((city, cityIndex) => (
                  <div
                    key={cityIndex}
                    className="bg-white p-6 rounded-lg shadow space-y-4"
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
                    />
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
                    />
                    {city.trips.map((trip, tripIndex) => (
                      <div
                        key={tripIndex}
                        className="flex flex-wrap gap-4 items-center"
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
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  Add City
                </Button>
              </div>
            </div>
          </DialogContent>
          <DialogActions className="p-4 bg-gray-50 border-t">
            <Button
              onClick={handleRemoveCountry}
              className="text-red-600 hover:text-red-800"
              startIcon={<DeleteIcon />}
            >
              Remove Country
            </Button>
            <Button
              onClick={() => setDialogOpen(false)}
              className="text-gray-600 hover:text-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              className="bg-blue-500 hover:bg-blue-600"
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
}
