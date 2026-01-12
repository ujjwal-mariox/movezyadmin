import React, { useState } from 'react';
import { 
  Search, Filter, Eye, MapPin, Package, Truck, Calendar, 
  DollarSign, MoreVertical, CheckCircle, XCircle, Clock, 
  AlertCircle, Navigation, Bike, Map as MapIcon, X
} from 'lucide-react';

interface Order {
  id: string;
  customerName: string;
  pickup: string;
  dropoff: string;
  amount: number;
  status: 'Pending' | 'Assigned' | 'In Transit' | 'Delivered' | 'Cancelled';
  vehicle: 'Bike' | '3 Wheeler' | 'Tata Ace' | 'Pickup 8ft' | 'Truck';
  goodsType: string;
  date: string;
  rider?: string;
  distance: string;
}

const initialOrders: Order[] = [
  {
    id: 'ORD-7829',
    customerName: 'Rahul Kumar',
    pickup: 'Andheri East, Mumbai, MH',
    dropoff: 'Bandra West, Mumbai, MH',
    amount: 450,
    status: 'In Transit',
    vehicle: 'Tata Ace',
    goodsType: 'Furniture',
    date: '2024-03-15 10:30 AM',
    rider: 'Vikram Singh',
    distance: '12.5 km'
  },
  {
    id: 'ORD-7830',
    customerName: 'Priya Sharma',
    pickup: 'Koramangala, Bangalore, KA',
    dropoff: 'Indiranagar, Bangalore, KA',
    amount: 120,
    status: 'Pending',
    vehicle: 'Bike',
    goodsType: 'Documents',
    date: '2024-03-15 11:15 AM',
    distance: '5.2 km'
  },
  {
    id: 'ORD-7831',
    customerName: 'Amit Patel',
    pickup: 'Connaught Place, Delhi',
    dropoff: 'Noida Sector 62, UP',
    amount: 1200,
    status: 'Assigned',
    vehicle: 'Pickup 8ft',
    goodsType: 'Electronics',
    date: '2024-03-15 09:45 AM',
    rider: 'Rajesh Kumar',
    distance: '28 km'
  },
  {
    id: 'ORD-7825',
    customerName: 'Sneha Gupta',
    pickup: 'Hitech City, Hyderabad',
    dropoff: 'Jubilee Hills, Hyderabad',
    amount: 850,
    status: 'Delivered',
    vehicle: '3 Wheeler',
    goodsType: 'Textiles',
    date: '2024-03-14 04:20 PM',
    rider: 'Mohd. Irfan',
    distance: '8.5 km'
  },
  {
    id: 'ORD-7820',
    customerName: 'John Doe',
    pickup: 'Whitefield, Bangalore',
    dropoff: 'Electronic City, Bangalore',
    amount: 2500,
    status: 'Cancelled',
    vehicle: 'Truck',
    goodsType: 'Industrial Machinery',
    date: '2024-03-14 02:00 PM',
    distance: '35 km'
  }
];

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Stats
  const stats = {
    total: orders.length,
    active: orders.filter(o => ['Pending', 'Assigned', 'In Transit'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'Delivered').length,
    revenue: orders.filter(o => o.status !== 'Cancelled').reduce((acc, curr) => acc + curr.amount, 0)
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      case 'In Transit': return 'bg-blue-100 text-blue-800';
      case 'Assigned': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'Bike': return <Bike className="w-4 h-4" />;
      case 'Truck': return <Truck className="w-4 h-4" />;
      default: return <Truck className="w-4 h-4" />; // Fallback for others
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">{stats.total}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Orders</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">{stats.active}</h3>
            </div>
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">{stats.completed}</h3>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">₹{stats.revenue.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search Order ID or Customer..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-movezy-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-movezy-500 bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Assigned">Assigned</option>
            <option value="In Transit">In Transit</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Route</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Vehicle</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{order.id}</div>
                    <div className="text-xs text-gray-500">{order.date}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="truncate max-w-[150px]" title={order.pickup}>{order.pickup}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="truncate max-w-[150px]" title={order.dropoff}>{order.dropoff}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gray-100 rounded-lg">
                        {getVehicleIcon(order.vehicle)}
                      </div>
                      <span className="text-sm text-gray-700">{order.vehicle}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">₹{order.amount}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedOrder(order)}
                      className="text-movezy-600 hover:text-movezy-700 font-medium text-sm"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
                <p className="text-sm text-gray-500">{selectedOrder.id}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Customer</label>
                  <p className="font-medium text-gray-900">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Goods Type</label>
                  <p className="font-medium text-gray-900">{selectedOrder.goodsType}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Distance</label>
                  <p className="font-medium text-gray-900">{selectedOrder.distance}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Rider</label>
                  <p className="font-medium text-gray-900">{selectedOrder.rider || 'Not Assigned'}</p>
                </div>
              </div>

              <div className="bg-gray-100 rounded-xl h-48 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center" />
                <div className="text-center relative z-10">
                  <MapIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Live Tracking Map</p>
                  <p className="text-xs text-gray-400">(Mock View)</p>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <div className="w-3 h-3 rounded-full bg-green-500 ring-4 ring-green-100"></div>
                    <div className="w-0.5 h-10 bg-gray-200 mx-auto my-1"></div>
                    <div className="w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-100"></div>
                  </div>
                  <div className="flex-1 space-y-6">
                    <div>
                      <p className="text-xs text-gray-500">Pickup Location</p>
                      <p className="text-sm font-medium text-gray-900">{selectedOrder.pickup}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Dropoff Location</p>
                      <p className="text-sm font-medium text-gray-900">{selectedOrder.dropoff}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
