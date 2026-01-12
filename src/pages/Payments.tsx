import React, { useState } from 'react';
import { 
  Download, Search, CheckCircle, Clock, DollarSign 
} from 'lucide-react';

interface Payment {
  id: string;
  bookingId: string;
  user: string;
  amount: number;
  method: string;
  status: 'Completed' | 'Pending' | 'Failed';
  date: string;
  type: 'customer' | 'rider';
}

const initialPayments: Payment[] = [
  { id: 'PAY-001', bookingId: 'ORD-7829', user: 'Rahul Kumar', amount: 450, method: 'UPI', status: 'Completed', date: '2024-03-15', type: 'customer' },
  { id: 'PAY-002', bookingId: 'ORD-7830', user: 'Priya Sharma', amount: 120, method: 'Cash', status: 'Pending', date: '2024-03-15', type: 'customer' },
  { id: 'PAY-003', bookingId: 'ORD-7831', user: 'Vikram Singh', amount: 850, method: 'Bank Transfer', status: 'Completed', date: '2024-03-14', type: 'rider' },
  { id: 'PAY-004', bookingId: 'ORD-7825', user: 'Sneha Gupta', amount: 250, method: 'Wallet', status: 'Failed', date: '2024-03-13', type: 'customer' },
  { id: 'PAY-005', bookingId: 'ORD-7820', user: 'Rajesh Kumar', amount: 1200, method: 'Bank Transfer', status: 'Pending', date: '2024-03-12', type: 'rider' },
  { id: 'PAY-006', bookingId: 'ORD-7818', user: 'Amit Patel', amount: 550, method: 'Credit Card', status: 'Completed', date: '2024-03-11', type: 'customer' },
];

const Payments: React.FC = () => {
  const [paymentType, setPaymentType] = useState<'customer' | 'rider'>('customer');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPayments = initialPayments.filter(payment => {
    const matchesType = payment.type === paymentType;
    const matchesStatus = statusFilter === 'All' || payment.status === statusFilter;
    const matchesSearch = payment.user.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          payment.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const completedCount = filteredPayments.filter(p => p.status === 'Completed').length;
  const pendingCount = filteredPayments.filter(p => p.status === 'Pending').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-4">
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors bg-white shadow-sm">
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Export Report</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Amount</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">₹{totalAmount.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{completedCount}</h3>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{pendingCount}</h3>
            </div>
            <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Tabs */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex p-1 bg-gray-100 rounded-xl">
          <button
            onClick={() => setPaymentType('customer')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              paymentType === 'customer'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Customer Payments
          </button>
          <button
            onClick={() => setPaymentType('rider')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              paymentType === 'rider'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Rider Payouts
          </button>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by ID or Name..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-movezy-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-movezy-500 bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Payment ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Booking ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Method</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{payment.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{payment.bookingId}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{payment.user}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">₹{payment.amount}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{payment.method}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      payment.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      payment.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{payment.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Payments;