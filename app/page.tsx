"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import "leaflet/dist/leaflet.css";
import {
  TextField,
  Box,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select as MuiSelect,
  TextField as MuiTextField,
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import { ChromePicker } from "react-color";

// Dynamically import react-leaflet components with no SSR
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

type VisitType = "visited" | "lived" | "traveled";

interface DateRange {
  start: string;
  end: string;
}

interface CityInfo {
  name: string;
  dateRanges: DateRange[];
}

interface VisitInfo {
  type: VisitType;
  color: string;
  cities: CityInfo[];
  notes: string;
  departments?: string[];
}

interface CountryVisits {
  [key: string]: VisitInfo;
}

interface GeoJsonFeature {
  type: "Feature";
  properties: {
    ADMIN: string;
    [key: string]: unknown;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][];
  };
}

interface GeoJsonData {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

const defaultMapStyles = {
  default: {
    fillColor: "#D6D6DA",
    fillOpacity: 0.7,
    color: "#000",
    weight: 1,
  },
};

export default function Home() {
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [visits, setVisits] = useState<CountryVisits>({});
  const [visitType, setVisitType] = useState<VisitType>("visited");
  const [selectedColor, setSelectedColor] = useState("#4CAF50");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [cities, setCities] = useState<CityInfo[]>([
    { name: "", dateRanges: [{ start: "", end: "" }] },
  ]);
  const [mapStyle, setMapStyle] = useState("default");
  const [countries, setCountries] = useState<string[]>([]);
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20, 0]);
  const [mapZoom, setMapZoom] = useState(2);

  useEffect(() => {
    console.log("Loading saved visits...");
    const savedVisits = localStorage.getItem("countryVisits");
    if (savedVisits) {
      const parsed = JSON.parse(savedVisits);
      console.log("Loaded visits:", parsed);
      setVisits(parsed);
    }

    fetch(
      "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson"
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to fetch GeoJSON data: ${response.status} ${response.statusText}`
          );
        }
        return response.json();
      })
      .then((data: GeoJsonData) => {
        console.log("Loaded GeoJSON data:", data);
        setGeoJsonData(data);
        const countryNames = data.features
          .map((feature) => feature.properties.ADMIN)
          .filter((name): name is string => Boolean(name))
          .sort((a, b) => a.localeCompare(b));
        console.log("Available countries:", countryNames);
        setCountries(countryNames);
      })
      .catch((error) => {
        console.error("Error fetching GeoJSON data:", error);
      });
  }, []);

  const handleCountryClick = (feature: GeoJsonFeature) => {
    console.log("Country clicked:", feature);
    const countryName = feature.properties.ADMIN;
    setSelectedCountry(countryName);
    setIsEditMode(!!visits[countryName]);

    if (visits[countryName]) {
      console.log("Loading existing visit data:", visits[countryName]);
      const visitInfo = visits[countryName];
      setVisitType(visitInfo.type);
      setSelectedColor(visitInfo.color);
      setCities(
        visitInfo.cities.length > 0
          ? visitInfo.cities
          : [{ name: "", dateRanges: [{ start: "", end: "" }] }]
      );
      setSelectedDepartments(visitInfo.departments || []);
      setNotes(visitInfo.notes);
    } else {
      resetForm();
    }
    setVisitDialogOpen(true);
  };

  const handleSaveVisit = async () => {
    console.log("Saving visit...");
    setLoading(true);
    try {
      if (selectedCountry) {
        const filteredCities = cities.filter((city) => city.name.trim() !== "");
        const updatedVisits = {
          ...visits,
          [selectedCountry]: {
            type: visitType,
            color: selectedColor,
            cities: filteredCities,
            departments: selectedDepartments,
            notes,
          },
        };

        console.log("Saving updated visits:", updatedVisits);
        setVisits(updatedVisits);
        localStorage.setItem("countryVisits", JSON.stringify(updatedVisits));
        setMapKey((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error saving visit:", error);
    } finally {
      setLoading(false);
      setVisitDialogOpen(false);
      setIsEditMode(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setVisitType("visited");
    setSelectedColor("#4CAF50");
    setCities([{ name: "", dateRanges: [{ start: "", end: "" }] }]);
    setSelectedDepartments([]);
    setNotes("");
  };

  const getCountryStyle = (feature: GeoJsonFeature) => {
    const countryName = feature.properties.ADMIN;
    if (visits[countryName]) {
      return {
        ...defaultMapStyles.default,
        fillColor: visits[countryName].color,
        fillOpacity: 0.7,
      };
    }
    return defaultMapStyles.default;
  };

  const handleCountrySearch = (
    _event: React.SyntheticEvent,
    newValue: string | null
  ) => {
    console.log("Country selected:", newValue);
    if (newValue && geoJsonData) {
      const country = geoJsonData.features.find(
        (feature) => feature.properties.ADMIN === newValue
      );
      if (country) {
        // Calculate the center of the country's coordinates
        const coordinates = country.geometry.coordinates;
        let allCoords: number[][] = [];

        // Handle both Polygon and MultiPolygon
        if (country.geometry.type === "Polygon") {
          allCoords = coordinates[0];
        } else if (country.geometry.type === "MultiPolygon") {
          coordinates.forEach((polygon: number[][][]) => {
            allCoords = allCoords.concat(polygon[0]);
          });
        }

        const lats = allCoords.map((coord) => coord[1]);
        const lngs = allCoords.map((coord) => coord[0]);

        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
        const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

        setMapCenter([centerLat, centerLng]);
        setMapZoom(5);
        setMapKey((prev) => prev + 1);

        handleCountryClick(country);
      }
    }
  };

  const handleAddDateRange = (cityIndex: number) => {
    const newCities = [...cities];
    newCities[cityIndex].dateRanges.push({ start: "", end: "" });
    setCities(newCities);
  };

  return (
    <Box className="p-4">
      <Box className="mb-4 flex gap-4">
        <Autocomplete
          options={countries}
          renderInput={(params) => (
            <TextField {...params} label="Search Country" variant="outlined" />
          )}
          className="w-64"
          onChange={handleCountrySearch}
          isOptionEqualToValue={(option, value) => option === value}
          getOptionLabel={(option) => option || ""}
          renderOption={(props, option) => (
            <Box component="li" {...props} key={option}>
              {option}
            </Box>
          )}
        />
        <FormControl className="w-48">
          <InputLabel>Map Style</InputLabel>
          <MuiSelect
            value={mapStyle}
            label="Map Style"
            onChange={(e) => setMapStyle(e.target.value)}
          >
            <MenuItem value="default">Default</MenuItem>
            <MenuItem value="satellite">Satellite</MenuItem>
            <MenuItem value="terrain">Terrain</MenuItem>
          </MuiSelect>
        </FormControl>
      </Box>

      <Paper elevation={3} className="p-4">
        <div style={{ height: "500px" }}>
          <MapContainer
            key={mapKey}
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url={
                mapStyle === "satellite"
                  ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  : mapStyle === "terrain"
                  ? "https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg"
                  : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              }
            />
            {geoJsonData && (
              <GeoJSON
                data={geoJsonData}
                style={getCountryStyle}
                onEachFeature={(feature, layer) => {
                  layer.on({
                    click: () => handleCountryClick(feature),
                  });
                }}
              />
            )}
          </MapContainer>
        </div>
      </Paper>

      <Dialog
        open={visitDialogOpen}
        onClose={() => setVisitDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isEditMode ? `Edit ${selectedCountry}` : `Add ${selectedCountry}`}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth className="mt-4">
            <InputLabel>Visit Type</InputLabel>
            <MuiSelect
              value={visitType}
              label="Visit Type"
              onChange={(e) => setVisitType(e.target.value as VisitType)}
            >
              <MenuItem value="visited">Visited</MenuItem>
              <MenuItem value="lived">Lived</MenuItem>
              <MenuItem value="traveled">Traveled</MenuItem>
            </MuiSelect>
          </FormControl>

          <Box className="mt-4">
            <Button
              variant="outlined"
              onClick={() => setShowColorPicker(!showColorPicker)}
              style={{ backgroundColor: selectedColor }}
            >
              Choose Color
            </Button>
            {showColorPicker && (
              <Box className="mt-2">
                <ChromePicker
                  color={selectedColor}
                  onChange={(color) => setSelectedColor(color.hex)}
                />
              </Box>
            )}
          </Box>

          {cities.map((city, cityIndex) => (
            <Box key={cityIndex} className="mt-4 p-4 border rounded">
              <MuiTextField
                label={`City ${cityIndex + 1}`}
                value={city.name}
                onChange={(e) => {
                  const newCities = [...cities];
                  newCities[cityIndex].name = e.target.value;
                  if (
                    cityIndex === cities.length - 1 &&
                    e.target.value !== ""
                  ) {
                    newCities.push({
                      name: "",
                      dateRanges: [{ start: "", end: "" }],
                    });
                  }
                  setCities(newCities);
                }}
                fullWidth
              />

              {city.dateRanges.map((dateRange, rangeIndex) => (
                <Box key={rangeIndex} className="mt-2 flex gap-2">
                  <MuiTextField
                    label="Start Date"
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => {
                      const newCities = [...cities];
                      newCities[cityIndex].dateRanges[rangeIndex].start =
                        e.target.value;
                      setCities(newCities);
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                  <MuiTextField
                    label="End Date"
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => {
                      const newCities = [...cities];
                      newCities[cityIndex].dateRanges[rangeIndex].end =
                        e.target.value;
                      setCities(newCities);
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              ))}

              <Button
                onClick={() => handleAddDateRange(cityIndex)}
                className="mt-2"
              >
                Add Date Range
              </Button>
            </Box>
          ))}

          <MuiTextField
            label="Notes"
            multiline
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            className="mt-4"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVisitDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveVisit}
            variant="contained"
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : isEditMode ? (
              "Update"
            ) : (
              "Save"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
