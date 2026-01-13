import React from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ChevronRight, Shield, Truck, Receipt, Percent } from "lucide-react";

const cmsSections = [
  {
    id: "commission-management",
    title: "Commission Management",
    description: "Manage platform commissions, rates, and vehicle-specific charges.",
    icon: Percent,
    lastUpdated: "2 hours ago",
    status: "Active",
  },
  {
    id: "terms-and-conditions",
    title: "Terms & Conditions",
    description: "Update user and LSP terms of service agreements.",
    icon: FileText,
    lastUpdated: "1 day ago",
    status: "Active",
  },
  {
    id: "privacy-policy",
    title: "Privacy Policy",
    description: "Manage data privacy and protection policies.",
    icon: Shield,
    lastUpdated: "3 days ago",
    status: "Active",
  },
  {
    id: "refund-policy",
    title: "Refund Policy",
    description: "Configure refund eligibility, timelines, and rules.",
    icon: Receipt,
    lastUpdated: "1 week ago",
    status: "Active",
  },
  {
    id: "delivery-policy",
    title: "Delivery Policy",
    description: "Set delivery rules, vehicle restrictions, and intercity policies.",
    icon: Truck,
    lastUpdated: "2 weeks ago",
    status: "Active",
  },
];

const CMSManagement = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">CMS Management</h1>
        <p className="text-gray-600 mt-1">Manage your platform's content, policies, and commissions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cmsSections.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.id}
              onClick={() => navigate(`/admin/cms/${section.id}`)}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  section.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {section.status}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {section.title}
              </h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                {section.description}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <span className="text-xs text-gray-400">Updated {section.lastUpdated}</span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CMSManagement;