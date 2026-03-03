import { useState, useEffect } from 'react';
import { supabase, Department } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { Plus, Edit, Trash2, Loader, X, IndianRupee } from 'lucide-react';

export function DepartmentManager() {
  const { profile } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', image_url: '', is_active: true, manual_adjustment: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchDepartments(); }, []);

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('*').order('name');
    setDepartments(data || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '', description: '', image_url: '', is_active: true, manual_adjustment: 0 });
    setShowForm(true);
    setError('');
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setForm({
      name: dept.name,
      code: dept.code,
      description: dept.description,
      image_url: dept.image_url,
      is_active: dept.is_active,
      manual_adjustment: dept.manual_adjustment || 0
    });
    setShowForm(true);
    setError('');
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setError('Name and code are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const { error } = await supabase.from('departments').update({
          name: form.name, code: form.code.toUpperCase(), description: form.description,
          image_url: form.image_url, is_active: form.is_active,
          manual_adjustment: form.manual_adjustment,
        }).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('departments').insert({
          name: form.name, code: form.code.toUpperCase(), description: form.description,
          image_url: form.image_url, is_active: form.is_active,
          manual_adjustment: form.manual_adjustment,
        });
        if (error) throw error;
      }
      setShowForm(false);
      fetchDepartments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this department? Events linked to it will lose their department reference.')) return;
    await supabase.from('departments').delete().eq('id', id);
    fetchDepartments();
  };

  if (loading) return <div className="text-center py-8"><Loader className="animate-spin text-indigo-600 mx-auto" size={32} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Departments ({departments.length})</h2>
        <button onClick={openCreate} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus size={16} className="mr-1" /> Add Department
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Code</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Adjustment</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase text-xs">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {departments.map(dept => (
              <tr key={dept.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-bold text-indigo-600">{dept.code}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{dept.name}</td>
                <td className="px-4 py-3 text-gray-600 font-medium">
                  {dept.manual_adjustment ? (
                    <span className={dept.manual_adjustment > 0 ? 'text-green-600' : 'text-red-600'}>
                      {dept.manual_adjustment > 0 ? '+' : ''}₹{dept.manual_adjustment}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${dept.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {dept.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(dept)} className="text-indigo-600 hover:text-indigo-800 mr-3"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(dept.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editing ? 'Edit Department' : 'New Department'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Information Technology" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code * (e.g. IT, CE)</label>
                <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg uppercase" placeholder="IT" maxLength={5} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input type="url" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="https://..." />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                <span className="text-sm text-gray-700">Active</span>
              </label>

              {profile?.role === 'master_admin' && (
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-xs font-bold text-indigo-600 uppercase mb-2 flex items-center">
                    <IndianRupee size={12} className="mr-1" /> Manual Revenue Adjustment (Master Admin Only)
                  </label>
                  <p className="text-[10px] text-gray-500 mb-2">This manually adds or subtracts from the department's total revenue. Use negative values to subtract.</p>
                  <input
                    type="number"
                    value={form.manual_adjustment}
                    onChange={e => setForm({ ...form, manual_adjustment: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm bg-indigo-50 focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 5000 or -2000"
                  />
                </div>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-300">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
