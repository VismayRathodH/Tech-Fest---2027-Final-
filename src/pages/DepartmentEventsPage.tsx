import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Clock, Users, ArrowLeft, IndianRupee } from 'lucide-react';
import { supabase, Event, Department } from '../lib/supabase';

function ExpandableDescription({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = text ? text.length > 150 : false;

  return (
    <div className="relative">
      <p className={`text-gray-500 text-sm mb-4 whitespace-pre-wrap transition-all duration-300 ${!isExpanded ? 'line-clamp-3' : ''}`}>
        {text}
      </p>
      {shouldTruncate && (
        <button
          onClick={(e) => {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }}
          className="text-indigo-600 text-sm font-semibold hover:text-indigo-800 transition-colors mb-4 block"
        >
          {isExpanded ? 'Read Less' : 'Read More'}
        </button>
      )}
    </div>
  );
}

export function DepartmentEventsPage() {
  const { code } = useParams<{ code: string }>();
  const [department, setDepartment] = useState<Department | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (code) fetchDepartmentAndEvents(code);
  }, [code]);

  const fetchDepartmentAndEvents = async (deptCode: string) => {
    try {
      const { data: dept } = await supabase
        .from('departments')
        .select('*')
        .eq('code', deptCode.toUpperCase())
        .single();

      if (!dept) {
        setLoading(false);
        return;
      }
      setDepartment(dept);

      const { data: evts } = await supabase
        .from('events')
        .select('*')
        .eq('department_id', dept.id)
        .in('status', ['upcoming', 'ongoing'])
        .order('event_date', { ascending: true });

      setEvents(evts || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getParticipationTypes = (event: Event) => {
    const types: string[] = [];
    if (event.allow_single) types.push('Solo');
    if (event.allow_double) types.push('Duo');
    if (event.allow_triple) types.push('Trio');
    if (event.allow_quad) types.push('Quad');
    if (event.allow_group) types.push(`Group (up to ${event.max_team_size})`);
    return types;
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Department Not Found</h2>
        <p className="text-gray-500 mb-6">The department "{code}" does not exist.</p>
        <Link to="/" className="btn-primary">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-800 to-purple-600 text-white mx-4 sm:mx-6 lg:mx-8 rounded-2xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
          <Link to="/" className="inline-flex items-center text-indigo-200 hover:text-white mb-4 text-sm transition-colors">
            <ArrowLeft size={16} className="mr-1" /> Back to Departments
          </Link>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-bold backdrop-blur-sm">
              {department.code}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold">{department.name}</h1>
          </div>
          {department.description && (
            <p className="text-indigo-100 mt-2">{department.description}</p>
          )}
        </div>
      </header>

      {/* Events grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Available Events ({events.length})
        </h2>

        {events.length === 0 ? (
          <div className="text-center py-16 card">
            <Calendar className="mx-auto text-gray-300 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-700">No events available</h3>
            <p className="text-gray-500 mt-2">
              This department hasn't published any events yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event, index) => {
              const spotsLeft = event.max_attendees
                ? event.max_attendees - event.current_attendees
                : null;
              const isFull = spotsLeft !== null && spotsLeft <= 0;
              const types = getParticipationTypes(event);

              return (
                <div
                  key={event.id}
                  className="card group overflow-hidden flex flex-col h-full animate-fadeIn"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Image */}
                  <div className="h-48 -mx-6 -mt-6 mb-6 overflow-hidden relative">
                    {event.image_url ? (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />
                        <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                        <Calendar size={48} className="text-white/80" />
                      </div>
                    )}
                    <span className="absolute top-4 right-4 z-20 px-3 py-1 text-xs font-bold rounded-full bg-white/90 text-indigo-600 shadow-lg backdrop-blur-sm">
                      {event.category}
                    </span>
                    {isFull && (
                      <span className="absolute top-4 left-4 z-20 px-3 py-1 text-xs font-bold rounded-full bg-red-500 text-white shadow-lg">
                        Fully Booked
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-2">
                    {event.title}
                  </h3>
                  <ExpandableDescription text={event.description} />

                  <div className="space-y-3 text-sm text-gray-600 mb-6 flex-grow">
                    <div className="flex items-center bg-gray-50/50 p-2 rounded-xl border border-gray-100/50">
                      <Calendar size={16} className="mr-3 text-indigo-500" />
                      <span className="font-semibold">{new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center bg-gray-50/50 p-2 rounded-xl border border-gray-100/50">
                      <Clock size={16} className="mr-3 text-indigo-500" />
                      <span className="font-semibold">{event.event_time}</span>
                    </div>
                    <div className="flex items-center bg-gray-50/50 p-2 rounded-xl border border-gray-100/50">
                      <MapPin size={16} className="mr-3 text-indigo-500" />
                      <span className="truncate font-semibold">{event.location}</span>
                    </div>
                    {event.max_attendees && (
                      <div className="flex items-center bg-gray-50/50 p-2 rounded-xl border border-gray-100/50">
                        <Users size={16} className="mr-3 text-indigo-500" />
                        {isFull ? (
                          <span className="text-red-600 font-bold">Sold Out</span>
                        ) : (
                          <span><span className="text-green-600 font-bold">{spotsLeft}</span> / <span className="text-indigo-600 font-bold">{event.max_attendees}</span> spots left</span>
                        )}
                      </div>
                    )}
                    {event.registration_fee > 0 && (
                      <div className="flex items-center bg-indigo-50/50 p-2 rounded-xl border border-indigo-100/50">
                        <IndianRupee size={16} className="mr-3 text-indigo-600" />
                        <span className="font-bold text-indigo-700 text-base">₹{event.registration_fee}</span>
                      </div>
                    )}
                  </div>

                  {/* Participation types */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {types.map(type => (
                      <span key={type} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                        {type}
                      </span>
                    ))}
                  </div>

                  <Link
                    to={isFull ? '#' : `/register/${event.id}`}
                    className={`block w-full text-center py-2.5 rounded-lg font-medium transition-all ${isFull
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'btn-primary'
                      }`}
                    onClick={e => isFull && e.preventDefault()}
                  >
                    {isFull ? 'Registrations Closed' : 'Register Now'}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
