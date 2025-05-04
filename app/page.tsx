"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Autocomplete,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Select,
  MenuItem,
  Button,
  IconButton,
  Typography,
  Switch,
} from "@mui/material";
import { ChromePicker } from "react-color";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import "tailwindcss/tailwind.css";
import type { Geometry, Feature } from "geojson";

// Dynamic imports for Leaflet components
const ClientMap = dynamic(() => import("../app/components/ClientMap"), {
  ssr: false,
  loading: () => <div className="h-[75vh] bg-gray-100 rounded-2xl" />,
});

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const GeoJSON = dynamic(
  () => import("react-leaflet").then((mod) => mod.GeoJSON),
  { ssr: false }
);

const FocusOnCountry = dynamic(
  () => import("../app/components/FocusOnCountry"),
  {
    ssr: false,
  }
);

const MapContent = dynamic(() => import("../app/components/MapContent"), {
  ssr: false,
});

// Interfaces
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

interface GeoJSON {
  type: "FeatureCollection";
  features: Feature[];
}

interface GeoJSONProperties {
  name: string;
  name_local?: string;
  continent?: string;
  featureType?: string;
}

type GeoFeature = {
  properties: GeoJSONProperties;
  geometry: Geometry;
};

const MAP_STYLES = {
  default: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  terrain: "https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg",
};

const translations = {
  en: {
    title: "Travel Memory Map",
    explore: "Explore the World",
    description1:
      "Discover new places, track your travels and create memories that last a lifetime.",
    description2:
      "Whether you are planning your next adventure or reminiscing about past trips.",
    description3:
      "Join us on this journey and start mapping your adventures today!",
    language: "Language",
    darkMode: "Toggle Dark Mode",
  },
  fr: {
    title: "Carte de Mémoire de Voyage",
    explore: "Explorez le Monde",
    description1:
      "Découvrez de nouveaux endroits, suivez vos voyages et créez des souvenirs.",
    description2:
      "Que vous planifiez votre prochaine aventure ou que vous vous remémoriez des voyages passés.",
    description3:
      "Rejoignez-nous dans ce voyage et commencez à cartographier vos aventures!",
    language: "Langue",
    darkMode: "Activer le mode sombre",
  },
};

export default function Home() {
  const [geoJsonData, setGeoJsonData] = useState<GeoJSON | null>(null);
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
  const [language, setLanguage] = useState("en");
  const [darkMode, setDarkMode] = useState(false);

  const t = translations[language as keyof typeof translations];

  useEffect(() => {
    const savedData = localStorage.getItem("travelData");
    if (savedData) setTravelData(JSON.parse(savedData));
  }, []);

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
    )
      .then((response) => response.json())
      .then((data) => {
        const excludedNames = ["Maldives", "Archipelago", "Islands", "Isles"];
        const filteredFeatures = data.features.filter(
          (f: Feature) =>
            f.properties?.name &&
            !excludedNames.some((name) => f.properties?.name.includes(name))
        );

        setGeoJsonData({
          type: "FeatureCollection",
          features: filteredFeatures,
        });
        setCountries(
          filteredFeatures
            .map((f: Feature) => (f.properties ? f.properties.name : ""))
            .sort()
        );
      })
      .catch((error) => console.error("Error loading map data:", error));
  }, []);

  const getCountryStyle = (feature: GeoFeature | undefined) => {
    if (!feature || typeof window === "undefined") return {};

    return {
      fillColor: travelData[feature.properties.name]?.color || "#CCCCCC",
      weight: feature.properties.name === selectedCountry ? 3 : 1,
      color: feature.properties.name === selectedCountry ? "#000" : "#333",
      fillOpacity: travelData[feature.properties.name] ? 0.8 : 0.6,
    };
  };

  const handleCountrySelect = (countryName: string | null) => {
    if (countryName) {
      setSelectedCountry(countryName);
      setCurrentData(
        travelData[countryName] || {
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
        }
      );
    }
  };

  const handleSave = () => {
    if (selectedCountry) {
      const newTravelData = { ...travelData, [selectedCountry]: currentData };
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
    <div
      className={`min-h-screen ${
        darkMode ? "bg-gray-900" : "bg-gradient-to-br from-indigo-50 to-blue-50"
      }`}
    >
      <div className="max-w-7xl mx-auto p-8">
        {/* Controls */}
        <div className="fixed top-4 right-4 z-50 flex items-center space-x-4">
          <Switch
            checked={language === "fr"}
            onChange={() =>
              setLanguage((prev) => (prev === "en" ? "fr" : "en"))
            }
            color={darkMode ? "default" : "primary"}
          />
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only"
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
            />
            <div
              className={`w-10 h-6 ${
                darkMode ? "bg-gray-600" : "bg-gray-300"
              } rounded-full shadow-inner`}
            ></div>
            <div
              className={`absolute w-4 h-4 ${
                darkMode ? "bg-gray-200" : "bg-white"
              } rounded-full shadow transform transition-transform duration-200 ease-in-out ${
                darkMode ? "translate-x-4" : "translate-x-0"
              }`}
            ></div>
          </label>
        </div>

        <h1 className="text-4xl font-bold mb-6 text-center">{t.title}</h1>

        <section
          className={`mb-12 p-6 ${
            darkMode ? "bg-gray-800" : "bg-white"
          } rounded-lg shadow-lg`}
        >
          <h2
            className={`text-3xl font-semibold mb-4 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {t.explore}
          </h2>
          <p className={`mb-4 ${darkMode ? "text-gray-300" : "text-gray-800"}`}>
            {t.description1}
          </p>
          <p className={`mb-4 ${darkMode ? "text-gray-300" : "text-gray-800"}`}>
            {t.description2}
          </p>
          <p className={`mb-4 ${darkMode ? "text-gray-300" : "text-gray-800"}`}>
            {t.description3}
          </p>
        </section>

        <div className="flex flex-wrap gap-6 items-center mb-8">
          <FormControl className="min-w-[200px] bg-white rounded-xl shadow-lg">
            <Select
              value={mapStyle}
              onChange={(e) =>
                setMapStyle(e.target.value as keyof typeof MAP_STYLES)
              }
            >
              <MenuItem value="default">Default</MenuItem>
              <MenuItem value="satellite">Satellite</MenuItem>
              <MenuItem value="terrain">Terrain</MenuItem>
            </Select>
          </FormControl>
          <div className="flex-grow max-w-md">
            <Autocomplete
              options={countries}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Country"
                  className="bg-white rounded-xl shadow-lg"
                />
              )}
              onChange={(_, value) => handleCountrySelect(value)}
              value={selectedCountry}
              isOptionEqualToValue={(option, value) => option === value}
            />
          </div>
        </div>

        <div className="h-[75vh] rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm bg-white/30">
          <ClientMap>
            <TileLayer url={MAP_STYLES[mapStyle]} />
            {geoJsonData && (
              <>
                <FocusOnCountry
                  country={selectedCountry}
                  geoJsonData={geoJsonData}
                />
                <GeoJSON data={geoJsonData} style={getCountryStyle} />
                <MapContent setDialogOpen={setDialogOpen} />
              </>
            )}
          </ClientMap>
        </div>

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
      </div>
    </div>
  );
}
