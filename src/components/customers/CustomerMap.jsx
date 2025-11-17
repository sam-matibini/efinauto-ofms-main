import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function CustomerMap({ customers }) {
  const customersWithCoords = customers.filter(c => c.latitude && c.longitude);

  if (customersWithCoords.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <p className="text-gray-500">No customer addresses with coordinates to display on map</p>
        <p className="text-sm text-gray-400 mt-2">Add latitude and longitude to customer records to see them on the map</p>
      </div>
    );
  }

  const center = customersWithCoords.length > 0
    ? [customersWithCoords[0].latitude, customersWithCoords[0].longitude]
    : [45.4215, -75.6972]; // Default to Ottawa, Canada

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden" style={{ height: "500px" }}>
      <MapContainer
        center={center}
        zoom={10}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {customersWithCoords.map((customer) => (
          <Marker
            key={customer.id}
            position={[customer.latitude, customer.longitude]}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-gray-900">{customer.full_name}</h3>
                <p className="text-sm text-gray-600">{customer.phone}</p>
                {customer.email && (
                  <p className="text-sm text-gray-600">{customer.email}</p>
                )}
                {customer.address && (
                  <p className="text-sm text-gray-500 mt-1">{customer.address}</p>
                )}
                {customer.city && (
                  <p className="text-sm text-gray-500">{customer.city}, {customer.country}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}