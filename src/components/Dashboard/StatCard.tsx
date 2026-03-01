// src/components/Dashboard/StatCard.tsx
import React from "react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
  color: "blue" | "green" | "orange" | "purple" | "red";
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  icon: Icon,
  color,
  onClick,
}) => {
  const colorClasses = {
    blue: {
      bg: "bg-blue-100",
      text: "text-blue-600",
    },
    green: {
      bg: "bg-green-100",
      text: "text-green-600",
    },
    orange: {
      bg: "bg-orange-100",
      text: "text-orange-600",
    },
    purple: {
      bg: "bg-purple-100",
      text: "text-purple-600",
    },
    red: {
      bg: "bg-red-100",
      text: "text-red-600",
    },
  };

  const isPositive = change.startsWith("+");

  return (
    <div
      className={`bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-12 h-12 ${colorClasses[color].bg} rounded-lg flex items-center justify-center`}
        >
          <Icon className={`w-6 h-6 ${colorClasses[color].text}`} />
        </div>
        <span
          className={`text-sm font-semibold ${
            isPositive ? "text-green-600" : "text-red-600"
          }`}
        >
          {change}
        </span>
      </div>
      <h3 className="text-2xl font-bold text-gray-800 mb-1">{value}</h3>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
};

export default StatCard;
