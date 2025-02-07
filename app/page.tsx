"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
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
} from "@mui/material";
import { ChromePicker } from "react-color";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

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

const MAP_STYLES = {
  default: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  terrain: "https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg",
};

export default function Home() {
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
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

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
    )
      .then((response) => response.json())
      .then((data) => {
        setGeoJsonData(data);
        const countryNames = data.features
          .map((f: any) => f.properties.name)
          .sort();
        setCountries(countryNames);
      })
      .catch((error) => console.error("Error loading map data:", error));
  }, []);

  const getCountryStyle = (feature: any) => ({
    fillColor: travelData[feature.properties.name]?.color || "#CCCCCC",
    weight: 1,
    color: "#333",
    fillOpacity: travelData[feature.properties.name] ? 0.8 : 0.6,
  });

  const handleCountryClick = (countryName: string) => {
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
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (selectedCountry) {
      setTravelData((prev) => ({
        ...prev,
        [selectedCountry]: currentData,
      }));
    }
    setDialogOpen(false);
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
          onChange={(_, value) => value && handleCountryClick(value)}
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
        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer url={MAP_STYLES[mapStyle]} />
          {geoJsonData && (
            <GeoJSON
              data={geoJsonData}
              style={getCountryStyle}
              onEachFeature={(feature, layer) => {
                layer.on({
                  click: () => handleCountryClick(feature.properties.name),
                });
              }}
            />
          )}
        </MapContainer>
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{selectedCountry}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <ChromePicker
              color={currentData.color}
              onChange={(color) =>
                setCurrentData((prev) => ({ ...prev, color: color.hex }))
              }
            />

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
            />

            <Typography variant="h6">Trips</Typography>
            {currentData.trips.map((trip, index) => (
              <Box
                key={index}
                sx={{ display: "flex", gap: 2, alignItems: "center" }}
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
                    setCurrentData((prev) => ({ ...prev, trips: newTrips }));
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
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
            >
              Add Trip
            </Button>

            <Typography variant="h6">Cities</Typography>
            {currentData.cities.map((city, cityIndex) => (
              <Box
                key={cityIndex}
                sx={{ border: "1px solid #ddd", p: 2, borderRadius: 1 }}
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
                />
                {/* City trips */}
                {city.trips.map((trip, tripIndex) => (
                  <Box
                    key={tripIndex}
                    sx={{ display: "flex", gap: 2, alignItems: "center" }}
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
                  </Box>
                ))}
              </Box>
            ))}
            <Button startIcon={<AddIcon />} onClick={addCity}>
              Add City
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
