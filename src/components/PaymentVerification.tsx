import { useState } from 'react';
import { X, Search, Loader, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PaymentVerificationProps {
    onClose: () => void;
}

export function PaymentVerification({ onClose }: PaymentVerificationProps) {
    const [registrationId, setRegistrationId] = useState('');
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [registration, setRegistration] = useState<any>(null);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!registrationId.trim()) return;

        setSearching(true);
        setError(null);
        setRegistration(null);

        try {
            const { data, error } = await supabase
                .from('registrations')
                .select('*, events(title)')
                .eq('registration_id', registrationId.trim().toUpperCase())
                .single();

            if (error) {
                setError('Registration not found. Please check your ID.');
            } else {
                setRegistration(data);
            }
        } catch (err) {
            setError('An error occurred while searching.');
        } finally {
            setSearching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!registration) return;

        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from('registrations')
                .update({
                    status: 'pending' // Ensure it's pending for admin review
                })
                .eq('id', registration.id);

            if (updateError) throw updateError;

            // Trigger automated "Payment Received" confirmation email
            await supabase.functions.invoke('send-confirmation', {
                body: {
                    email: registration.email,
                    name: registration.name,
                    registration_id: registration.registration_id,
                    event_title: registration.events?.title || 'Event',
                    type: 'receipt'
                }
            });

            setSuccess(true);
        } catch (err) {
            console.error('Submission error:', err);
            setError('Failed to update payment ID. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Verify Payment</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {success ? (
                        <div className="text-center py-8">
                            <CheckCircle className="text-green-500 mx-auto mb-4" size={64} />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Payment ID Submitted!</h3>
                            <p className="text-gray-600 mb-6">
                                Thank you. Our team will verify your payment and send a confirmation mail to your registered email address shortly.
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <>
                            {!registration ? (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-600">
                                        Enter your Registration ID to find your registration and submit the Payment ID.
                                    </p>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Registration ID</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="text"
                                                    value={registrationId}
                                                    onChange={(e) => setRegistrationId(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                                                    placeholder="REG-XXXXXX"
                                                />
                                            </div>
                                            <button
                                                onClick={handleSearch}
                                                disabled={searching || !registrationId.trim()}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex items-center"
                                            >
                                                {searching ? <Loader className="animate-spin" size={18} /> : 'Search'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                                        <p className="text-xs text-blue-600 font-bold uppercase mb-1">Found Registration</p>
                                        <p className="text-sm font-bold text-gray-900">{registration.name}</p>
                                        <p className="text-xs text-gray-600">{registration.events?.title}</p>
                                        <button
                                            type="button"
                                            onClick={() => setRegistration(null)}
                                            className="text-xs text-blue-600 mt-2 hover:underline"
                                        >
                                            Change Registration ID
                                        </button>
                                    </div>

                                    {/* Transaction ID removed as per user request */}
                                    {error && <p className="text-sm text-red-600">{error}</p>}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex items-center justify-center"
                                    >
                                        {loading ? <Loader className="animate-spin mr-2" size={18} /> : 'Submit Confirmation'}
                                    </button>
                                </form>
                            )}
                            {error && !registration && <p className="text-sm text-red-600 mt-2">{error}</p>}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
