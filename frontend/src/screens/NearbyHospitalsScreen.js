import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  RefreshControl,
} from "react-native";
import {
  Text,
  Card,
  Button,
  Avatar,
  ActivityIndicator,
  Surface,
  SegmentedButtons,
} from "react-native-paper";
import {
  MapPin,
  Phone,
  Clock,
  ExternalLink,
  Navigation,
} from "lucide-react-native";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";
import axios from "axios";

const NearbyHospitalsScreen = () => {
  const { t } = useTranslation();
  const [location, setLocation] = useState(null);

  const normalizePhoneNumber = (number) => {
    if (!number || typeof number !== "string") return null;
    const cleaned = number.replace(/[^+\d]/g, "");
    return cleaned.replace(/\D/g, "").length >= 7 ? cleaned : null;
  };
  const [address, setAddress] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchType, setSearchType] = useState("hospital");

  const getLocationAndHospitals = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", t("location_denied"));
        setLoading(false);
        return;
      }

      let userLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(userLocation);

      // Get address from coordinates
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
      });
      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        setAddress(
          `${addr.name || ""} ${addr.street || ""}, ${addr.city || ""}`,
        );
      }

      fetchHospitals(
        userLocation.coords.latitude,
        userLocation.coords.longitude,
      );
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    getLocationAndHospitals();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await getLocationAndHospitals();
    setRefreshing(false);
  }, []);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const fetchHospitals = async (lat, lon, type = searchType) => {
    setLoading(true);
    try {
      const query = `
        [out:json];
        (
          node["amenity"="${type}"](around:10000, ${lat}, ${lon});
          way["amenity"="${type}"](around:10000, ${lat}, ${lon});
          relation["amenity"="${type}"](around:10000, ${lat}, ${lon});
        );
        out center;
      `;

      const response = await axios({
        method: "post",
        url: "https://overpass-api.de/api/interpreter",
        data: "data=" + encodeURIComponent(query),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "VirtualDoctor/1.0",
        },
      });

      if (response.data && response.data.elements) {
        const results = response.data.elements
          .map((element) => {
            const tags = element.tags || {};
            const hospitalLat = element.lat || element.center?.lat;
            const hospitalLon = element.lon || element.center?.lon;

            const addressParts = [
              tags["addr:housenumber"],
              tags["addr:street"],
              tags["addr:suburb"],
              tags["addr:city"],
            ].filter(Boolean);

            const displayAddress =
              addressParts.length > 0
                ? addressParts.join(", ")
                : tags["addr:full"] || tags["addr:place"] || "Address not available";

            const rawPhone = tags.phone || tags["contact:phone"] || "";

            return {
              name:
                tags.name ||
                tags["name:en"] ||
                tags["name:my"] ||
                "Medical Center",
              address: displayAddress,
              phone: normalizePhoneNumber(rawPhone),
              originalPhone: rawPhone,
              open: tags.opening_hours || "24 Hours (Estimate)",
              lat: hospitalLat,
              lon: hospitalLon,
              distance: calculateDistance(lat, lon, hospitalLat, hospitalLon),
            };
          })
          .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

        setHospitals(results);
      } else {
        setHospitals([]);
      }
    } catch (error) {
      console.error("Error fetching hospitals:", error);
      Alert.alert(
        "Error",
        "Could not fetch nearby hospitals. Please try again later.",
      );
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  };

  const openMaps = (hospital) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lon}`;
    Linking.openURL(url);
  };

  const makeCall = (number) => {
    Linking.openURL(`tel:${number.replace(/\s/g, "")}`);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Surface style={styles.locationHeader} elevation={2}>
        <View style={styles.locIconBg}>
          <Navigation size={20} color="#6B7FFF" />
        </View>
        <View style={styles.locTextContainer}>
          <Text variant="labelSmall" style={styles.locLabel}>
            {t("your_location")}
          </Text>
          <Text
            variant="bodyMedium"
            numberOfLines={1}
            style={styles.locAddress}
          >
            {loading ? t("loading") : address || t("searching_location")}
          </Text>
        </View>
      </Surface>

      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {t("nearby_medical")}
        </Text>
        <SegmentedButtons
          value={searchType}
          onValueChange={(val) => {
            setSearchType(val);
            if (location)
              fetchHospitals(location.coords.latitude, location.coords.longitude, val);
          }}
          buttons={[
            { value: "hospital", label: t("hospitals"), icon: "hospital-building" },
            { value: "pharmacy", label: t("pharmacies"), icon: "pill" },
            { value: "clinic", label: t("clinics"), icon: "medical-bag" },
          ]}
          style={styles.filterButtons}
        />
      </View>

      <View style={styles.list}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator animating={true} color="#6B7FFF" size="large" />
            <Text style={styles.loadingText}>{t("finding_hospitals")}</Text>
          </View>
        ) : (
          hospitals.map((hospital, index) => (
            <Card key={index} style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <View style={styles.hospIconBg}>
                    <Avatar.Icon
                      size={40}
                      icon="hospital-building"
                      backgroundColor="transparent"
                      color="#6B7FFF"
                    />
                  </View>
                  <View style={styles.headerText}>
                    <Text variant="titleMedium" style={styles.name}>
                      {hospital.name}
                    </Text>
                    <Text variant="labelSmall" style={styles.distanceText}>
                      {hospital.distance} km {t("away")}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <MapPin size={16} color="#8A8FA3" />
                  <Text style={styles.infoText}>{hospital.address}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Clock size={16} color="#8A8FA3" />
                  <Text style={styles.infoText}>
                    {t("open")}: {hospital.open}
                  </Text>
                </View>

                {hospital.originalPhone ? (
                  <View style={styles.infoRow}>
                    <Phone size={16} color="#8A8FA3" />
                    <Text style={styles.infoText}>{hospital.originalPhone}</Text>
                  </View>
                ) : null}

                <View style={styles.actions}>
                  <Button
                    mode="outlined"
                    onPress={() => hospital.phone && makeCall(hospital.phone)}
                    style={styles.actionBtn}
                    icon={() => <Phone size={16} color="#6B7FFF" />}
                    disabled={!hospital.phone}
                  >
                    {hospital.phone ? t("call") : t("no_phone")}
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => openMaps(hospital)}
                    style={[styles.actionBtn, styles.mapBtn]}
                    icon={() => <ExternalLink size={16} color="#FFF" />}
                  >
                    {t("directions")}
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    margin: 16,
    backgroundColor: "#FFF",
    borderRadius: 12,
  },
  locIconBg: {
    padding: 8,
    backgroundColor: "#E3F2FD",
    borderRadius: 10,
  },
  locTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  locLabel: {
    color: "#6B7FFF",
    fontWeight: "bold",
    letterSpacing: 1,
  },
  locAddress: {
    color: "#5A5F73",
    marginTop: 2,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: {
    fontWeight: "bold",
    color: "#5A5F73",
  },
  subtitle: {
    color: "#8A8FA3",
    marginTop: 4,
  },
  filterButtons: {
    marginTop: 16,
  },
  list: {
    padding: 16,
  },
  loadingContainer: {
    marginTop: 60,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: "#8A8FA3",
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "#FFF",
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  hospIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F3FF",
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontWeight: "bold",
    color: "#5A5F73",
  },
  distanceText: {
    color: "#6B7FFF",
    fontWeight: "bold",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    color: "#555",
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  mapBtn: {
    backgroundColor: "#6B7FFF",
  },
});

export default NearbyHospitalsScreen;
