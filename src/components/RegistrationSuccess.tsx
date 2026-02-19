import { CheckCircle, X } from 'lucide-react';

interface RegistrationSuccessProps {
  registrationId: string;
  eventTitle: string;
  onClose: () => void;
}

export function RegistrationSuccess({
  registrationId,
  eventTitle,
  onClose,
}: RegistrationSuccessProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Registration Successful!</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col items-center text-center mb-6">
            <CheckCircle className="text-green-500 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              You're all set!
            </h3>
            <p className="text-gray-600 mb-4">
              Your registration for <span className="font-semibold">{eventTitle}</span> has been confirmed.
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 mb-2">Your Registration ID:</p>
            <p className="text-2xl font-bold text-blue-600 tracking-wide">
              {registrationId}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Please save this ID for your records
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-800">
              A confirmation email has been sent to your registered email address with all event details.



            </p>
            <p className="text-sm text-green-800">
              <b>Note* : The payment link usually requires 5 to 10 minutes to be activated.</b>



            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
