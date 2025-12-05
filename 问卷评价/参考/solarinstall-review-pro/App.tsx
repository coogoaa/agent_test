import React, { useState } from 'react';
import {
  ShieldCheck,
  Zap,
  Wrench,
  Headphones,
  Info,
  CheckCircle2,
  CalendarDays,
  AlertCircle,
  HardHat,
  Search,
  FileText
} from 'lucide-react';
import { StarRating } from './components/StarRating';
import { ImageUpload } from './components/ImageUpload';
import { SearchableSelect } from './components/SearchableSelect';
import { DatePicker } from './components/DatePicker';
import { Autocomplete } from './components/Autocomplete';
import {
  ReviewFormState,
  COMPONENT_LABELS,
  ComponentType
} from './types';
import {
  SYSTEM_SIZES,
  RESPONSE_TIMES,
  BRANDS,
  INSTALLERS
} from './constants';

const INITIAL_COMPONENT_STATE = {
  brand: '',
  customBrand: '',
  rating: 0,
  review: '',
  isTooEarly: false,
};

const INITIAL_STATE: ReviewFormState = {
  installerName: '',
  ratings: {
    costEffectiveness: 0,
    performance: 0,
    installation: 0,
    clientSupport: 0,
  },
  reviewDescription: '',
  reviewImages: [],
  installerResponseTime: '',
  isQuoteOnly: false,
  installationDate: '',
  systemSize: '',
  systemCost: '',
  components: {
    inverter: { ...INITIAL_COMPONENT_STATE },
    panel: { ...INITIAL_COMPONENT_STATE },
    battery: { ...INITIAL_COMPONENT_STATE },
    evCharger: { ...INITIAL_COMPONENT_STATE },
    heatPump: { ...INITIAL_COMPONENT_STATE },
  },
  proofOfPurchase: [],
  customer: {
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    postCode: '',
  },
};

const RATING_FIELDS = [
  { id: 'costEffectiveness', label: 'Cost-Effectiveness' },
  { id: 'performance', label: 'System Performance & Reliability' },
  { id: 'installation', label: 'Installation Experience' },
  { id: 'clientSupport', label: 'Client Support Services' },
] as const;

export default function App() {
  const [formData, setFormData] = useState<ReviewFormState>(INITIAL_STATE);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateRating = (field: keyof ReviewFormState['ratings'], value: number) => {
    setFormData(prev => ({
      ...prev,
      ratings: { ...prev.ratings, [field]: value }
    }));
  };

  const updateComponent = (
    type: ComponentType,
    field: keyof typeof INITIAL_COMPONENT_STATE,
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      components: {
        ...prev.components,
        [type]: {
          ...prev.components[type],
          [field]: value
        }
      }
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const { firstName, lastName, email, phone, postCode } = formData.customer;

    // Validate Installer
    if (!formData.installerName.trim()) {
      newErrors.installerName = 'Please select or enter an installer name';
    }

    // Validate Customer Details
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s\+\-\(\)]{8,20}$/.test(phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!postCode.trim()) {
      newErrors.postCode = 'Post code is required';
    } else if (!/^[0-9a-zA-Z]{3,10}$/.test(postCode)) {
      newErrors.postCode = 'Please enter a valid post code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Simulate validation and API call
      console.log('Submitting:', formData);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Scroll to the first error
      const errorFieldId = errors.installerName ? 'installer-section' : 'customer-details';
      const section = document.getElementById(errorFieldId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleInputChange = (field: keyof typeof formData.customer, value: string) => {
    setFormData(prev => ({
      ...prev,
      customer: { ...prev.customer, [field]: value }
    }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Submitted!</h2>
          <p className="text-gray-600 mb-8">
            Thank you for your feedback. Your review helps others make informed decisions about their solar journey.
          </p>
          <button
            onClick={() => {
              setFormData(INITIAL_STATE);
              setSubmitted(false);
              setErrors({});
            }}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Submit Another Review
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-24">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-400 rounded-lg flex items-center justify-center shadow-sm">
            <Zap className="text-white w-6 h-6 fill-current" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">SolarInstall Review</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        
        {/* Section 0: Select Installer */}
        <section id="installer-section" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 scroll-mt-24">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
            <HardHat className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Select Solar Installer</h2>
            <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full ml-auto">Required</span>
          </div>

          <div>
             <label className="block font-medium text-gray-700 mb-2">Which company installed your solar system?</label>
             <Autocomplete
              options={INSTALLERS}
              value={formData.installerName}
              onChange={(val) => {
                setFormData(prev => ({ ...prev, installerName: val }));
                if (errors.installerName) {
                  setErrors(prev => { const n = { ...prev }; delete n.installerName; return n; });
                }
              }}
              placeholder="Search for an installer or type a new name..."
              icon={<Search className="w-5 h-5" />}
              error={errors.installerName}
             />
          </div>
        </section>

        {/* Section 1: Rate your experience */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Rate your experience</h2>
            <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full ml-auto">Required</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
            {RATING_FIELDS.map((item) => (
              <div key={item.id} className="flex flex-col gap-2">
                <label className="font-medium text-gray-700">{item.label}</label>
                <StarRating
                  value={formData.ratings[item.id]}
                  onChange={(val) => updateRating(item.id, val)}
                  size="lg"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Your Review */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
           <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
            <Wrench className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Your Review</h2>
          </div>

          <div className="space-y-6">
            <div className="relative">
              <label className="block font-medium text-gray-700 mb-2">
                Review Description
                <span className="ml-2 text-sm font-normal text-gray-500">
                  (Please focus on the installer service, not just the product brands)
                </span>
              </label>
              <textarea
                value={formData.reviewDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, reviewDescription: e.target.value.slice(0, 500) }))}
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all min-h-[120px]"
                placeholder="Share your experience with the installation team..."
              />
              <div className="flex justify-end items-center mt-2">
                <span className="text-xs text-gray-400">
                  {formData.reviewDescription.length}/500 characters
                </span>
              </div>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-2">Upload Photos</label>
              <ImageUpload
                images={formData.reviewImages}
                onChange={(files) => setFormData(prev => ({ ...prev, reviewImages: files }))}
                label="Add Installation Photos"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-2">Installer Response Time</label>
              <div className="flex flex-wrap gap-3">
                {RESPONSE_TIMES.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, installerResponseTime: opt.value }))}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      formData.installerResponseTime === opt.value
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: System Information */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-all duration-300">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
            <Info className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">About your system</h2>
          </div>

          <div className="mb-6">
            <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all duration-200 ${formData.isQuoteOnly ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}>
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.isQuoteOnly ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                {formData.isQuoteOnly && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
              <input
                type="checkbox"
                checked={formData.isQuoteOnly}
                onChange={(e) => setFormData(prev => ({ ...prev, isQuoteOnly: e.target.checked }))}
                className="hidden"
              />
              <span className={`font-medium ${formData.isQuoteOnly ? 'text-blue-700' : 'text-gray-700'}`}>
                I did not proceed with this installer (Quote only)
              </span>
            </label>
          </div>

          {!formData.isQuoteOnly && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <CalendarDays className="w-4 h-4" /> Date Installation Completed
                </label>
                <DatePicker
                  value={formData.installationDate}
                  onChange={(val) => setFormData(prev => ({ ...prev, installationDate: val }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Size</label>
                <SearchableSelect
                  options={SYSTEM_SIZES}
                  value={formData.systemSize}
                  onChange={(val) => setFormData(prev => ({ ...prev, systemSize: val }))}
                  placeholder="Select capacity..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Total System Cost</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input
                    type="text"
                    placeholder="0.00"
                    value={formData.systemCost}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d*$/.test(val)) {
                        setFormData(prev => ({ ...prev, systemCost: val }));
                      }
                    }}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">For review display, this will be shown as a range.</p>
              </div>
            </div>
          )}
        </section>

        {/* Section 4: Component Details (Optional) - Hidden if Quote Only */}
        {!formData.isQuoteOnly && (
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
              <Zap className="w-6 h-6 text-amber-500" />
              <h2 className="text-xl font-bold text-gray-800">Component Details</h2>
              <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full ml-auto">Optional</span>
            </div>

            <div className="space-y-8">
              {(Object.keys(formData.components) as ComponentType[]).map((type) => {
                const comp = formData.components[type];
                return (
                  <div key={type} className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-4">{COMPONENT_LABELS[type]}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="col-span-1 md:col-span-2">
                         <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Brand</label>
                         <SearchableSelect
                          options={BRANDS[type] || []}
                          value={comp.brand}
                          onChange={(val) => updateComponent(type, 'brand', val)}
                          placeholder={`Search ${COMPONENT_LABELS[type]} brand...`}
                        />
                        {comp.brand === 'Other' && (
                          <div className="mt-3 animate-in fade-in slide-in-from-top-1">
                            <input 
                              type="text" 
                              placeholder="Please specify brand name..."
                              value={comp.customBrand}
                              onChange={(e) => updateComponent(type, 'customBrand', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Only show rating/review if a brand is selected */}
                    {comp.brand && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center mb-4">
                          <input
                            type="checkbox"
                            id={`early-${type}`}
                            checked={comp.isTooEarly}
                            onChange={(e) => updateComponent(type, 'isTooEarly', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <label htmlFor={`early-${type}`} className="ml-2 text-sm text-gray-700 select-none">
                            Too early to tell (Skip rating)
                          </label>
                        </div>

                        {!comp.isTooEarly && (
                          <div className="space-y-4 border-t border-gray-200 pt-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Performance Rating</label>
                              <StarRating
                                value={comp.rating}
                                onChange={(val) => updateComponent(type, 'rating', val)}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Component Review</label>
                              <textarea
                                value={comp.review}
                                onChange={(e) => updateComponent(type, 'review', e.target.value)}
                                className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                                placeholder={`Specific feedback about the ${comp.brand === 'Other' ? (comp.customBrand || 'component') : comp.brand}...`}
                                rows={2}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="pt-4 border-t border-gray-100">
                <label className="block font-medium text-gray-700 mb-2">Proof of Purchase (Invoice)</label>
                <ImageUpload
                  images={formData.proofOfPurchase}
                  onChange={(files) => setFormData(prev => ({ ...prev, proofOfPurchase: files }))}
                  maxFiles={1}
                  label="Upload Invoice"
                />
                <p className="text-xs text-gray-400 mt-1">Required for verified buyer badge.</p>
              </div>
            </div>
          </section>
        )}

        {/* Section 5: Customer Information */}
        <section id="customer-details" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 scroll-mt-24">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
            <Headphones className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Your Details</h2>
            <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full ml-auto">All Required</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={formData.customer.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                  errors.firstName 
                    ? 'border-red-500 focus:ring-red-100' 
                    : 'border-gray-300 focus:ring-blue-100'
                }`}
                placeholder="John"
              />
              {errors.firstName && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600 animate-in slide-in-from-top-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.firstName}</span>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={formData.customer.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                  errors.lastName 
                    ? 'border-red-500 focus:ring-red-100' 
                    : 'border-gray-300 focus:ring-blue-100'
                }`}
                placeholder="Doe"
              />
              {errors.lastName && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600 animate-in slide-in-from-top-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.lastName}</span>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.customer.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                  errors.email 
                    ? 'border-red-500 focus:ring-red-100' 
                    : 'border-gray-300 focus:ring-blue-100'
                }`}
                placeholder="john.doe@example.com"
              />
              {errors.email && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600 animate-in slide-in-from-top-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.email}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.customer.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                  errors.phone 
                    ? 'border-red-500 focus:ring-red-100' 
                    : 'border-gray-300 focus:ring-blue-100'
                }`}
                placeholder="+61 400 000 000"
              />
              {errors.phone && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600 animate-in slide-in-from-top-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.phone}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Post Code</label>
              <input
                type="text"
                value={formData.customer.postCode}
                onChange={(e) => handleInputChange('postCode', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                  errors.postCode 
                    ? 'border-red-500 focus:ring-red-100' 
                    : 'border-gray-300 focus:ring-blue-100'
                }`}
                placeholder="2000"
              />
              {errors.postCode && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600 animate-in slide-in-from-top-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.postCode}</span>
                </div>
              )}
            </div>
          </div>
        </section>

      </main>

      {/* Persistent CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
           <div className="hidden md:block text-sm text-gray-500">
             {Object.keys(errors).length > 0 ? (
                <span className="text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Please fix the highlighted errors before submitting.
                </span>
             ) : (
                "Ensure all required fields are filled before submitting."
             )}
           </div>
           <button
             onClick={handleSubmit}
             className="w-full md:w-auto md:min-w-[200px] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-transform active:scale-95"
           >
             Submit Feedback
           </button>
        </div>
      </div>
    </div>
  );
}