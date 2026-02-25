"use client";

import { useEffect, useState } from "react";
import { GoogleMap, useLoadScript, InfoWindow } from "@react-google-maps/api";
import { ContactRecord } from "@/types/contact";
import { Loader2 } from "lucide-react";
import { getAuthContext } from "@/lib/auth";
import { debug } from "@/lib/debug";

interface ContactMapProps {
  contacts: ContactRecord[];
  caseId: string;
}

interface Location {
  UUID: string;
  contactUUID: string;
  lat: number;
  lng: number;
  formattedAddress: string;
  timestamp: string;
}

const containerStyle = {
  width: "100%",
  height: "600px",
};

// Default center (Carlsbad, CA)
const defaultCenter = {
  lat: 33.1581,
  lng: -117.3506,
};

// Move libraries array outside component to prevent recreation
const libraries: ("places" | "marker")[] = ["places", "marker"];

// Default Map ID for Advanced Markers
const DEFAULT_MAP_ID = "8f348c3c6599b07";

const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

export function ContactMap({ contacts, caseId }: ContactMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [contactLocations, setContactLocations] = useState<Map<string, Location>>(new Map());

  // Debug contacts prop
  useEffect(() => {
    console.log('ContactMap: Received contacts:', {
      count: contacts.length,
      contacts: contacts.map(c => ({
        UUID: c.UUID,
        timestamp: c.timestamp,
        type: c.type
      }))
    });
  }, [contacts]);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Fetch location data for all contacts
  useEffect(() => {
    const fetchLocations = async () => {
      setLoading(true);
      setError(null);
      const authContext = await getAuthContext();
      const newLocations = new Map<string, Location>();

      try {
        debug.log("Starting to fetch locations for case:", {
          caseId,
          contactCount: contacts.length,
          contactIds: contacts.map(c => c.UUID)
        });

        const response = await fetch(`/api/cases/${caseId}/locations`, {
          headers: {
            "x-tenant-id": authContext.tenantId,
            "x-user-id": authContext.userId,
            "x-access-reason": "Case investigation"
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch locations: ${response.statusText}`);
        }

        const data = await response.json();
        debug.log("Received locations data:", data);

        if (!data.locations || !Array.isArray(data.locations)) {
          throw new Error('Invalid response format: missing locations array');
        }

        // Create a map of contact UUIDs to their locations
        data.locations.forEach((location: any) => {
          if (location.latitude && location.longitude) {
            const lat = Number(location.latitude);
            const lng = Number(location.longitude);
            
            if (isNaN(lat) || isNaN(lng)) {
              debug.error(`Invalid coordinates for location ${location.UUID}:`, { lat, lng });
              return;
            }

            // Store location by contact UUID
            newLocations.set(location.contactUUID, {
              UUID: location.UUID,
              contactUUID: location.contactUUID,
              lat,
              lng,
              formattedAddress: location.formattedAddress || 'Unknown address',
              timestamp: location.timestamp
            });
            debug.log(`Added location for contact ${location.contactUUID}`);
          } else {
            debug.log(`Skipping location ${location.UUID} - missing latitude/longitude`);
          }
        });

        debug.log("Final locations map:", {
          size: newLocations.size,
          locations: Array.from(newLocations.entries())
        });

        setContactLocations(newLocations);
      } catch (err) {
        debug.error('Error fetching locations:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch locations');
      } finally {
        setLoading(false);
      }
    };

    if (contacts.length > 0) {
      fetchLocations();
    } else {
      debug.log("No contacts to fetch locations for");
      setContactLocations(new Map());
      setLoading(false);
    }
  }, [contacts, caseId]);

  // Process contacts to create markers
  useEffect(() => {
    console.log('ContactMap: Starting marker creation process');
    console.log('ContactMap: Number of contacts with locations:', contactLocations.size);

    // Clean up existing markers
    markers.forEach(marker => marker.map = null);

    if (!map || !isLoaded) {
      console.log('ContactMap: Map not ready:', { map, isLoaded });
      return;
    }

    // Create markers for each contact with valid location
    const newMarkers = contacts
      .filter(contact => contactLocations.has(contact.UUID))
      .map((contact, index) => {
        const location = contactLocations.get(contact.UUID)!;
        console.log('ContactMap: Creating marker for contact:', {
          index,
          contactId: contact.UUID,
          location
        });

        const markerDiv = document.createElement('div');
        markerDiv.className = 'marker-container';
        markerDiv.style.width = '30px';
        markerDiv.style.height = '30px';
        markerDiv.style.borderRadius = '50%';
        markerDiv.style.backgroundColor = '#ef4444';
        markerDiv.style.border = '2px solid white';
        markerDiv.style.display = 'flex';
        markerDiv.style.alignItems = 'center';
        markerDiv.style.justifyContent = 'center';
        markerDiv.style.color = 'white';
        markerDiv.style.fontSize = '14px';
        markerDiv.style.fontWeight = 'bold';
        markerDiv.style.cursor = 'pointer';
        markerDiv.textContent = (index + 1).toString();

        const position = {
          lat: location.lat,
          lng: location.lng
        };

        console.log('ContactMap: Creating marker at position:', position);

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position,
          content: markerDiv,
          title: `Contact ${index + 1}: ${location.formattedAddress}`,
        });

        // Add click handler
        marker.addListener('click', () => {
          console.log('ContactMap: Marker clicked:', {
            contactId: contact.UUID,
            position,
            address: location.formattedAddress
          });
          setSelectedLocation(location);
        });

        return marker;
      });

    console.log('ContactMap: Created markers count:', newMarkers.length);
    setMarkers(newMarkers);

    // Set bounds to include all markers
    if (newMarkers.length > 0) {
      console.log('ContactMap: Setting map bounds for valid contacts');
      const bounds = new google.maps.LatLngBounds();
      contactLocations.forEach(location => {
        bounds.extend({
          lat: location.lat,
          lng: location.lng
        });
      });
      map.fitBounds(bounds);
      
      // Add padding to the bounds to ensure all markers are visible
      google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
        const currentZoom = map.getZoom();
        if (currentZoom) {
          map.setZoom(currentZoom - 1); // Zoom out one level to add padding
        }
      });
    } else {
      console.log('ContactMap: No valid contacts, using default center');
      map.setCenter(defaultCenter);
      map.setZoom(12);
    }

  }, [map, contactLocations, contacts, isLoaded]);

  // Update map center when selected location changes
  useEffect(() => {
    if (!map || !selectedLocation || markers.length === 0) {
      console.log('ContactMap: Cannot update marker position:', { map, selectedLocation, markers });
      return;
    }

    // Update map center and zoom
    setMapCenter({
      lat: selectedLocation.lat,
      lng: selectedLocation.lng
    });
    map.setCenter({
      lat: selectedLocation.lat,
      lng: selectedLocation.lng
    });
    
    // When a marker is clicked, zoom in to the marker but not too close
    map.setZoom(14);
  }, [selectedLocation, map, markers]);

  if (loadError) {
    console.error('Google Maps load error:', loadError);
    return (
      <div className="flex items-center justify-center h-[600px] text-red-500">
        Error loading Google Maps
      </div>
    );
  }

  if (!isLoaded) {
    console.log('Google Maps not loaded yet');
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loading && (
        <div className="flex items-center justify-center h-[600px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-[600px] text-red-500">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="relative" style={{ height: '600px', width: '100%' }}>
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={mapCenter}
            zoom={15}
            onLoad={(map) => {
              console.log("Map loaded successfully");
              setMap(map);
            }}
            options={{
              disableDefaultUI: false,
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              minZoom: 6,
              maxZoom: 20,
              mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID || DEFAULT_MAP_ID,
            }}
          >
            {selectedLocation && (
              <InfoWindow
                position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                onCloseClick={() => setSelectedLocation(null)}
              >
                <div className="p-2">
                  <h3 className="font-semibold mb-2">Location</h3>
                  <p className="text-sm text-gray-600 mb-2">{selectedLocation.formattedAddress}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedLocation.timestamp).toLocaleString()}
                  </p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </div>
      )}
    </div>
  );
} 