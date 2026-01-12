import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, CreditCard, Package, Shield } from 'lucide-react';

const UserDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock data - in a real app this would come from an API based on 'id'
  const user = {
    id: Number(id) || 1,
    name: 'Sarah Wilson',
    email: 'sarah.wilson@example.com',
    mobile: '+91 98765 43210',
    address: '123 Johnson Ave, New York, NY 10012',
    role: 'Admin',
    status: 'Active',
    walletBalance: 2450.00,
    joinedDate: '2024-01-15',
    bookingCount: 12,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
  };

  const bookings = [
    { id: 'BK001', pickup: 'Central Park', dropoff: 'Times Square', fare: 250, status: 'Completed', date: '2024-03-10' },
    { id: 'BK002', pickup: 'JFK Airport', dropoff: 'Brooklyn', fare: 850, status: 'Completed', date: '2024-03-08' },
    { id: 'BK003', pickup: 'Manhattan', dropoff: 'Queens', fare: 420, status: 'Cancelled', date: '2024-03-05' },
  ];

  const payments = [
    { id: 'TXN001', bookingId: 'BK001', amount: 250, method: 'Credit Card', status: 'Success', date: '2024-03-10' },
    { id: 'TXN002', bookingId: 'BK002', amount: 850, method: 'Wallet', status: 'Success', date: '2024-03-08' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/admin/users')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
          <p className="text-gray-500">View and manage user information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <img 
                src={user.avatar} 
                alt={user.name} 
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-50 mb-4"
              />
              <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
              <span className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {user.status}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-sm">{user.email}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Phone className="w-5 h-5 text-gray-400" />
                <span className="text-sm">{user.mobile}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <MapPin className="w-5 h-5 text-gray-400" />
                <span className="text-sm">{user.address}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Shield className="w-5 h-5 text-gray-400" />
                <span className="text-sm">{user.role}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-sm">Joined {user.joinedDate}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Wallet Balance</span>
                <span className="text-lg font-bold text-gray-900">₹{user.walletBalance}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total Bookings</span>
                <span className="text-lg font-bold text-gray-900">{user.bookingCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Tabs/Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Bookings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-movezy-600" />
                Recent Bookings
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 font-medium text-gray-500">ID</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Route</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Date</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Fare</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{booking.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-gray-900">{booking.pickup}</span>
                          <span className="text-gray-400 text-xs">to</span>
                          <span className="text-gray-900">{booking.dropoff}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{booking.date}</td>
                      <td className="px-6 py-4 font-medium">₹{booking.fare}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                          booking.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-movezy-600" />
                Payment History
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 font-medium text-gray-500">Transaction ID</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Booking ID</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Date</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Amount</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Method</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{payment.id}</td>
                      <td className="px-6 py-4 text-gray-600">{payment.bookingId}</td>
                      <td className="px-6 py-4 text-gray-500">{payment.date}</td>
                      <td className="px-6 py-4 font-medium">₹{payment.amount}</td>
                      <td className="px-6 py-4 text-gray-500">{payment.method}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payment.status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetail;