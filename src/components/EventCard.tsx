import { useState } from 'react';
import { Calendar, MapPin, Clock, Users } from 'lucide-react';
import { Event } from '../lib/supabase';

interface EventCardProps {
  event: Event;
  onClick: () => void;
}

export function EventCard({ event, onClick }: EventCardProps) {
  const eventDate = new Date(event.event_date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const spotsLeft = event.max_attendees
    ? event.max_attendees - event.current_attendees
    : null;

  return (
    <div
      onClick={onClick}
      className="card group cursor-pointer overflow-hidden relative bg-white/40 ring-1 ring-white/50"
    >
      <div className="h-48 overflow-hidden relative">
        {event.image_url ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10" />
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600">
            <Calendar size={64} className="text-white/90" />
          </div>
        )}
        <span className="absolute top-4 right-4 z-20 px-3 py-1 text-xs font-semibold rounded-full 
          bg-white/90 text-indigo-600 shadow-lg backdrop-blur-sm">
          {event.category}
        </span>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors">
          {event.title}
        </h3>

        <div className="relative">
          <p className={`text-gray-600 text-sm mb-4 whitespace-pre-wrap transition-all duration-300 ${!isExpanded ? 'line-clamp-3' : ''}`}>
            {event.description}
          </p>
          {event.description && event.description.length > 150 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-indigo-600 text-sm font-semibold hover:text-indigo-800 transition-colors mb-4 block"
            >
              {isExpanded ? 'Read Less' : 'Read More'}
            </button>
          )}
        </div>

        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-center bg-white/50 backdrop-blur-sm p-2.5 rounded-xl border border-white/50">
            <Calendar size={18} className="mr-3 text-indigo-600" />
            <span className="font-semibold">{formattedDate}</span>
          </div>
          <div className="flex items-center bg-white/50 backdrop-blur-sm p-2.5 rounded-xl border border-white/50">
            <Clock size={18} className="mr-3 text-indigo-600" />
            <span className="font-semibold">{event.event_time}</span>
          </div>
          <div className="flex items-center bg-white/50 backdrop-blur-sm p-2.5 rounded-xl border border-white/50">
            <MapPin size={18} className="mr-3 text-indigo-600" />
            <span className="font-semibold truncate">{event.location}</span>
          </div>
          {event.max_attendees && (
            <div className="flex items-center bg-white/50 backdrop-blur-sm p-2.5 rounded-xl border border-white/50">
              <Users size={18} className="mr-3 text-indigo-600" />
              <span>
                {spotsLeft! > 0 ? (
                  <span className="font-semibold">
                    <span className="text-green-600 font-bold">{spotsLeft}</span> of{' '}
                    <span className="text-indigo-600 font-bold">{event.max_attendees}</span> spots left
                  </span>
                ) : (
                  <span className="font-bold text-red-600">Fully Booked</span>
                )}
              </span>
            </div>
          )}
        </div>

        <button className="mt-6 w-full btn-primary group-hover:scale-[1.02] transform transition-all">
          View Details & Register
        </button>
      </div>
    </div>
  );
}
