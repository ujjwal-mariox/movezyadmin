// src/components/Dashboard/RecentOrders.tsx
import React from "react";
import type { Order } from "../../types";

interface RecentOrdersProps {
  orders: Order[];
}

const RecentOrders: React.FC<RecentOrdersProps> = ({ orders }) => {
  const getStatusClass = (status: Order["status"]): string => {
    const statusClasses: Record<Order["status"], string> = {
      Delivered: "bg-green-100 text-green-700",
      "In Transit": "bg-blue-100 text-blue-700",
      Pending: "bg-yellow-100 text-yellow-700",
      Cancelled: "bg-red-100 text-red-700",
      Assigned: "bg-cyan-100 text-cyan-700",
    };
    return `px-3 py-1 rounded-full text-xs font-semibold ${statusClasses[status]}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">Recent Orders</h3>
        <button className="text-movezy-600 hover:text-movezy-700 text-sm font-medium">
          View All
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                Order ID
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                Customer
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                Rider
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                Status
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                Amount
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-4 text-sm font-medium text-gray-800">
                  {order.id}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {order.customerName}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {order.rider}
                </td>
                <td className="py-3 px-4">
                  <span className={getStatusClass(order.status)}>
                    {order.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm font-semibold text-gray-800">
                  ₹{order.amount.toLocaleString()}
                </td>
                <td className="py-3 px-4">
                  <button className="text-movezy-600 hover:text-movezy-700 text-sm font-medium">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentOrders;
