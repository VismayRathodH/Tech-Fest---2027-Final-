import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase, Event, Registration } from '../lib/supabase';
import {
  Calendar, Users, CheckCircle, XCircle, Eye, Loader,
  ChevronDown, ChevronUp, ImageIcon, Clock, User, Mail, Phone, Hash
} from 'lucide-react';

export function CoordinatorDashboardPage() {
  const { profile } = useAuth();
  const [assignedEvents, setAssignedEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [regLoading, setRegLoading] = useState(false);
  const [expandedReg, setExpandedReg] = useState<string | null>(null);
  const [screenshotUrls, setScreenshotUrls] = useState<Record<string, string>>({});
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [members, setMembers] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (profile) fetchAssignedEvents();
  }, [profile]);

  useEffect(() => {
    if (selectedEvent) {
      fetchRegistrations(selectedEvent.id);
      // Real-time subscription
      const channel = supabase
        .channel(`coord-regs-${selectedEvent.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations', filter: `event_id=eq.${selectedEvent.id}` }, () => {
          fetchRegistrations(selectedEvent.id);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedEvent]);

  const fetchAssignedEvents = async () => {
    try {
      const { data: assignments } = await supabase
        .from('coordinator_assignments')
        .select('event_id')
        .eq('coordinator_id', profile!.id);

      if (!assignments || assignments.length === 0) {
        setLoading(false);
        return;
      }

      const eventIds = assignments.map(a => a.event_id);
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds)
        .order('event_date', { ascending: true });

      setAssignedEvents(events || []);
      if (events && events.length > 0 && !selectedEvent) {
        setSelectedEvent(events[0]);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async (eventId: string) => {
    setRegLoading(true);
    try {
      const { data } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', eventId)
        .order('registered_at', { ascending: false });
      setRegistrations(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setRegLoading(false);
    }
  };

  const toggleExpand = async (reg: Registration) => {
    if (expandedReg === reg.id) {
      setExpandedReg(null);
      return;
    }
    setExpandedReg(reg.id);

    // Load screenshot URL if available
    if (reg.payment_screenshot_url && !screenshotUrls[reg.id]) {
      const { data } = await supabase.storage
        .from('payment-screenshots')
        .createSignedUrl(reg.payment_screenshot_url, 3600);
      if (data?.signedUrl) {
        setScreenshotUrls(prev => ({ ...prev, [reg.id]: data.signedUrl }));
      }
    }

    // Load members if not already loaded
    if (!members[reg.id]) {
      const { data } = await supabase
        .from('registration_members')
        .select('*')
        .eq('registration_id', reg.id)
        .order('member_order');
      if (data) {
        setMembers(prev => ({ ...prev, [reg.id]: data }));
      }
    }
  };

  const handleApprove = async (reg: Registration) => {
    if (!confirm(`Approve registration for ${reg.name}?`)) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('registrations')
        .update({
          status: 'confirmed',
          reviewed_by: profile!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reg.id);
      if (error) throw error;

      // Audit log
      await supabase.from('audit_log').insert({
        registration_id: reg.id,
        action: 'approved',
        performed_by: profile!.id,
        metadata: { event_id: reg.event_id },
      });

      // Send confirmation email
      await supabase.functions.invoke('send-confirmation', {
        body: {
          email: reg.email,
          name: reg.name,
          registration_id: reg.registration_id,
          event_title: selectedEvent?.title || 'Event',
          type: 'confirmed',
        },
      });

      alert(`Registration approved. Confirmation sent to ${reg.email}`);
      fetchRegistrations(selectedEvent!.id);
    } catch (err: any) {
      alert('Failed to approve: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!showRejectModal || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('registrations')
        .update({
          status: 'rejected',
          rejection_reason: rejectReason.trim(),
          reviewed_by: profile!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', showRejectModal);
      if (error) throw error;

      // Audit log
      await supabase.from('audit_log').insert({
        registration_id: showRejectModal,
        action: 'rejected',
        performed_by: profile!.id,
        reason: rejectReason.trim(),
        metadata: { event_id: selectedEvent?.id },
      });

      setShowRejectModal(null);
      setRejectReason('');
      fetchRegistrations(selectedEvent!.id);
    } catch (err: any) {
      alert('Failed to reject: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${styles[status] || styles.pending}`}>
        {status === 'confirmed' ? 'Approved' : status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  const pendingCount = registrations.filter(r => r.status === 'pending').length;
  const approvedCount = registrations.filter(r => r.status === 'confirmed').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Coordinator Dashboard</h1>
        <p className="text-gray-500 text-sm">Welcome, {profile?.full_name}</p>
      </div>

      {assignedEvents.length === 0 ? (
        <div className="card text-center py-16">
          <Calendar className="mx-auto text-gray-300 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-700">No events assigned</h3>
          <p className="text-gray-500 mt-1">Ask an admin to assign you to events.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar: Event list */}
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Your Events</h3>
            {assignedEvents.map(evt => (
              <button
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedEvent?.id === evt.id
                    ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                    : 'border-gray-200 hover:border-indigo-200 bg-white'
                }`}
              >
                <p className="font-medium text-gray-900 text-sm leading-tight">{evt.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(evt.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </button>
            ))}
          </div>

          {/* Main: Registrations */}
          <div className="lg:col-span-3">
            {selectedEvent && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="card p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{registrations.length}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
                    <p className="text-xs text-gray-500">Approved</p>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Registrations — {selectedEvent.title}
                </h3>

                {regLoading ? (
                  <div className="text-center py-12">
                    <Loader className="animate-spin text-indigo-600 mx-auto" size={32} />
                  </div>
                ) : registrations.length === 0 ? (
                  <div className="card text-center py-12">
                    <Users className="mx-auto text-gray-300 mb-3" size={48} />
                    <p className="text-gray-500">No registrations yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {registrations.map(reg => (
                      <div key={reg.id} className="card p-0 overflow-hidden">
                        {/* Header */}
                        <button
                          onClick={() => toggleExpand(reg)}
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <User size={16} className="text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate">{reg.name}</p>
                              <p className="text-xs text-gray-500 font-mono">{reg.registration_id}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {statusBadge(reg.status)}
                            {expandedReg === reg.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </button>

                        {/* Expanded details */}
                        {expandedReg === reg.id && (
                          <div className="border-t border-gray-100 p-4 bg-gray-50">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                              <div className="flex items-center text-gray-600">
                                <Mail size={14} className="mr-2 text-gray-400" /> {reg.email}
                              </div>
                              <div className="flex items-center text-gray-600">
                                <Phone size={14} className="mr-2 text-gray-400" /> {reg.phone}
                              </div>
                              <div className="flex items-center text-gray-600">
                                <Hash size={14} className="mr-2 text-gray-400" /> {reg.college_id || 'N/A'}
                              </div>
                              <div className="flex items-center text-gray-600">
                                <Users size={14} className="mr-2 text-gray-400" /> {reg.registration_type}
                                {reg.team_name && ` — ${reg.team_name}`}
                              </div>
                              <div className="flex items-center text-gray-600">
                                <Clock size={14} className="mr-2 text-gray-400" />
                                {new Date(reg.registered_at).toLocaleString()}
                              </div>
                              {reg.transaction_reference && (
                                <div className="flex items-center text-gray-600">
                                  <Hash size={14} className="mr-2 text-gray-400" /> Txn: {reg.transaction_reference}
                                </div>
                              )}
                            </div>

                            {/* Team members */}
                            {members[reg.id] && members[reg.id].length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Team Members</h5>
                                <div className="space-y-1">
                                  {members[reg.id].map((m: any) => (
                                    <div key={m.id} className="text-sm text-gray-700 bg-white p-2 rounded-lg border border-gray-100">
                                      <span className="font-medium">{m.member_order}. {m.member_name}</span>
                                      {m.email && <span className="text-gray-500"> · {m.email}</span>}
                                      {m.college_id && <span className="text-gray-500"> · {m.college_id}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Payment screenshot */}
                            {screenshotUrls[reg.id] && (
                              <div className="mb-4">
                                <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Payment Screenshot</h5>
                                <img
                                  src={screenshotUrls[reg.id]}
                                  alt="Payment"
                                  className="max-h-64 rounded-lg border border-gray-200 shadow-sm"
                                />
                              </div>
                            )}
                            {reg.payment_screenshot_url && !screenshotUrls[reg.id] && (
                              <div className="mb-4 flex items-center text-sm text-gray-500">
                                <ImageIcon size={14} className="mr-1" /> Loading screenshot...
                              </div>
                            )}

                            {/* Rejection reason */}
                            {reg.status === 'rejected' && reg.rejection_reason && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                                <p className="text-xs font-bold text-red-700 mb-1">Rejection Reason</p>
                                <p className="text-sm text-red-600">{reg.rejection_reason}</p>
                              </div>
                            )}

                            {/* Actions */}
                            {reg.status === 'pending' && (
                              <div className="flex gap-3">
                                <button
                                  onClick={() => handleApprove(reg)}
                                  disabled={actionLoading}
                                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-green-300"
                                >
                                  <CheckCircle size={16} className="mr-1" /> Approve
                                </button>
                                <button
                                  onClick={() => { setShowRejectModal(reg.id); setRejectReason(''); }}
                                  disabled={actionLoading}
                                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:bg-red-300"
                                >
                                  <XCircle size={16} className="mr-1" /> Reject
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Reject Registration</h3>
            <p className="text-sm text-gray-500 mb-4">
              Please provide a reason for rejection. This will be visible to the participant.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 mb-4"
              rows={3}
              placeholder="Enter rejection reason (mandatory)..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:bg-red-300"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
