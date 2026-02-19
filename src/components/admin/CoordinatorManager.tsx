import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase, Profile, Event } from '../../lib/supabase';
import { Plus, Trash2, X, Loader, UserPlus, Link2 } from 'lucide-react';

interface CoordinatorWithAssignments extends Profile {
  assignments: { id: string; event_id: string; event_title: string }[];
}

export function CoordinatorManager() {
  const [coordinators, setCoordinators] = useState<CoordinatorWithAssignments[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [createForm, setCreateForm] = useState({ email: '', password: '', full_name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      // Fetch coordinators
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'coordinator')
        .order('full_name');

      // Fetch events
      const { data: evts } = await supabase
        .from('events')
        .select('*')
        .order('title');

      // Fetch all assignments
      const { data: assignments } = await supabase
        .from('coordinator_assignments')
        .select('*');

      setEvents(evts || []);

      // Map assignments to coordinators
      const coordsWithAssignments: CoordinatorWithAssignments[] = (profiles || []).map(p => ({
        ...p,
        assignments: (assignments || [])
          .filter(a => a.coordinator_id === p.id)
          .map(a => ({
            id: a.id,
            event_id: a.event_id,
            event_title: (evts || []).find(e => e.id === a.event_id)?.title || 'Unknown Event',
          })),
      }));

      setCoordinators(coordsWithAssignments);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.email || !createForm.password || !createForm.full_name) {
      setError('Email, password, and name are required');
      return;
    }
    if (createForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    setError('');
    try {
      // Use a throwaway Supabase client so the admin's session isn't replaced
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      const { data, error: signUpError } = await tempClient.auth.signUp({
        email: createForm.email,
        password: createForm.password,
        options: {
          data: {
            role: 'coordinator',
            full_name: createForm.full_name,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error('User creation failed');

      // Update phone if provided (trigger already created the profile)
      if (createForm.phone) {
        // Small delay for the trigger to finish creating the profile row
        await new Promise(r => setTimeout(r, 800));
        await supabase
          .from('profiles')
          .update({ phone: createForm.phone })
          .eq('id', data.user.id);
      }

      setShowCreateForm(false);
      setCreateForm({ email: '', password: '', full_name: '', phone: '' });
      // Wait for trigger to finish then refresh list
      setTimeout(() => fetchData(), 1500);
      alert('Coordinator created successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to create coordinator');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (coordinatorId: string) => {
    if (!selectedEventId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('coordinator_assignments').insert({
        coordinator_id: coordinatorId,
        event_id: selectedEventId,
      });
      if (error) throw error;
      setShowAssignForm(null);
      setSelectedEventId('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to assign');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Remove this assignment?')) return;
    await supabase.from('coordinator_assignments').delete().eq('id', assignmentId);
    fetchData();
  };

  const handleDeleteCoordinator = async (id: string) => {
    if (!confirm('Delete this coordinator? Their account will be removed.')) return;
    try {
      // Delete profile (cascade will handle assignments)
      await supabase.from('profiles').delete().eq('id', id);
      fetchData();
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    }
  };

  if (loading) return <div className="text-center py-8"><Loader className="animate-spin text-indigo-600 mx-auto" size={32} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Coordinators ({coordinators.length})</h2>
        <button onClick={() => { setShowCreateForm(true); setError(''); }} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <UserPlus size={16} className="mr-1" /> Add Coordinator
        </button>
      </div>

      {coordinators.length === 0 ? (
        <div className="text-center py-12 card">
          <UserPlus className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No coordinators yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {coordinators.map(coord => (
            <div key={coord.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{coord.full_name}</h3>
                  <p className="text-sm text-gray-500">{coord.email} {coord.phone && ` · ${coord.phone}`}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowAssignForm(coord.id); setSelectedEventId(''); }}
                    className="text-xs px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full font-medium hover:bg-indigo-100"
                  >
                    <Link2 size={12} className="inline mr-1" /> Assign Event
                  </button>
                  <button onClick={() => handleDeleteCoordinator(coord.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Assignments */}
              {coord.assignments.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {coord.assignments.map(a => (
                    <span key={a.id} className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      {a.event_title}
                      <button onClick={() => handleRemoveAssignment(a.id)} className="ml-1.5 text-red-400 hover:text-red-600">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No events assigned</p>
              )}

              {/* Inline assign form */}
              {showAssignForm === coord.id && (
                <div className="mt-3 flex gap-2 items-center border-t pt-3">
                  <select
                    value={selectedEventId}
                    onChange={e => setSelectedEventId(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select an event...</option>
                    {events
                      .filter(e => !coord.assignments.some(a => a.event_id === e.id))
                      .map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                  <button
                    onClick={() => handleAssign(coord.id)}
                    disabled={!selectedEventId || saving}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm disabled:bg-indigo-300"
                  >
                    Assign
                  </button>
                  <button onClick={() => setShowAssignForm(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create coordinator modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">New Coordinator</h3>
              <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input type="text" value={createForm.full_name} onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Min 6 characters" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowCreateForm(false)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-300">
                  {saving ? 'Creating...' : 'Create Coordinator'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
