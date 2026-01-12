import React, { useState } from "react";
import { Bike, Truck, CheckCircle, Calculator } from "lucide-react";

interface VehicleType {
  id: string;
  name: string;
  minDistance: number;
  maxDistance: number;
  loadType: "Light" | "Medium" | "Heavy";
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

const vehicleTypes: VehicleType[] = [
  {
    id: "bike",
    name: "Bike",
    minDistance: 0,
    maxDistance: 10,
    loadType: "Light",
    description: "Best for documents, small parcels, and food delivery.",
    icon: Bike,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    id: "tempo",
    name: "Tempo",
    minDistance: 10,
    maxDistance: 50,
    loadType: "Medium",
    description: "Ideal for furniture, appliances, and medium-sized goods.",
    icon: Truck,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    id: "truck",
    name: "Truck",
    minDistance: 50,
    maxDistance: 500,
    loadType: "Heavy",
    description: "Perfect for industrial goods, large moves, and bulk shipments.",
    icon: Truck,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
];

const VehicleTypes: React.FC = () => {
  const [distance, setDistance] = useState<string>("");
  const [suggestedVehicle, setSuggestedVehicle] = useState<VehicleType | null>(
    null
  );

  const handleCheck = () => {
    const dist = parseFloat(distance);
    if (isNaN(dist)) {
      setSuggestedVehicle(null);
      return;
    }

    // Logic to find the best vehicle
    let found = vehicleTypes.find(
      (v) => dist >= v.minDistance && dist <= v.maxDistance
    );

    // If distance is greater than max defined, default to Truck
    if (!found && dist > 50) {
      found = vehicleTypes.find((v) => v.id === "truck");
    }

    setSuggestedVehicle(found || null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Vehicle Management</h2>
        <p className="text-gray-500">
          View available vehicle types and check suitability based on distance.
        </p>
      </div>

      {/* Calculator Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Calculator className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">
            Vehicle Recommender
          </h3>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Distance (km)
            </label>
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="Enter distance..."
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <button
            onClick={handleCheck}
            className="px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
          >
            Check Suitability
          </button>
        </div>

        {suggestedVehicle && (
          <div className="mt-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h4 className="font-bold text-green-900">
                Recommended: {suggestedVehicle.name}
              </h4>
              <p className="text-green-700 text-sm mt-1">
                Based on the distance of {distance}km, we recommend using a{" "}
                {suggestedVehicle.name}. It handles {suggestedVehicle.loadType.toLowerCase()} loads efficiently.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Vehicle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {vehicleTypes.map((vehicle) => {
          const Icon = vehicle.icon;
          return (
            <div
              key={vehicle.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300 group"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${vehicle.bg} group-hover:scale-110 transition-transform duration-300`}
              >
                <Icon className={`w-6 h-6 ${vehicle.color}`} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {vehicle.name}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Range</span>
                  <span className="font-medium text-gray-900">
                    {vehicle.minDistance} - {vehicle.maxDistance} km
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Load Capacity</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      vehicle.loadType === "Light"
                        ? "bg-green-100 text-green-700"
                        : vehicle.loadType === "Medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {vehicle.loadType}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-50">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {vehicle.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VehicleTypes;