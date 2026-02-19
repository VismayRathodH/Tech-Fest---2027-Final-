import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { EventCard } from '../components/EventCard';
import { EventFilters } from '../components/EventFilters';
import { RegistrationForm } from '../components/RegistrationForm';
import { RegistrationSuccess } from '../components/RegistrationSuccess';
import { PaymentVerification } from '../components/PaymentVerification';
import { Event, supabase } from '../lib/supabase';

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationId, setRegistrationId] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPaymentVerification, setShowPaymentVerification] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchQuery, selectedCategory, selectedDate]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .in('status', ['upcoming', 'ongoing'])
        .order('event_date', { ascending: true });

      if (error) throw error;

      setEvents(data || []);

      const uniqueCategories = Array.from(
        new Set((data || []).map((e) => e.category))
      ).sort();
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query) ||
          event.location.toLowerCase().includes(query)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((event) => event.category === selectedCategory);
    }

    if (selectedDate) {
      filtered = filtered.filter((event) => event.event_date === selectedDate);
    }

    setFilteredEvents(filtered);
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowRegistration(true);
  };

  const handleRegistrationSuccess = (regId: string) => {
    setRegistrationId(regId);
    setShowRegistration(false);
    setShowSuccess(true);
    fetchEvents();
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    setSelectedEvent(null);
    setRegistrationId('');
  };

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-indigo-800 to-purple-600 text-white animate-fadeIn border-gray-400 rounded-lg max-w-10xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-7 py-12 mb-8">
          <div className="flex items-center space-x-6">
            <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
              <Calendar className="text-white" size={40} />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Event Registration System</h1>
              <p className="text-indigo-100 mt-2 text-lg">
                Discover and register for upcoming events in your area.
              </p>
              <button
                onClick={() => setShowPaymentVerification(true)}
                className="mt-4 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors flex items-center shadow-lg"
              >
                <div className="mr-2 p-1 bg-white/20 rounded">
                  <span className="text-xs font-bold uppercase">Already Registered?</span>
                </div>
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fadeIn">
        <div className="mb-8">
          <EventFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            categories={categories}
          />
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent"></div>
            <p className="mt-6 text-gray-600 text-lg">Loading amazing events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 card">
            <Calendar className="mx-auto text-indigo-400 mb-6" size={80} />
            <h3 className="text-2xl font-semibold text-gray-800 mb-3">
              All Events are displayed here..
            </h3>
            <p className="text-gray-600 text-lg">
              {searchQuery || selectedCategory || selectedDate
                ? 'Try adjusting your filters to find more events'
                : 'Check back later for exciting upcoming events'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event, index) => (
              <div
                key={event.id}
                className="transform transition-all duration-300 hover:scale-105"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeIn 0.5s ease-out forwards'
                }}
              >
                <EventCard
                  event={event}
                  onClick={() => handleEventClick(event)}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {showRegistration && selectedEvent && (
        <RegistrationForm
          event={selectedEvent}
          onClose={() => {
            setShowRegistration(false);
            setSelectedEvent(null);
          }}
          onSuccess={handleRegistrationSuccess}
        />
      )}

      {showSuccess && selectedEvent && (
        <RegistrationSuccess
          registrationId={registrationId}
          eventTitle={selectedEvent.title}
          onClose={handleCloseSuccess}
        />
      )}

      {showPaymentVerification && (
        <PaymentVerification
          onClose={() => setShowPaymentVerification(false)}
        />
      )}
    </div>
  );
}
