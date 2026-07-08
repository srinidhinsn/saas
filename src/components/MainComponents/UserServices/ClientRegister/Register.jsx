import React, { useEffect, useState } from 'react';
import {
  Building2,
  UserPlus,
  User,
  Lock,
  Mail,
  Phone,
  MapPin,
  Globe,
  Hash,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_USER_SERVICE_URL;

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const inputStyle = {
  borderColor: '#e5e7eb',
  backgroundColor: '#ffffff',
  color: '#111827',
};

const focusInput = (e) => {
  e.target.style.borderColor = '#f97316';
  e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
};

const blurInput = (e) => {
  e.target.style.borderColor = '#e5e7eb';
  e.target.style.boxShadow = 'none';
};

// ─── Reusable field ─────────────────────────────────────────────────────────
const Field = ({ icon: Icon, label, type = 'text', name, value, onChange, placeholder, required = false }) => (
  <div>
    <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
      {label}{required && <span style={{ color: '#f97316' }}> *</span>}
    </label>
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9ca3af' }}>
        <Icon size={20} />
      </div>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full pl-12 pr-4 py-3 border-2 rounded-lg text-base transition-all outline-none"
        style={inputStyle}
        onFocus={focusInput}
        onBlur={blurInput}
      />
    </div>
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: '#f97316' }}>
    {children}
  </h3>
);

export default function RegisterPage({ onRegisterSuccess }) {
  const navigate = useNavigate();
  const { clientId: routeClientId } = useParams();

  const [regType, setRegType] = useState('merchant'); // 'merchant' | 'user'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [realmOptions, setRealmOptions] = useState([]);
  const [business, setBusiness] = useState({ client_name: '', client_id: '', realm: '' });
  const [person, setPerson] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [address, setAddress] = useState({
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    country: '',
  });
  const [credentials, setCredentials] = useState({ username: '', password: '', confirm_password: '' });

  useEffect(() => {
    if (regType !== "merchant") return;
  
    const fetchRealms = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/${routeClientId || "saas"}/users/realms?realm=realm`
        );
  
        if (!res.ok) throw new Error();
  
        const data = await res.json();
  
        setRealmOptions(
          (data.data.realms || []).map(r => ({
            value: r,
            label: r
          }))
        );
      } catch (err) {
        console.error("Failed to load realms", err);
        setRealmOptions([]);
      }
    };
  
    fetchRealms();
  }, [regType, routeClientId]);

  // ── Keep client_id in sync with client_name unless the user edits it ──
  const [clientIdTouched, setClientIdTouched] = useState(false);
  const handleBusinessNameChange = (e) => {
    const value = e.target.value;
    setBusiness((prev) => ({
      ...prev,
      client_name: value,
      client_id: clientIdTouched ? prev.client_id : slugify(value),
    }));
    setError('');
  };
  const handleClientIdChange = (e) => {
    setClientIdTouched(true);
    setBusiness((prev) => ({ ...prev, client_id: slugify(e.target.value) }));
  };

  const handleChange = (setter) => (e) => {
    const { name, value } = e.target;
    setter((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const validate = () => {
    if (regType === 'merchant') {
      if (!business.client_name || !business.client_id || !business.realm) {
        return 'Please complete all business details, including realm.';
      }
    }
    if (!person.first_name || !person.email || !person.phone) {
      return 'Please complete the contact / person details.';
    }
    if (!address.address_line1 || !address.city || !address.pincode || !address.country) {
      return 'Please complete the address details.';
    }
    if (!credentials.username || !credentials.password) {
      return 'Please choose a username and password.';
    }
    if (credentials.password !== credentials.confirm_password) {
      return 'Passwords do not match.';
    }
    return '';
  };

  // Best-guess UserModel payload - adjust field names to match your schema.
  const buildUserPayload = () => {
    if (regType === 'user') {
      return {
        username: credentials.username,
        password: credentials.password,
        first_name: person.first_name,
        last_name: person.last_name,
        email: person.email,
        phone: person.phone,
        // Fixed defaults for the "super user" registration path per spec.
        realm: 'super_user',
        grants: ['super_user'],
      };
    }
    return {
      username: credentials.username,
      password: credentials.password,
      first_name: person.first_name,
      last_name: person.last_name,
      email: person.email,
      phone: person.phone,
      realm: business.realm,
      // Registering merchant is treated as the admin / point of contact.
      grants: ['admin'],
    };
  };

  // Best-guess AddressModel payload - adjust field names to match your schema.
  const buildAddressPayload = () => ({
    address_line1: address.address_line1,
    address_line2: address.address_line2,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: address.country,
    is_primary: true,
  });

  const handleRegister = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSubmitting(true);

    // "user" registrations always live under the fixed "user" tenant per spec;
    // merchant registrations mint a brand-new client_id.
    const effectiveClientId = regType === 'user' ? 'user' : business.client_id;

    try {
      // 1) Merchant only: create the Client (tenant) record first.
      if (regType === 'merchant') {
        // TODO(api): placeholder endpoint - no client-creation route exists
        // in the provided user_routes.py yet. Point this at the real one.
        const clientRes = await fetch(`${API_BASE}/${effectiveClientId}/users/client-register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: business.client_id,
            client_name: business.client_name,
            realm: business.realm,
          }),
        });
        if (!clientRes.ok) {
          const errData = await clientRes.json().catch(() => ({}));
          throw new Error(errData.detail || 'Could not create the business account.');
        }
      }

      // 2) Create the person + user record.
      const registerRes = await fetch(`${API_BASE}/${effectiveClientId}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildUserPayload()),
      });
      if (!registerRes.ok) {
        const errData = await registerRes.json().catch(() => ({}));
        throw new Error(errData.detail || 'Registration failed.');
      }

      // 3) Log in immediately to obtain a token, since /address requires one.
      const loginRes = await fetch(`${API_BASE}/${effectiveClientId}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: credentials.username, password: credentials.password }),
      });
      if (!loginRes.ok) {
        throw new Error('Account created, but automatic login failed. Please log in manually.');
      }
      const loginData = await loginRes.json();
      const accessToken = loginData?.data?.access_token;
      const refreshToken = loginData?.data?.refresh_token;
      const screenId = loginData?.screen_id;

      // 4) Save the address using the freshly-issued token.
      const addressRes = await fetch(`${API_BASE}/${effectiveClientId}/users/address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(buildAddressPayload()),
      });
      if (!addressRes.ok) {
        const errData = await addressRes.json().catch(() => ({}));
        throw new Error(errData.detail || 'Account created, but saving the address failed.');
      }

      setSuccess(true);

      if (onRegisterSuccess) {
        onRegisterSuccess(accessToken, refreshToken, screenId, effectiveClientId);
      }

      setTimeout(() => {
        navigate(`/saas/${effectiveClientId}/login`, { replace: true });
      }, 1800);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-[9999]">
        <div className="text-center">
          <CheckCircle size={72} style={{ color: '#f97316' }} className="mx-auto" />
          <h1 className="mt-6 text-3xl font-bold" style={{ color: '#111827' }}>
            You're all set!
          </h1>
          <p className="mt-2" style={{ color: '#6b7280' }}>
            Redirecting you to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f9fafb' }}>
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-xl shadow-md p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
              style={{ backgroundColor: '#f97316' }}
            >
              <UserPlus size={28} className="text-white" />
            </div>
            <h2 className="text-2xl font-semibold" style={{ color: '#111827' }}>
              Create an Account
            </h2>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
              Register a new business, or create a super user account
            </p>
          </div>

          {/* Registration type toggle */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <button
              type="button"
              onClick={() => setError('') || setRegType('merchant')}
              className="flex items-center justify-center gap-2 py-3 rounded-lg font-semibold border-2 transition-all"
              style={{
                borderColor: regType === 'merchant' ? '#f97316' : '#e5e7eb',
                backgroundColor: regType === 'merchant' ? '#fff7ed' : '#ffffff',
                color: regType === 'merchant' ? '#f97316' : '#6b7280',
              }}
            >
              <Building2 size={18} />
              Merchant
            </button>
            <button
              type="button"
              onClick={() => setError('') || setRegType('user')}
              className="flex items-center justify-center gap-2 py-3 rounded-lg font-semibold border-2 transition-all"
              style={{
                borderColor: regType === 'user' ? '#f97316' : '#e5e7eb',
                backgroundColor: regType === 'user' ? '#fff7ed' : '#ffffff',
                color: regType === 'user' ? '#f97316' : '#6b7280',
              }}
            >
              <User size={18} />
              Super User
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex items-center gap-2 text-red-600">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-8">
            {/* Business details - merchant only */}
            {regType === 'merchant' && (
              <div>
                <SectionTitle>Business Details</SectionTitle>
                <div className="space-y-4">
                  <Field
                    icon={Building2}
                    label="Business Name"
                    name="client_name"
                    value={business.client_name}
                    onChange={handleBusinessNameChange}
                    placeholder="e.g. Spice Route Kitchen"
                    required
                  />
                  <Field
                    icon={Hash}
                    label="Client ID"
                    name="client_id"
                    value={business.client_id}
                    onChange={handleClientIdChange}
                    placeholder="auto-generated from business name"
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
                      Realm <span style={{ color: '#f97316' }}>*</span>
                    </label>
                    <div className="relative">
                      <div
                        className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: '#9ca3af' }}
                      >
                        <Globe size={20} />
                      </div>
                      <select
                        name="realm"
                        value={business.realm}
                        onChange={handleChange(setBusiness)}
                        className="w-full pl-12 pr-4 py-3 border-2 rounded-lg text-base transition-all outline-none appearance-none"
                        style={inputStyle}
                        onFocus={focusInput}
                        onBlur={blurInput}
                      >
                        <option value="">Select a realm</option>
                        {realmOptions.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Point of contact / super user person details */}
            <div>
              <SectionTitle>{regType === 'merchant' ? 'Point of Contact' : 'Your Details'}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  icon={User}
                  label="First Name"
                  name="first_name"
                  value={person.first_name}
                  onChange={handleChange(setPerson)}
                  placeholder="First name"
                  required
                />
                <Field
                  icon={User}
                  label="Last Name"
                  name="last_name"
                  value={person.last_name}
                  onChange={handleChange(setPerson)}
                  placeholder="Last name"
                />
                <Field
                  icon={Mail}
                  label="Email"
                  type="email"
                  name="email"
                  value={person.email}
                  onChange={handleChange(setPerson)}
                  placeholder="name@example.com"
                  required
                />
                <Field
                  icon={Phone}
                  label="Phone"
                  type="tel"
                  name="phone"
                  value={person.phone}
                  onChange={handleChange(setPerson)}
                  placeholder="Phone number"
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <SectionTitle>Address</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Field
                    icon={MapPin}
                    label="Address Line 1"
                    name="address_line1"
                    value={address.address_line1}
                    onChange={handleChange(setAddress)}
                    placeholder="Street address"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Field
                    icon={MapPin}
                    label="Address Line 2"
                    name="address_line2"
                    value={address.address_line2}
                    onChange={handleChange(setAddress)}
                    placeholder="Apartment, suite, etc. (optional)"
                  />
                </div>
                <Field
                  icon={MapPin}
                  label="City"
                  name="city"
                  value={address.city}
                  onChange={handleChange(setAddress)}
                  placeholder="City"
                  required
                />
                <Field
                  icon={MapPin}
                  label="State"
                  name="state"
                  value={address.state}
                  onChange={handleChange(setAddress)}
                  placeholder="State"
                />
                <Field
                  icon={Hash}
                  label="Pincode"
                  name="pincode"
                  value={address.pincode}
                  onChange={handleChange(setAddress)}
                  placeholder="Postal / ZIP code"
                  required
                />
                <Field
                  icon={Globe}
                  label="Country"
                  name="country"
                  value={address.country}
                  onChange={handleChange(setAddress)}
                  placeholder="Country"
                  required
                />
              </div>
            </div>

            {/* Credentials */}
            <div>
              <SectionTitle>Login Credentials</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Field
                    icon={User}
                    label="Username"
                    name="username"
                    value={credentials.username}
                    onChange={handleChange(setCredentials)}
                    placeholder="Choose a username"
                    required
                  />
                </div>
                <Field
                  icon={Lock}
                  label="Password"
                  type="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleChange(setCredentials)}
                  placeholder="Choose a password"
                  required
                />
                <Field
                  icon={Lock}
                  label="Confirm Password"
                  type="password"
                  name="confirm_password"
                  value={credentials.confirm_password}
                  onChange={handleChange(setCredentials)}
                  placeholder="Re-enter password"
                  required
                />
              </div>
            </div>

            <button
              onClick={handleRegister}
              disabled={submitting}
              className="w-full py-3.5 rounded-lg text-base font-semibold tracking-wide transition-all shadow-sm"
              style={{
                backgroundColor: submitting ? '#d1d5db' : '#f97316',
                color: '#ffffff',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Creating account...' : regType === 'merchant' ? 'Register Business' : 'Create Super User'}
            </button>

            <p className="text-center text-xs" style={{ color: '#9ca3af' }}>
              Already have an account?{' '}
              <span
                className="font-medium cursor-pointer"
                style={{ color: '#f97316' }}
                onClick={() => navigate(routeClientId ? `/saas/${routeClientId}/login` : '/saas/easyfood/login')}
              >
                Log in
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}