import { HelpCircle, Phone, Mail, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const FAQS = [
    {
        question: "How do I register for an event?",
        answer: "Browse through the departments on the home page, select a department to see its events, then click 'View Details & Register' on the event you're interested in."
    },
    {
        question: "Can I register for multiple events?",
        answer: "Yes, you can register for as many events as you like, as long as they don't have conflicting schedules."
    },
    {
        question: "How can I track my registration status?",
        answer: "Go to the 'Track Status' page in the navigation bar and enter your registration email or ID to see your current status."
    },
    {
        question: "What should I do if my payment fails?",
        answer: "If your payment fails but the amount is deducted, please contact our support team with your transaction details. If not deducted, try again after some time."
    }
];

export function HelpPage() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const toggleFaq = (index: number) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 animate-fadeIn">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-4">How can we help?</h1>
                <p className="text-lg text-gray-600">
                    Find answers to common questions or reach out to our support team.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                <div className="card text-center flex flex-col items-center">
                    <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4 border border-indigo-200 shadow-inner">
                        <Phone size={28} className="text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Call Us</h3>
                    <p className="text-gray-600 mb-4">Direct support for urgent queries.</p>
                    <p>Vismay</p>
                    <a href="tel:+8160901181" className="text-indigo-600 font-bold text-lg hover:underline transition-all">
                        +91 8160901181
                    </a>
                    <p>Manav</p>
                    <a href="tel:+9157014353" className="text-indigo-600 font-bold text-lg hover:underline transition-all">
                        +91 9157014353
                    </a>
                </div>

                <div className="card text-center flex flex-col items-center">
                    <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-3 border border-purple-200 shadow-inner">
                        <Mail size={28} className="text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Email Support</h3>
                    <p className="text-gray-600 mb-4">Get support via official email.</p>
                    <a href="mailto:support@techfest.college.edu" className="text-purple-600 font-bold text-lg hover:underline transition-all">
                        support@gmail.com
                    </a>
                </div>

                <div className="card text-center flex flex-col items-center">
                    <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-4 border border-green-200 shadow-inner">
                        <MessageSquare size={28} className="text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Live Chat</h3>
                    <p className="text-gray-600 mb-4">Chat with us on WhatsApp.</p>
                    <a href="https://wa.me/919157014353" target="_blank" rel="noopener noreferrer" className="text-green-600 font-bold text-lg hover:underline transition-all">
                        WhatsApp Support
                    </a>
                </div>
            </div>

            <div className="card shadow-2xl shadow-indigo-100/30">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
                    <HelpCircle className="text-indigo-600" size={28} />
                    <h2 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
                </div>

                <div className="space-y-4">
                    {FAQS.map((faq, index) => (
                        <div
                            key={index}
                            className="border border-gray-100 rounded-2xl overflow-hidden transition-all duration-300 hover:border-indigo-200"
                        >
                            <button
                                className="w-full text-left px-6 py-4 flex items-center justify-between bg-white hover:bg-indigo-50/30 transition-colors"
                                onClick={() => toggleFaq(index)}
                            >
                                <span className="font-semibold text-gray-800">{faq.question}</span>
                                {openFaq === index ? <ChevronUp size={20} className="text-indigo-600" /> : <ChevronDown size={20} className="text-gray-400" />}
                            </button>
                            <div
                                className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openFaq === index ? 'py-4 max-h-40' : 'max-h-0'}`}
                            >
                                <p className="text-gray-600 leading-relaxed">
                                    {faq.answer}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
