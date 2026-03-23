import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Plus, Edit2, Trash2, X, CheckCircle, AlertCircle } from "lucide-react";

// --- Types ---
interface Commission {
  id: number;
  name: string;
  type: "Percentage" | "Flat";
  value: number;
  vehicle: "2 Wheeler" | "3 Wheeler" | "Pickup" | "Truck" | "All";
  status: "Active" | "Inactive";
}

// --- Mock Data ---
const initialCommissions: Commission[] = [
  { id: 1, name: "Standard Bike Commission", type: "Percentage", value: 15, vehicle: "2 Wheeler", status: "Active" },
  { id: 2, name: "Heavy Truck Flat Fee", type: "Flat", value: 500, vehicle: "Truck", status: "Active" },
  { id: 3, name: "Auto Rickshaw Promo", type: "Percentage", value: 10, vehicle: "3 Wheeler", status: "Inactive" },
];

// --- Components ---

const CommissionManagement = () => {
  const [commissions, setCommissions] = useState<Commission[]>(initialCommissions);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCommission, setCurrentCommission] = useState<Partial<Commission>>({});
  const [isEditing, setIsEditing] = useState(false);

  const handleAdd = () => {
    setCurrentCommission({ type: "Percentage", vehicle: "All", status: "Active" });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEdit = (commission: Commission) => {
    setCurrentCommission(commission);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this commission rule?")) {
      setCommissions(commissions.filter(c => c.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && currentCommission.id) {
      setCommissions(commissions.map(c => c.id === currentCommission.id ? currentCommission as Commission : c));
    } else {
      setCommissions([...commissions, { ...currentCommission, id: Date.now() } as Commission]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Commission Rules</h2>
        <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Commission
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Name</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Type</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Value</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Vehicle</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {commissions.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                <td className="px-6 py-4 text-gray-600">{c.type}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{c.type === 'Percentage' ? `${c.value}%` : `₹${c.value}`}</td>
                <td className="px-6 py-4 text-gray-600">{c.vehicle}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${c.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <button onClick={() => handleEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">{isEditing ? 'Edit Commission' : 'Add Commission'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission Name</label>
                <input type="text" required value={currentCommission.name || ''} onChange={e => setCurrentCommission({...currentCommission, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Bike Standard" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={currentCommission.type} onChange={e => setCurrentCommission({...currentCommission, type: e.target.value as any})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="Percentage">Percentage</option>
                    <option value="Flat">Flat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                  <input type="number" required value={currentCommission.value || ''} onChange={e => setCurrentCommission({...currentCommission, value: e.target.value === '' ? '' as any : Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                  <select value={currentCommission.vehicle} onChange={e => setCurrentCommission({...currentCommission, vehicle: e.target.value as any})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="All">All</option>
                    <option value="2 Wheeler">2 Wheeler</option>
                    <option value="3 Wheeler">3 Wheeler</option>
                    <option value="Pickup">Pickup</option>
                    <option value="Truck">Truck</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={currentCommission.status} onChange={e => setCurrentCommission({...currentCommission, status: e.target.value as any})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const TermsConditions = () => {
  const [section, setSection] = useState<'User' | 'LSP'>('User');
  const [content, setContent] = useState("1. Introduction\nWelcome to Movezy. These Terms and Conditions govern your use of our website and services.\n\n2. User Accounts\nYou must create an account to use our services. You are responsible for maintaining the confidentiality of your account.\n\n3. Services\nWe provide logistics and delivery services connecting users with delivery partners.");

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="border-b border-gray-100 p-4 flex items-center justify-between bg-gray-50">
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
          {['User', 'LSP'].map((s) => (
            <button
              key={s}
              onClick={() => setSection(s as any)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${section === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {s} Terms
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">Last updated: 10 Jan 2026</span>
      </div>
      <div className="p-6">
        <textarea
          className="w-full h-96 p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm leading-relaxed resize-none"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter terms and conditions here..."
        />
        <div className="flex justify-end mt-4 gap-3">
          <button className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Preview</button>
          <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const PrivacyPolicy = () => {
  const [status, setStatus] = useState<'Draft' | 'Published'>('Published');
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {status === 'Published' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {status}
          </span>
          <span className="text-sm text-gray-500">Last updated: 08 Jan 2026</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value as any)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
          </select>
        </div>
      </div>
      
      <textarea
        className="w-full h-[500px] p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm leading-relaxed"
        defaultValue={`# Privacy Policy\n\nAt Movezy, accessible from movezy.com, one of our main priorities is the privacy of our visitors.\n\n## Information We Collect\n\nWe collect information you provide directly to us, such as when you create an account, update your profile, request customer support, or otherwise communicate with us.\n\n## How We Use Your Information\n\nWe use the information we collect to provide, maintain, and improve our services.`}
      />
      
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Save className="w-4 h-4" /> Update Policy
        </button>
      </div>
    </div>
  );
};

const RefundPolicy = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Eligible Refunds</h3>
        <textarea 
          className="w-full h-32 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          defaultValue="- Orders cancelled within 5 minutes of booking.\n- Driver did not arrive at pickup location.\n- Accidental double payment."
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Non-Refundable Cases</h3>
        <textarea 
          className="w-full h-32 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          defaultValue="- Cancellation after driver has arrived.\n- Goods prohibited by law.\n- User unavailable at drop location."
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Refund Timeline</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wallet Refunds</label>
            <input type="text" defaultValue="Instant" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Refunds</label>
            <input type="text" defaultValue="5-7 Business Days" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Save className="w-4 h-4" /> Save Refund Policy
        </button>
      </div>
    </div>
  );
};

const DeliveryPolicy = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">General Delivery Rules</h3>
        <textarea 
          className="w-full h-32 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          defaultValue="All deliveries must be completed within the estimated time window. Drivers must verify recipient identity for high-value goods."
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Vehicle-wise Restrictions</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <span className="font-medium w-24">Bike</span>
            <input type="text" defaultValue="Max 20kg, No hazardous materials" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <span className="font-medium w-24">Truck</span>
            <input type="text" defaultValue="Max 4000kg, Permit required for city entry during day" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Intracity Policy</h3>
          <textarea 
            className="w-full h-32 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            defaultValue="Same-day delivery guaranteed for orders before 2 PM."
          />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Intercity Policy</h3>
          <textarea 
            className="w-full h-32 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            defaultValue="Standard delivery 2-3 days. Express options available."
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Save className="w-4 h-4" /> Save Delivery Policy
        </button>
      </div>
    </div>
  );
};

const CMSEdit = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const getTitle = (slugStr: string | undefined) => {
    if (!slugStr) return "CMS Content";
    return slugStr
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const renderContent = () => {
    switch (slug) {
      case "commission-management":
        return <CommissionManagement />;
      case "terms-and-conditions":
        return <TermsConditions />;
      case "privacy-policy":
        return <PrivacyPolicy />;
      case "refund-policy":
        return <RefundPolicy />;
      case "delivery-policy":
        return <DeliveryPolicy />;
      default:
        return <div className="text-center py-10 text-gray-500">Content not found</div>;
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <button 
          onClick={() => navigate("/admin/cms")} 
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{getTitle(slug)}</h1>
          <p className="text-sm text-gray-500">Manage content and settings for this section</p>
        </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default CMSEdit;