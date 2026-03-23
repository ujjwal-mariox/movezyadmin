import React, { useState } from 'react';
import { Plus, Edit, Trash2, Bike, Truck } from 'lucide-react';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';

// --- Reusable UI Components ---

const Badge = ({ children, colorClass }: { children: React.ReactNode, colorClass: string }) => (
  <span className={`px-3 py-1 text-xs font-medium rounded-full ${colorClass}`}>
    {children}
  </span>
);

const ToggleSwitch = ({ enabled, setEnabled }: { enabled: boolean, setEnabled: (enabled: boolean) => void }) => (
    <button
      type="button"
      className={`${
        enabled ? 'bg-indigo-600' : 'bg-gray-200'
      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
      onClick={() => setEnabled(!enabled)}
    >
      <span
        className={`${
          enabled ? 'translate-x-5' : 'translate-x-0'
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
);

// --- Main Component ---

const dummyCommissions = [
  { id: 1, name: 'Standard Delivery Fee', type: 'Percentage', value: 15, vehicleType: '2 Wheeler', status: 'Active' },
  { id: 2, name: 'Heavy Goods Surcharge', type: 'Flat', value: 500, vehicleType: 'Truck', status: 'Active' },
  { id: 3, name: 'Intercity Premium', type: 'Percentage', value: 25, vehicleType: '3 Wheeler', status: 'Inactive' },
  { id: 4, name: 'Express Bike Fee', type: 'Flat', value: 50, vehicleType: '2 Wheeler', status: 'Active' },
];

const CommissionManagement = () => {
  const [commissions, setCommissions] = useState(dummyCommissions);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formState, setFormState] = useState({ name: '', type: 'Percentage', value: '', vehicleType: '2 Wheeler', status: true });

  const {
    paginatedData: paginatedCommissions,
    currentPage,
    totalPages,
    setCurrentPage,
    totalItems,
    startIndex,
    endIndex,
    pageSize,
    setPageSize,
  } = usePagination(commissions, 10);

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setFormState({ name: '', type: 'Percentage', value: '', vehicleType: '2 Wheeler', status: true });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (commission: any) => {
    setIsEditing(true);
    setSelectedCommission(commission);
    setFormState({
      name: commission.name,
      type: commission.type,
      value: commission.value,
      vehicleType: commission.vehicleType,
      status: commission.status === 'Active',
    });
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteModal = (commission: any) => {
    setSelectedCommission(commission);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = () => {
    setCommissions(commissions.filter(c => c.id !== selectedCommission.id));
    setIsDeleteModalOpen(false);
    setSelectedCommission(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd handle form submission to a backend here.
    setIsFormModalOpen(false);
  };

  const getVehicleIcon = (vehicleType: string) => {
    if (vehicleType === '2 Wheeler') return <Bike className="w-5 h-5 text-blue-500" />;
    if (vehicleType === '3 Wheeler') return <Truck className="w-5 h-5 text-yellow-500" />;
    if (vehicleType === 'Pickup') return <Truck className="w-5 h-5 text-green-500" />;
    if (vehicleType === 'Truck') return <Truck className="w-5 h-5 text-red-500" />;
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Commission Settings</h2>
        <button onClick={handleOpenAddModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm hover:shadow-lg">
          <Plus className="w-4 h-4" />
          Add Commission
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3">Commission Name</th>
              <th scope="col" className="px-6 py-3">Type</th>
              <th scope="col" className="px-6 py-3">Value</th>
              <th scope="col" className="px-6 py-3">Vehicle Type</th>
              <th scope="col" className="px-6 py-3">Status</th>
              <th scope="col" className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCommissions.map((item) => (
              <tr key={item.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                <td className="px-6 py-4">{item.type}</td>
                <td className="px-6 py-4">{item.type === 'Percentage' ? `${item.value}%` : `₹${item.value}`}</td>
                <td className="px-6 py-4"><div className="flex items-center gap-2">{getVehicleIcon(item.vehicleType)}<span>{item.vehicleType}</span></div></td>
                <td className="px-6 py-4"><Badge colorClass={item.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{item.status}</Badge></td>
                <td className="px-6 py-4 text-right space-x-1">
                  <button onClick={() => handleOpenEditModal(item)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleOpenDeleteModal(item)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={totalItems}
        startIndex={startIndex}
        endIndex={endIndex}
        itemLabel="commissions"
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />

      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-300">
            <form onSubmit={handleFormSubmit}>
              <div className="p-6 border-b"><h3 className="text-lg font-semibold">{isEditing ? 'Edit Commission' : 'Add New Commission'}</h3></div>
              <div className="p-6 space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Commission Name</label><input type="text" name="name" value={formState.name} onChange={handleFormChange} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition" required /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label><select name="type" value={formState.type} onChange={handleFormChange} className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition"><option>Percentage</option><option>Flat</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Value</label><input type="number" name="value" value={formState.value} onChange={handleFormChange} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition" required /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label><select name="vehicleType" value={formState.vehicleType} onChange={handleFormChange} className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition"><option>2 Wheeler</option><option>3 Wheeler</option><option>Pickup</option><option>Truck</option></select></div>
                <div className="flex items-center justify-between pt-2"><label className="block text-sm font-medium text-gray-700">Status</label><ToggleSwitch enabled={formState.status} setEnabled={(val) => setFormState(p => ({...p, status: val}))} /></div>
              </div>
              <div className="p-4 bg-gray-50 rounded-b-xl flex justify-end gap-3"><button type="button" onClick={() => setIsFormModalOpen(false)} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium transition-colors">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium transition-colors">{isEditing ? 'Save Changes' : 'Add Commission'}</button></div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><Trash2 className="w-6 h-6 text-red-600" /></div>
              <h3 className="text-lg font-semibold">Delete Commission</h3>
              <p className="text-sm text-gray-500 mt-2">Are you sure you want to delete "{selectedCommission?.name}"? This action cannot be undone.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-b-xl flex justify-center gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium transition-colors">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionManagement;