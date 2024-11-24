import MapLibreGL from '@maplibre/maplibre-react-native';
import Geolocation from '@react-native-community/geolocation';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  PermissionsAndroid,
  StyleSheet,
  Text,
  View,
} from 'react-native';

MapLibreGL.setAccessToken(null);

const SATELLITE_STYLE_URL =
  "https://api.maptiler.com/maps/outdoor-v2/style.json?key=2W9TXvFsJ7aosPmPOFz7";

type Coordinates = {
  latitude: number;
  longitude: number;
};

const predefinedDestinations: Record<string, Coordinates> = {
  "Google HQ": { latitude: 37.422, longitude: -122.084 },
  "Mountain View Library": { latitude: 37.395682, longitude: -122.078713 },
  "Shoreline Amphitheatre": { latitude: 37.4266, longitude: -122.08 },
  "NASA Ames Research Center": { latitude: 37.408824, longitude: -122.064114 },
  "Stanford University": { latitude: 37.4275, longitude: -122.1697 },
};

export const MapBox: React.FC = () => {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<number[][]>([]);
  const [distance, setDistance] = useState<number | null>(null); // Distance in meters
  const [duration, setDuration] = useState<number | null>(null); // Duration in seconds

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message: "We need to access your location to show it on the map",
          buttonPositive: "Allow",
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        getUserLocation();
      } else {
        Alert.alert("Permission Denied", "Cannot access location.");
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const getUserLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
      },
      (error) => {
        Alert.alert("Error", "Could not fetch location: " + error.message);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  };

  const fetchRoute = async (start: Coordinates, end: Coordinates) => {
    try {
      const response = await axios.get(
        `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`
      );
      const route = response.data.routes[0];

      // Extract route coordinates
      const coordinates = route.geometry.coordinates.map(
        ([lon, lat]: [number, number]) => [lon, lat]
      );
      setRouteCoordinates(coordinates);

      // Extract distance and duration
      setDistance(route.distance); // Distance in meters
      setDuration(route.duration); // Duration in seconds
    } catch (error: any) {
      Alert.alert("Error", "Could not fetch route: " + error.message);
    }
  };

  const handleDestinationSelect = (place: string) => {
    const selectedDestination = predefinedDestinations[place];
    setDestination(selectedDestination);
    if (userLocation) {
      fetchRoute(userLocation, selectedDestination);
    }
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters} m`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours} hrs ${minutes % 60} mins`;
    }
    return `${minutes} mins`;
  };

  const recenterToUserLocation = () => {
    if (userLocation) {
      Alert.alert("Recenter", "Returning to your current location.");
      setDestination(null);
      setRouteCoordinates([]);
      setDistance(null);
      setDuration(null);
    } else {
      Alert.alert("Error", "User location is not available.");
    }
  };

  return (
    <View style={styles.container}>
      {userLocation ? (
        <>
          <MapLibreGL.MapView
            style={styles.mapView}
            styleURL={SATELLITE_STYLE_URL}
            compassEnabled
            pitchEnabled
            scrollEnabled
            zoomEnabled
          >
            <MapLibreGL.Camera
              centerCoordinate={[userLocation.longitude, userLocation.latitude]}
              zoomLevel={14}
            />
            <MapLibreGL.PointAnnotation
              id="userLocation"
              coordinate={[userLocation.longitude, userLocation.latitude]}
            >
              <View style={styles.userLocationMarker} />
            </MapLibreGL.PointAnnotation>

            {destination && (
              <MapLibreGL.PointAnnotation
                id="destination"
                coordinate={[destination.longitude, destination.latitude]}
              >
                <View style={styles.destinationMarker} />
              </MapLibreGL.PointAnnotation>
            )}

            {routeCoordinates.length > 0 && (
              <MapLibreGL.ShapeSource
                id="routeSource"
                shape={{
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates: routeCoordinates,
                  },
                  properties: {}
                }}
              >
                <MapLibreGL.LineLayer
                  id="routeLayer"
                  style={{
                    lineColor: "blue",
                    lineWidth: 5,
                  }}
                />
              </MapLibreGL.ShapeSource>
            )}
          </MapLibreGL.MapView>

          <View style={styles.destinationButtons}>
            {Object.keys(predefinedDestinations).map((place) => (
              <Button
                key={place}
                title={`Go to ${place}`}
                onPress={() => handleDestinationSelect(place)}
              />
            ))}
          </View>

          {distance !== null && duration !== null && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>Distance: {formatDistance(distance)}</Text>
              <Text style={styles.infoText}>Estimated Time: {formatDuration(duration)}</Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <Text>Fetching your location...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5FCFF",
  },
  mapView: {
    flex: 1,
    alignSelf: "stretch",
    width: 400,
    height: "auto",
  },
  recenterButton: {
    position: "absolute",
    top: 20,
    left: 20,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 5,
    zIndex: 100,
    elevation: 3,
  },
  recenterButtonText: {
    fontSize: 16,
    color: "black",
  },
  userLocationMarker: {
    height: 20,
    width: 20,
    backgroundColor: "blue",
    borderRadius: 10,
    borderColor: "white",
    borderWidth: 2,
  },
  destinationMarker: {
    height: 20,
    width: 20,
    backgroundColor: "red",
    borderRadius: 10,
    borderColor: "white",
    borderWidth: 2,
  },
  destinationButtons: {
    position: "absolute",
    bottom: 20,
    left: 20,
  },
  infoBox: {
    position: "absolute",
    bottom: 80,
    left: 20,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 5,
    elevation: 3,
  },
  infoText: {
    fontSize: 14,
    color: "black",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
