import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, User, Mail, Phone, Upload,
  Loader, CheckCircle, Calendar, MapPin, Clock, Users, IndianRupee, Hash, Copy, Check, Search
} from 'lucide-react';
import { supabase, Event, Department } from '../lib/supabase';

interface ParticipantForm {
  name: string;
  email: string;
  phone: string;
  college_id: string;
}

const emptyParticipant = (): ParticipantForm => ({
  name: '', email: '', phone: '', college_id: '',
});

export function RegisterPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  // Data
  const [event, setEvent] = useState<Event | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);

  // Wizard
  const [step, setStep] = useState(1);
  const [regType, setRegType] = useState<string>('');
  const [participants, setParticipants] = useState<ParticipantForm[]>([emptyParticipant()]);
  const [teamName, setTeamName] = useState('');
  const [groupSize, setGroupSize] = useState(2);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [registrationId, setRegistrationId] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (eventId) fetchEvent(eventId);
  }, [eventId]);

  // Auto-redirect to home after successful registration
  useEffect(() => {
    if (step === 5) {
      const timer = setTimeout(() => navigate('/'), 15000);
      return () => clearTimeout(timer);
    }
  }, [step, navigate]);

  const fetchEvent = async (id: string) => {
    try {
      const { data: evt } = await supabase.from('events').select('*').eq('id', id).single();
      if (!evt) { setLoading(false); return; }
      setEvent(evt);

      // Auto-select registration type if only one is available
      const types = getAvailableTypes(evt);
      if (types.length === 1) setRegType(types[0]);

      if (evt.department_id) {
        const { data: dept } = await supabase.from('departments').select('*').eq('id', evt.department_id).single();
        setDepartment(dept);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableTypes = (evt: Event) => {
    const t: string[] = [];
    if (evt.allow_single) t.push('solo');
    if (evt.allow_double) t.push('duo');
    if (evt.allow_triple) t.push('trio');
    if (evt.allow_quad) t.push('quad');
    if (evt.allow_group) t.push('group');
    return t;
  };

  const getMemberCount = (type: string): number => {
    switch (type) {
      case 'solo': return 1;
      case 'duo': return 2;
      case 'trio': return 3;
      case 'quad': return 4;
      case 'group': return groupSize;
      default: return 1;
    }
  };

  const getTotalFee = (): number => {
    if (!event || event.registration_fee <= 0 || !regType) return 0;
    return event.registration_fee * getMemberCount(regType);
  };

  // When regType or groupSize changes, adjust participants array
  useEffect(() => {
    if (!regType) return;
    const count = getMemberCount(regType);
    setParticipants(prev => {
      const arr = [...prev];
      while (arr.length < count) arr.push(emptyParticipant());
      return arr.slice(0, count);
    });
  }, [regType, groupSize]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, screenshot: 'File size must be under 5 MB' });
        return;
      }
      setScreenshot(file);
      setScreenshotPreview(URL.createObjectURL(file));
      setErrors(prev => { const n = { ...prev }; delete n.screenshot; return n; });
    }
  };

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};

    if (s === 1) {
      if (!regType) errs.regType = 'Please select a registration type';
    }

    if (s === 2) {
      participants.forEach((p, i) => {
        if (!p.name.trim()) errs[`p${i}_name`] = 'Name is required';
        if (!p.email.trim()) errs[`p${i}_email`] = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) errs[`p${i}_email`] = 'Invalid email';
        if (!p.phone.trim()) errs[`p${i}_phone`] = 'Phone is required';
        else if (!/^[\d\s\-\+\(\)]{10,}$/.test(p.phone)) errs[`p${i}_phone`] = 'Invalid phone number';
        if (!p.college_id.trim()) errs[`p${i}_college_id`] = 'College ID is required';
      });
      if (regType !== 'solo' && !teamName.trim()) errs.teamName = 'Team name is required';
    }

    if (s === 3) {
      if (event && event.registration_fee > 0) {
        if (!screenshot) errs.screenshot = 'Payment screenshot is required';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      // Skip payment step if fee is 0
      if (step === 2 && event && event.registration_fee <= 0) {
        setStep(4);
      } else {
        setStep(step + 1);
      }
    }
  };

  const prevStep = () => {
    if (step === 4 && event && event.registration_fee <= 0) {
      setStep(2);
    } else {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrors({});

    try {
      const deptCode = department?.code || 'GEN';

      // 1. Generate registration ID (try RPC, fallback to client-side)
      let genId: string;
      try {
        const { data, error: genErr } = await supabase.rpc('generate_registration_id', {
          dept_code: deptCode,
        });
        if (genErr || !data) throw genErr || new Error('Empty ID');
        genId = data;
      } catch {
        // Fallback: generate client-side
        const rand = Math.floor(100000 + Math.random() * 900000);
        genId = `EVT-${deptCode.toUpperCase()}-${new Date().getFullYear()}-${rand}`;
      }

      // 2. Upload payment screenshot if exists
      let screenshotPath = '';
      if (screenshot) {
        const ext = screenshot.name.split('.').pop();
        const fileName = `${genId}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('payment-screenshots')
          .upload(fileName, screenshot);
        if (uploadErr) throw uploadErr;
        screenshotPath = fileName;
      }

      // 3. Insert registration
      const primary = participants[0];
      const { error: insertErr } = await supabase.from('registrations').insert({
        event_id: event!.id,
        registration_id: genId,
        name: primary.name,
        email: primary.email,
        phone: primary.phone,
        college_id: primary.college_id,
        email_verified: false,
        phone_verified: false,
        registration_type: regType,
        team_members: participants.slice(1).map(p => p.name),
        team_name: teamName || null,
        payment_screenshot_url: screenshotPath,
        transaction_reference: null,
        payment_id: null,
        status: 'pending',
      });
      if (insertErr) throw insertErr;

      // 4. Insert registration members
      const { data: regRecord } = await supabase
        .from('registrations')
        .select('id')
        .eq('registration_id', genId)
        .single();

      if (regRecord) {
        const membersToInsert = participants.map((p, i) => ({
          registration_id: regRecord.id,
          member_name: p.name,
          email: p.email,
          phone: p.phone,
          college_id: p.college_id,
          member_order: i + 1,
        }));
        await supabase.from('registration_members').insert(membersToInsert);
      }

      setRegistrationId(genId);
      setStep(5);
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrors({ submit: err.message || 'Registration failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const copyRegId = () => {
    navigator.clipboard.writeText(registrationId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading / not found states
  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
        <Link to="/" className="btn-primary mt-4 inline-block">Back to Home</Link>
      </div>
    );
  }

  const isFull = event.max_attendees !== null && event.current_attendees >= event.max_attendees;
  const availableTypes = getAvailableTypes(event);

  // Step indicator
  const stepLabels = event.registration_fee > 0
    ? ['Type', 'Details', 'Payment', 'Review', 'Done']
    : ['Type', 'Details', 'Review', 'Done'];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fadeIn">
      <Link
        to={department ? `/department/${department.code}` : '/'}
        className="inline-flex items-center text-gray-500 hover:text-indigo-600 mb-6 text-sm"
      >
        <ArrowLeft size={16} className="mr-1" /> Back to Events
      </Link>

      {/* Step indicator */}
      {step < 5 && (
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {stepLabels.map((label, idx) => (
              <div key={label} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${idx + 1 <= step ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                  {idx + 1 <= step ? (idx + 1 < step ? '✓' : idx + 1) : idx + 1}
                </div>
                <span className={`ml-2 text-xs font-medium hidden sm:inline ${idx + 1 <= step ? 'text-indigo-600' : 'text-gray-400'
                  }`}>
                  {label}
                </span>
                {idx < stepLabels.length - 1 && (
                  <div className={`w-8 sm:w-16 h-0.5 mx-2 ${idx + 1 < step ? 'bg-indigo-600' : 'bg-gray-200'
                    }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event header */}
      {step < 5 && (
        <div className="card mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
          <h2 className="text-xl font-bold text-gray-900">{event.title}</h2>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
            {department && <span className="flex items-center"><Hash size={14} className="mr-1" />{department.name}</span>}
            <span className="flex items-center"><Calendar size={14} className="mr-1" />{new Date(event.event_date).toLocaleDateString()}</span>
            <span className="flex items-center"><Clock size={14} className="mr-1" />{event.event_time}</span>
            <span className="flex items-center"><MapPin size={14} className="mr-1" />{event.location}</span>
            {event.registration_fee > 0 && <span className="flex items-center"><IndianRupee size={14} className="mr-1" />₹{event.registration_fee}/person{regType && regType !== 'solo' ? ` (₹${getTotalFee()} total)` : ''}</span>}
          </div>
        </div>
      )}

      {isFull && step < 5 ? (
        <div className="card text-center py-12">
          <Users className="mx-auto text-red-400 mb-4" size={48} />
          <h3 className="text-xl font-bold text-red-600">Registrations Full</h3>
          <p className="text-gray-500 mt-2">This event has reached maximum capacity.</p>
        </div>
      ) : (
        <>
          {/* STEP 1: Registration Type */}
          {step === 1 && (
            <div className="card">
              <h3 className="text-lg font-bold mb-4">Select Registration Type</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setRegType(type)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${regType === type
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-indigo-300 text-gray-700'
                      }`}
                  >
                    <span className="block text-2xl mb-1">
                      {type === 'solo' ? '👤' : type === 'duo' ? '👥' : type === 'trio' ? '👨‍👩‍👦' : type === 'quad' ? '👨‍👩‍👧‍👦' : '🏟️'}
                    </span>
                    <span className="font-bold capitalize">{type}</span>
                    <span className="block text-xs text-gray-500">
                      {type === 'solo' ? '1 person' : type === 'duo' ? '2 people' : type === 'trio' ? '3 people' : type === 'quad' ? '4 people' : `Up to ${event.max_team_size}`}
                    </span>
                  </button>
                ))}
              </div>

              {regType === 'group' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Size (2 to {event.max_team_size})
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={event.max_team_size}
                    value={groupSize}
                    onChange={e => setGroupSize(Math.min(event.max_team_size, Math.max(2, parseInt(e.target.value) || 2)))}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {errors.regType && <p className="text-red-600 text-sm mt-3">{errors.regType}</p>}

              <div className="mt-6 flex justify-end">
                <button onClick={nextStep} className="btn-primary flex items-center">
                  Next <ArrowRight size={16} className="ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Participant Details */}
          {step === 2 && (
            <div className="card">
              <h3 className="text-lg font-bold mb-4">Participant Details</h3>

              {regType !== 'solo' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team Name *</label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.teamName ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Enter team name"
                  />
                  {errors.teamName && <p className="text-red-600 text-xs mt-1">{errors.teamName}</p>}
                </div>
              )}

              {participants.map((p, i) => (
                <div key={i} className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h4 className="font-bold text-gray-800 mb-3">
                    {i === 0 ? 'Primary Contact (Member 1)' : `Member ${i + 1}`}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                        <input
                          type="text"
                          value={p.name}
                          onChange={e => {
                            const arr = [...participants]; arr[i].name = e.target.value; setParticipants(arr);
                          }}
                          className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 ${errors[`p${i}_name`] ? 'border-red-400' : 'border-gray-300'}`}
                          placeholder="Full name"
                        />
                      </div>
                      {errors[`p${i}_name`] && <p className="text-red-500 text-xs mt-0.5">{errors[`p${i}_name`]}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                        <input
                          type="email"
                          value={p.email}
                          onChange={e => {
                            const arr = [...participants]; arr[i].email = e.target.value; setParticipants(arr);
                          }}
                          className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 ${errors[`p${i}_email`] ? 'border-red-400' : 'border-gray-300'}`}
                          placeholder="email@college.edu"
                        />
                      </div>
                      {errors[`p${i}_email`] && <p className="text-red-500 text-xs mt-0.5">{errors[`p${i}_email`]}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phone *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                        <input
                          type="tel"
                          value={p.phone}
                          onChange={e => {
                            const arr = [...participants]; arr[i].phone = e.target.value; setParticipants(arr);
                          }}
                          className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 ${errors[`p${i}_phone`] ? 'border-red-400' : 'border-gray-300'}`}
                          placeholder="+91 98765 43210"
                        />
                      </div>
                      {errors[`p${i}_phone`] && <p className="text-red-500 text-xs mt-0.5">{errors[`p${i}_phone`]}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">College ID / Enrollment No *</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                        <input
                          type="text"
                          value={p.college_id}
                          onChange={e => {
                            const arr = [...participants]; arr[i].college_id = e.target.value; setParticipants(arr);
                          }}
                          className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 ${errors[`p${i}_college_id`] ? 'border-red-400' : 'border-gray-300'}`}
                          placeholder="ENR-2024-001"
                        />
                      </div>
                      {errors[`p${i}_college_id`] && <p className="text-red-500 text-xs mt-0.5">{errors[`p${i}_college_id`]}</p>}
                    </div>
                  </div>
                </div>
              ))}

              {regType !== 'solo' && (
                <p className="text-xs text-gray-500 bg-indigo-50 p-3 rounded-lg border border-indigo-100 mb-4">
                  <strong>Note:</strong> Payment link, QR code, and status updates will be associated with Member 1 (Primary Contact).
                </p>
              )}

              <div className="flex justify-between mt-4">
                <button onClick={prevStep} className="btn-secondary flex items-center">
                  <ArrowLeft size={16} className="mr-1" /> Back
                </button>
                <button onClick={nextStep} className="btn-primary flex items-center">
                  Next <ArrowRight size={16} className="ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Payment */}
          {step === 3 && event.registration_fee > 0 && (
            <div className="card">
              <h3 className="text-lg font-bold mb-4">Payment</h3>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-6 text-center">
                <p className="text-sm text-indigo-600 font-medium mb-1">Amount to Pay</p>
                <p className="text-3xl font-extrabold text-indigo-700">₹{getTotalFee()}</p>
                {getMemberCount(regType) > 1 && (
                  <p className="text-xs text-indigo-500 mt-1">₹{event.registration_fee} × {getMemberCount(regType)} members</p>
                )}
              </div>

              {/* QR Code */}
              {event.qr_code_url && (
                <div className="text-center mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-3">Scan QR Code to Pay</p>
                  <img
                    src={event.qr_code_url}
                    alt="Payment QR Code"
                    className="mx-auto max-w-[220px] rounded-xl border border-gray-200 shadow-sm"
                  />
                </div>
              )}

              {/* UPI / Instructions */}
              {event.upi_id && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600"><strong>UPI ID:</strong> {event.upi_id}</p>
                </div>
              )}
              {event.payment_instructions && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-yellow-800 whitespace-pre-wrap">{event.payment_instructions}</p>
                </div>
              )}

              {/* Transaction Reference removed as per user request */}

              {/* Screenshot Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Screenshot *
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${errors.screenshot ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-indigo-400 bg-gray-50'
                    }`}
                >
                  {screenshotPreview ? (
                    <div>
                      <img src={screenshotPreview} alt="Preview" className="mx-auto max-h-48 rounded-lg mb-2" />
                      <p className="text-xs text-gray-500">{screenshot?.name}</p>
                      <p className="text-xs text-indigo-600 mt-1">Click to change</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                      <p className="text-sm text-gray-500">Click to upload payment screenshot</p>
                      <p className="text-xs text-gray-400 mt-1">JPEG, PNG, or WebP (max 5 MB)</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                {errors.screenshot && <p className="text-red-600 text-xs mt-1">{errors.screenshot}</p>}
              </div>

              <div className="flex justify-between mt-6">
                <button onClick={prevStep} className="btn-secondary flex items-center">
                  <ArrowLeft size={16} className="mr-1" /> Back
                </button>
                <button onClick={nextStep} className="btn-primary flex items-center">
                  Next <ArrowRight size={16} className="ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Submit */}
          {step === 4 && (
            <div className="card">
              <h3 className="text-lg font-bold mb-4">Review & Submit</h3>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">Event</h4>
                  <p className="font-medium text-gray-900">{event.title}</p>
                  <p className="text-sm text-gray-600">{department?.name} • {new Date(event.event_date).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-600 capitalize mt-1">Registration: {regType} {teamName && `• Team: ${teamName}`}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">Participants</h4>
                  {participants.map((p, i) => (
                    <div key={i} className="mb-2 last:mb-0">
                      <p className="text-sm font-medium text-gray-900">{i + 1}. {p.name}</p>
                      <p className="text-xs text-gray-500">{p.email} • {p.phone} • {p.college_id}</p>
                    </div>
                  ))}
                </div>

                {event.registration_fee > 0 && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">Payment</h4>
                    <p className="text-sm text-gray-900">Amount: ₹{getTotalFee()}{getMemberCount(regType) > 1 ? ` (₹${event.registration_fee} × ${getMemberCount(regType)})` : ''}</p>
                    <p className="text-sm text-gray-600">
                      Screenshot: {screenshot ? `✓ ${screenshot.name}` : 'Not uploaded'}
                    </p>
                  </div>
                )}
              </div>

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                  <p className="text-sm text-red-700">{errors.submit}</p>
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button onClick={prevStep} className="btn-secondary flex items-center" disabled={submitting}>
                  <ArrowLeft size={16} className="mr-1" /> Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-8 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors disabled:bg-green-300 flex items-center"
                >
                  {submitting ? (
                    <><Loader className="animate-spin mr-2" size={18} /> Submitting...</>
                  ) : (
                    'Submit Registration'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Confirmation */}
          {step === 5 && (
            <div className="card text-center py-10">
              <CheckCircle className="text-green-500 mx-auto mb-4" size={64} />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Submitted!</h2>
              <p className="text-gray-500 mb-6">
                Your registration is pending review. You'll receive updates at your email.
              </p>

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 mb-6 max-w-sm mx-auto">
                <p className="text-xs text-indigo-600 font-bold uppercase mb-1">Your Registration Number</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <p className="text-2xl font-mono font-bold text-indigo-700 select-all">{registrationId}</p>
                  <button
                    onClick={copyRegId}
                    className="p-2 rounded-lg hover:bg-indigo-100 transition-colors text-indigo-600"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
                {copied && <p className="text-xs text-green-600 mt-1 font-medium">Copied to clipboard!</p>}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 max-w-sm mx-auto">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Save this number!</strong> Use it to track your registration status and download your slip after approval.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to={`/track`} className="btn-primary inline-flex items-center justify-center">
                  <Search size={16} className="mr-1" /> Track Status
                </Link>
                <Link to="/" className="btn-secondary inline-flex items-center justify-center">
                  Back to Home
                </Link>
              </div>

              <p className="text-xs text-gray-400 mt-6">You will be redirected to the home page in 15 seconds...</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
