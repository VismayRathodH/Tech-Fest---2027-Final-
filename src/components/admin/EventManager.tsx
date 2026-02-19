import { useState, useEffect } from 'react';
import { supabase, Event, Department } from '../../lib/supabase';
import { Plus, Edit, Trash2, X, Loader, Calendar } from 'lucide-react';

export function EventManager() {
  const [events, setEvents] = useState<Event[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', event_date: '', event_time: '', location: '',
    category: '', image_url: '', max_attendees: '', status: 'upcoming' as string,
    department_id: '', registration_fee: '0',
    allow_single: true, allow_double: false, allow_triple: false, allow_quad: false,
    allow_group: false, max_team_size: '10',
    qr_code_url: '', upi_id: '', payment_instructions: '',
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [evtRes, deptRes] = await Promise.all([
      supabase.from('events').select('*').order('event_date', { ascending: false }),
      supabase.from('departments').select('*').order('name'),
    ]);
    setEvents(evtRes.data || []);
    setDepartments(deptRes.data || []);
    setLoading(false);
  };

  const getDeptName = (id: string | null) => departments.find(d => d.id === id)?.name || '—';

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: '', description: '', event_date: '', event_time: '', location: '',
      category: '', image_url: '', max_attendees: '', status: 'upcoming',
      department_id: departments[0]?.id || '', registration_fee: '0',
      allow_single: true, allow_double: false, allow_triple: false, allow_quad: false,
      allow_group: false, max_team_size: '10',
      qr_code_url: '', upi_id: '', payment_instructions: '',
    });
    setShowForm(true);
    setError('');
  };

  const openEdit = (evt: Event) => {
    setEditing(evt);
    setForm({
      title: evt.title, description: evt.description, event_date: evt.event_date,
      event_time: evt.event_time, location: evt.location, category: evt.category,
      image_url: evt.image_url || '', max_attendees: evt.max_attendees?.toString() || '',
      status: evt.status, department_id: evt.department_id || '',
      registration_fee: evt.registration_fee?.toString() || '0',
      allow_single: evt.allow_single ?? true, allow_double: evt.allow_double ?? false,
      allow_triple: evt.allow_triple ?? false, allow_quad: evt.allow_quad ?? false,
      allow_group: evt.allow_group ?? false, max_team_size: evt.max_team_size?.toString() || '10',
      qr_code_url: evt.qr_code_url || '', upi_id: evt.upi_id || '',
      payment_instructions: evt.payment_instructions || '',
    });
    setShowForm(true);
    setError('');
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.event_date || !form.event_time || !form.location.trim() || !form.category.trim()) {
      setError('Title, date, time, location, and category are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title, description: form.description, event_date: form.event_date,
        event_time: form.event_time, location: form.location, category: form.category,
        image_url: form.image_url, max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
        status: form.status, department_id: form.department_id || null,
        registration_fee: parseFloat(form.registration_fee) || 0,
        allow_single: form.allow_single, allow_double: form.allow_double,
        allow_triple: form.allow_triple, allow_quad: form.allow_quad,
        allow_group: form.allow_group, max_team_size: parseInt(form.max_team_size) || 10,
        qr_code_url: form.qr_code_url, upi_id: form.upi_id,
        payment_instructions: form.payment_instructions,
      };

      if (editing) {
        const { error } = await supabase.from('events').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('events').insert(payload);
        if (error) throw error;
      }
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event? All registrations will also be deleted.')) return;
    await supabase.from('events').delete().eq('id', id);
    fetchData();
  };

  if (loading) return <div className="text-center py-8"><Loader className="animate-spin text-indigo-600 mx-auto" size={32} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Events ({events.length})</h2>
        <button onClick={openCreate} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus size={16} className="mr-1" /> Add Event
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Title</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Department</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Date</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Fee</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Attendees</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase text-xs">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {events.map(evt => (
              <tr key={evt.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{evt.title}</td>
                <td className="px-4 py-3 text-gray-600">{getDeptName(evt.department_id)}</td>
                <td className="px-4 py-3 text-gray-600">{new Date(evt.event_date).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-gray-600">₹{evt.registration_fee || 0}</td>
                <td className="px-4 py-3 text-gray-600">{evt.current_attendees}{evt.max_attendees ? ` / ${evt.max_attendees}` : ''}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                    evt.status === 'upcoming' ? 'bg-green-100 text-green-700' :
                    evt.status === 'ongoing' ? 'bg-yellow-100 text-yellow-700' :
                    evt.status === 'completed' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'
                  }`}>{evt.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(evt)} className="text-indigo-600 hover:text-indigo-800 mr-3"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(evt.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Modal — Full-screen slide-up panel */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowForm(false)}>
          <div
            className="bg-white w-full sm:max-w-4xl sm:mx-4 sm:rounded-2xl rounded-t-2xl max-h-[95vh] flex flex-col animate-fadeIn"
            onClick={e => e.stopPropagation()}
          >
            {/* Sticky header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editing ? 'Edit Event' : 'Create Event'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="form-label">Title *</label>
                  <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Event title" />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="form-label">Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} placeholder="Brief description..." />
                </div>
                <div>
                  <label className="form-label">Department</label>
                  <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })} className="input-field">
                    <option value="">No Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Category *</label>
                  <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-field" placeholder="Workshop, Hackathon..." />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input-field">
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Date *</label>
                  <input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="form-label">Time *</label>
                  <input type="time" value={form.event_time} onChange={e => setForm({ ...form, event_time: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="form-label">Location *</label>
                  <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="input-field" placeholder="Venue" />
                </div>
                <div>
                  <label className="form-label">Max Attendees</label>
                  <input type="number" value={form.max_attendees} onChange={e => setForm({ ...form, max_attendees: e.target.value })} className="input-field" placeholder="Unlimited" />
                </div>
                <div>
                  <label className="form-label">Registration Fee (₹)</label>
                  <input type="number" value={form.registration_fee} onChange={e => setForm({ ...form, registration_fee: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="form-label">Image URL</label>
                  <input type="url" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} className="input-field" placeholder="https://..." />
                </div>
                <div>
                  <label className="form-label">Max Team Size</label>
                  <input type="number" value={form.max_team_size} onChange={e => setForm({ ...form, max_team_size: e.target.value })} className="input-field" min={2} />
                </div>
              </div>

              {/* Participation types */}
              <div className="mt-5">
                <label className="form-label mb-2">Allowed Participation Types</label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { key: 'allow_single', label: 'Solo' },
                    { key: 'allow_double', label: 'Duo' },
                    { key: 'allow_triple', label: 'Trio' },
                    { key: 'allow_quad', label: 'Quad' },
                    { key: 'allow_group', label: 'Group' },
                  ].map(({ key, label }) => (
                    <label key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      (form as any)[key] ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                      <input type="checkbox" checked={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })} className="rounded text-indigo-600" />
                      <span className="text-sm font-medium">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment settings */}
              <div className="mt-5 border-t border-gray-200 pt-5">
                <h4 className="text-sm font-bold text-gray-700 mb-3">Payment Settings</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">QR Code Image URL</label>
                    <input type="url" value={form.qr_code_url} onChange={e => setForm({ ...form, qr_code_url: e.target.value })} className="input-field" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="form-label">UPI ID</label>
                    <input type="text" value={form.upi_id} onChange={e => setForm({ ...form, upi_id: e.target.value })} className="input-field" placeholder="example@upi" />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="form-label">Payment Instructions</label>
                    <textarea value={form.payment_instructions} onChange={e => setForm({ ...form, payment_instructions: e.target.value })} className="input-field" rows={2} placeholder="Instructions..." />
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
            </div>

            {/* Sticky footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-gray-50 sm:rounded-b-2xl">
              <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors">
                {saving ? 'Saving...' : 'Save Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
