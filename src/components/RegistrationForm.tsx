import { useState, FormEvent } from 'react';
import { X, User, Mail, Phone, Loader } from 'lucide-react';
import { Event, supabase } from '../lib/supabase';

interface RegistrationFormProps {
  event: Event;
  onClose: () => void;
  onSuccess: (registrationId: string) => void;
}

export function RegistrationForm({ event, onClose, onSuccess }: RegistrationFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    confirmEmail: '',
    phone: '',
    registration_type: 'solo' as 'solo' | 'duo' | 'trio' | 'quad' | 'group',
    team_members: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    } else if (formData.email !== formData.confirmEmail) {
      newErrors.confirmEmail = 'Emails do not match';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s\-\+\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    if (formData.registration_type !== 'solo') {
      const expectedMembers =
        formData.registration_type === 'duo' ? 1 :
          formData.registration_type === 'trio' ? 2 :
            formData.registration_type === 'quad' ? 3 :
              formData.team_members.length;

      for (let i = 0; i < expectedMembers; i++) {
        if (!formData.team_members[i]?.trim()) {
          newErrors.team_members = 'All team member names are required';
          break;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: regIdData, error: regIdError } = await supabase.rpc(
        'generate_registration_id'
      );

      if (regIdError) throw regIdError;

      const { error: insertError } = await supabase.from('registrations').insert({
        event_id: event.id,
        registration_id: regIdData,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        email_verified: true,
        phone_verified: false,
        registration_type: formData.registration_type,
        team_members: formData.team_members,
        status: 'pending'
      });

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('events')
        .update({ current_attendees: (event.current_attendees || 0) + 1 })
        .eq('id', event.id);

      if (updateError) throw updateError;

      onSuccess(regIdData);
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ submit: 'Registration failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFull = event.max_attendees && event.current_attendees >= event.max_attendees;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Register for Event</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-1">{event.title}</h3>
            <p className="text-sm text-gray-600">
              {new Date(event.event_date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}{' '}
              at {event.event_time}
            </p>
            <p className="text-sm text-gray-600">{event.location}</p>
          </div>

          {isFull ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 font-semibold">
                Sorry, this event is fully booked.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="John Doe"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="john@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Email Address *
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="email"
                    value={formData.confirmEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmEmail: e.target.value })
                    }
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.confirmEmail ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="john@example.com"
                  />
                </div>
                {errors.confirmEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmEmail}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
                {formData.registration_type !== 'solo' && (
                  <p className="mt-2 text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-100">
                    <strong>Note:</strong> Payment link and confirmation mail will be sent to this primary contact's email address.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {event.allow_single && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, registration_type: 'solo', team_members: [] })}
                      className={`px-4 py-2 text-sm border rounded-lg transition-colors ${formData.registration_type === 'solo' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                    >
                      Solo
                    </button>
                  )}
                  {event.allow_double && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, registration_type: 'duo', team_members: [''] })}
                      className={`px-4 py-2 text-sm border rounded-lg transition-colors ${formData.registration_type === 'duo' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                    >
                      Duo
                    </button>
                  )}
                  {event.allow_triple && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, registration_type: 'trio', team_members: ['', ''] })}
                      className={`px-4 py-2 text-sm border rounded-lg transition-colors ${formData.registration_type === 'trio' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                    >
                      Trio
                    </button>
                  )}
                  {event.allow_quad && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, registration_type: 'quad', team_members: ['', '', ''] })}
                      className={`px-4 py-2 text-sm border rounded-lg transition-colors ${formData.registration_type === 'quad' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                    >
                      Quad
                    </button>
                  )}
                  {event.allow_group && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, registration_type: 'group', team_members: Array(1).fill('') })}
                      className={`px-4 py-2 text-sm border rounded-lg transition-colors ${formData.registration_type === 'group' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                    >
                      Group
                    </button>
                  )}
                </div>
              </div>

              {formData.registration_type === 'group' && (
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Size (including you)
                  </label>
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        const currentSize = formData.team_members.length + 1;
                        if (currentSize > 2) {
                          setFormData({
                            ...formData,
                            team_members: formData.team_members.slice(0, -1)
                          });
                        }
                      }}
                      className="w-10 h-10 flex items-center justify-center bg-white border border-gray-300 rounded-lg text-xl font-bold hover:bg-gray-50 text-gray-700"
                    >
                      -
                    </button>
                    <span className="text-xl font-bold text-indigo-600 w-8 text-center">
                      {formData.team_members.length + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const currentSize = formData.team_members.length + 1;
                        if (currentSize < 6) {
                          setFormData({
                            ...formData,
                            team_members: [...formData.team_members, '']
                          });
                        }
                      }}
                      className="w-10 h-10 flex items-center justify-center bg-white border border-gray-300 rounded-lg text-xl font-bold hover:bg-gray-50 text-gray-700"
                    >
                      +
                    </button>
                    <span className="text-xs text-gray-500 italic">(Min 2, Max 6 members)</span>
                  </div>
                </div>
              )}

              {formData.registration_type !== 'solo' && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 border-b pb-2 mb-2">Additional Team Members</h4>
                  {formData.team_members.map((member, index) => (
                    <div key={index}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Member {index + 2} Name *
                      </label>
                      <input
                        type="text"
                        value={member}
                        onChange={(e) => {
                          const newMembers = [...formData.team_members];
                          newMembers[index] = e.target.value;
                          setFormData({ ...formData, team_members: newMembers });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                        placeholder={`Name of member ${index + 2}`}
                      />
                    </div>
                  ))}
                  {errors.team_members && (
                    <p className="text-xs text-red-600 mt-1">{errors.team_members}</p>
                  )}
                </div>
              )}

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{errors.submit}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="animate-spin mr-2" size={18} />
                      Registering...
                    </>
                  ) : (
                    'Register Now'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
