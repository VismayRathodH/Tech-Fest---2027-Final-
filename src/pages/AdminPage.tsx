import { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Users,
  Download,
  BarChart3,
} from 'lucide-react';
import { Event, Registration, supabase } from '../lib/supabase';
import { EventForm } from '../components/EventForm';
import { ChangePassword } from '../components/ChangePassword';

interface AdminPageProps {
}

export function AdminPage({ }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<'events' | 'registrations' | 'stats' | 'settings'>('events');
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>();

  useEffect(() => {
    fetchData();

    // Set up real-time subscriptions
    const registrationsChannel = supabase
      .channel('admin-registrations-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registrations' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const eventsChannel = supabase
      .channel('admin-events-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(registrationsChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventsRes, registrationsRes] = await Promise.all([
        supabase.from('events').select('*').order('event_date', { ascending: false }),
        supabase
          .from('registrations')
          .select('*')
          .order('registered_at', { ascending: false }),
      ]);

      if (eventsRes.error) throw eventsRes.error;
      if (registrationsRes.error) throw registrationsRes.error;

      setEvents(eventsRes.data || []);
      setRegistrations(registrationsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (registration: Registration) => {
    try {
      setLoading(true);

      // 1. Update status in database
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ status: 'confirmed' })
        .eq('id', registration.id);

      if (updateError) throw updateError;

      // 2. Trigger automated "Registration Confirmed" email
      const event = events.find((e) => e.id === registration.event_id);
      await supabase.functions.invoke('send-confirmation', {
        body: {
          email: registration.email,
          name: registration.name,
          registration_id: registration.registration_id,
          event_title: event?.title || 'Event',
          type: 'confirmed'
        }
      });

      alert(`Registration approved and confirmation email sent to ${registration.email}`);
      fetchData();
    } catch (error) {
      console.error('Error approving registration:', error);
      alert('Failed to approve registration');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleDeleteRegistration = async (registration: Registration) => {
    if (!confirm(`Are you sure you want to delete registration for ${registration.name}?`)) return;

    try {
      setLoading(true);

      // 1. Get the event associated with this registration
      const event = events.find(e => e.id === registration.event_id);

      // 2. Delete the registration
      const { error: deleteError } = await supabase
        .from('registrations')
        .delete()
        .eq('id', registration.id);

      if (deleteError) throw deleteError;

      // 3. Decrement attendee count if the registration was not cancelled
      if (event && registration.status !== 'cancelled') {
        const { error: updateError } = await supabase
          .from('events')
          .update({ current_attendees: Math.max(0, (event.current_attendees || 1) - 1) })
          .eq('id', event.id);

        if (updateError) throw updateError;
      }

      alert('Registration deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting registration:', error);
      alert('Failed to delete registration');
    } finally {
      setLoading(false);
    }
  };

  const exportRegistrations = () => {
    const csvContent = [
      ['Registration ID', 'Name', 'Email', 'Phone', 'Type', 'Team Members', 'Payment ID', 'Event', 'Date', 'Status'],
      ...registrations.map((reg) => {
        const event = events.find((e) => e.id === reg.event_id);
        return [
          reg.registration_id,
          reg.name,
          reg.email,
          reg.phone,
          reg.registration_type,
          reg.team_members.join('; '),
          reg.payment_id,
          event?.title || 'Unknown',
          new Date(reg.registered_at).toLocaleDateString(),
          reg.status,
        ];
      }),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const stats = {
    totalEvents: events.length,
    upcomingEvents: events.filter((e) => e.status === 'upcoming').length,
    totalRegistrations: registrations.length,
    confirmedRegistrations: registrations.filter((r) => r.status === 'confirmed').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="text-blue-600 mr-3" size={32} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
                <p className="text-sm text-gray-600">Event Management System</p>
              </div>
            </div>

          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('events')}
                className={`px-6 py-4 font-medium transition-colors ${activeTab === 'events'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Events
              </button>
              <button
                onClick={() => setActiveTab('registrations')}
                className={`px-6 py-4 font-medium transition-colors ${activeTab === 'registrations'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Registrations
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-6 py-4 font-medium transition-colors ${activeTab === 'stats'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Statistics
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-6 py-4 font-medium transition-colors ${activeTab === 'settings'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Settings
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'events' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">All Events</h2>
                  <button
                    onClick={() => {
                      setSelectedEvent(undefined);
                      setShowEventForm(true);
                    }}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={18} className="mr-2" />
                    Add Event
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto text-gray-400 mb-4" size={64} />
                    <p className="text-gray-600">No events yet. Create your first event!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Title
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Category
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Attendees
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {events.map((event) => (
                          <tr key={event.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 text-sm font-medium text-gray-900">
                              {event.title}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {new Date(event.event_date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                {event.category}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {event.current_attendees}
                              {event.max_attendees && ` / ${event.max_attendees}`}
                            </td>
                            <td className="px-4 py-4 text-sm">
                              <span
                                className={`px-2 py-1 text-xs font-semibold rounded-full ${event.status === 'upcoming'
                                  ? 'bg-green-100 text-green-800'
                                  : event.status === 'ongoing'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : event.status === 'completed'
                                      ? 'bg-gray-100 text-gray-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                              >
                                {event.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-right">
                              <button
                                onClick={() => {
                                  setSelectedEvent(event);
                                  setShowEventForm(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 mr-3"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteEvent(event.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'registrations' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">All Registrations</h2>
                  <button
                    onClick={exportRegistrations}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download size={18} className="mr-2" />
                    Export CSV
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : registrations.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="mx-auto text-gray-400 mb-4" size={64} />
                    <p className="text-gray-600">No registrations yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Registration ID
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Email
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Phone
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Type / Team
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Payment ID
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Event
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {registrations.map((reg) => {
                          const event = events.find((e) => e.id === reg.event_id);
                          return (
                            <tr key={reg.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 text-sm font-medium text-gray-900">
                                {reg.registration_id}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-900">{reg.name}</td>
                              <td className="px-4 py-4 text-sm text-gray-600">{reg.email}</td>
                              <td className="px-4 py-4 text-sm text-gray-600">{reg.phone}</td>
                              <td className="px-4 py-4 text-sm text-gray-600">
                                <div className="font-medium text-blue-600 capitalize">
                                  {reg.registration_type}
                                </div>
                                {reg.team_members && reg.team_members.length > 0 && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {reg.team_members.map((m, i) => (
                                      <div key={i}>• {m}</div>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4 text-sm font-mono text-xs">
                                {reg.payment_id ? (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-bold border border-blue-200 block text-center">
                                    {reg.payment_id}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic">No Payment ID</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-600">
                                {event?.title || 'Unknown'}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-600">
                                {new Date(reg.registered_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-4 text-sm">
                                <span
                                  className={`px-2 py-1 text-xs font-semibold rounded-full ${reg.status === 'confirmed'
                                    ? 'bg-green-100 text-green-800'
                                    : reg.status === 'pending'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : reg.status === 'attended'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                >
                                  {reg.status}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  {reg.status === 'pending' && (
                                    <button
                                      onClick={() => handleApprove(reg)}
                                      className={`px-3 py-1 text-white rounded-md text-xs transition-colors shadow-sm font-medium ${reg.payment_id
                                        ? 'bg-green-600 hover:bg-green-700 ring-2 ring-green-100'
                                        : 'bg-gray-500 hover:bg-gray-600'
                                        }`}
                                    >
                                      {reg.payment_id ? 'Approve' : 'Approve (No Payment)'}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteRegistration(reg)}
                                    className="text-red-600 hover:text-red-800 transition-colors"
                                    title="Delete Registration"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Statistics Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium opacity-90">Total Events</h3>
                      <Calendar size={24} className="opacity-80" />
                    </div>
                    <p className="text-3xl font-bold">{stats.totalEvents}</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium opacity-90">Upcoming Events</h3>
                      <BarChart3 size={24} className="opacity-80" />
                    </div>
                    <p className="text-3xl font-bold">{stats.upcomingEvents}</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium opacity-90">Total Registrations</h3>
                      <Users size={24} className="opacity-80" />
                    </div>
                    <p className="text-3xl font-bold">{stats.totalRegistrations}</p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium opacity-90">Confirmed</h3>
                      <Users size={24} className="opacity-80" />
                    </div>
                    <p className="text-3xl font-bold">{stats.confirmedRegistrations}</p>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Event Registrations Breakdown
                  </h3>
                  <div className="space-y-3">
                    {events
                      .filter((e) => e.status === 'upcoming')
                      .map((event) => {
                        const eventRegs = registrations.filter(
                          (r) => r.event_id === event.id
                        ).length;
                        const percentage = event.max_attendees
                          ? (eventRegs / event.max_attendees) * 100
                          : 0;

                        return (
                          <div key={event.id} className="bg-white border rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-medium text-gray-900">{event.title}</h4>
                              <span className="text-sm text-gray-600">
                                {eventRegs}
                                {event.max_attendees && ` / ${event.max_attendees}`} attendees
                              </span>
                            </div>
                            {event.max_attendees && (
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                ></div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Account Settings</h2>
                <ChangePassword />
              </div>
            )}
          </div>
        </div>
      </div>

      {showEventForm && (
        <EventForm
          event={selectedEvent}
          onClose={() => {
            setShowEventForm(false);
            setSelectedEvent(undefined);
          }}
          onSuccess={() => {
            setShowEventForm(false);
            setSelectedEvent(undefined);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
