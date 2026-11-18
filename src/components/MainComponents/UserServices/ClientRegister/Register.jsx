import React, { useEffect, useState } from 'react';
import axios from 'axios';
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

// ─── Reusable field with inline error support ──────────────────────────────
const Field = ({ icon: Icon, label, type = 'text', name, value, onChange, placeholder, required = false, error }) => (
  <div>
    <label className="block mb-1 text-micro font-bold uppercase tracking-wide text-ink-muted">
      {label}{required && <span className="text-brand"> *</span>}
    </label>
    <div className="relative">
      <div
        className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${error ? 'text-state-occupied' : 'text-ink-faint'}`}
      >
        <Icon size={16} />
      </div>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`ui-input h-11${error ? ' !border-state-occupied !bg-state-occupied-bg' : ''}`}
      />
    </div>
    {error && (
      <p className="mt-1.5 text-micro font-semibold flex items-center gap-1 text-state-occupied">
        <AlertCircle size={12} />
        {error}
      </p>
    )}
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 className="text-ui font-bold uppercase tracking-wide mb-4 text-brand-dark">
    {children}
  </h3>
);

export default function RegisterPage({ onRegisterSuccess }) {
  const navigate = useNavigate();
  const { clientId: routeClientId } = useParams();

  const [regType, setRegType] = useState('merchant'); // 'merchant' | 'user'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [duplicateClientModal, setDuplicateClientModal] = useState(false);

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
    if (regType !== 'merchant') return;
    const fetchRealms = async () => {
      try {
        const res = await axios.get(
          `${API_BASE}/${routeClientId || 'saas'}/users/realms`,
          { params: { realm: 'realm' },
          headers: { 'Content-Type': 'application/json' }, }
        );
        setRealmOptions(
          (res.data?.data?.realms || []).map((r) => ({ value: r, label: r }))
        );
      } catch (err) {
        console.error('Failed to load realms', err);
        setRealmOptions([]);
      }
    };
    fetchRealms();
  }, [regType, routeClientId]);

  // ── Clear a single field's error once the user edits it ──
  const clearFieldError = (name) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const [clientIdTouched, setClientIdTouched] = useState(false);
  const handleBusinessNameChange = (e) => {
    const value = e.target.value;
    setBusiness((prev) => ({
      ...prev,
      client_name: value,
      client_id: clientIdTouched ? prev.client_id : slugify(value),
    }));
    setError('');
    clearFieldError('client_name');
    clearFieldError('client_id');
  };
  const handleClientIdChange = (e) => {
    setClientIdTouched(true);
    setBusiness((prev) => ({ ...prev, client_id: slugify(e.target.value) }));
    clearFieldError('client_id');
  };

  const handleChange = (setter) => (e) => {
    const { name, value } = e.target;
    setter((prev) => ({ ...prev, [name]: value }));
    setError('');
    clearFieldError(name);
  };

  // ── Returns { fieldName: errorMessage } for every invalid/missing field ──
  const validateFields = () => {
    const errors = {};

    if (!business.client_name.trim()) errors.client_name = 'Please enter a name.';
    if (!business.client_id.trim()) errors.client_id = 'Client ID is required.';
    if (regType === 'merchant' && !business.realm) errors.realm = 'Please select a realm.';

    if (!person.first_name.trim()) errors.first_name = 'First name is required.';
    if (!person.email.trim()) errors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email)) errors.email = 'Enter a valid email.';
    if (!person.phone.trim()) errors.phone = 'Phone number is required.';

    // if (!address.address_line1.trim()) errors.address_line1 = 'Address is required.';
    // if (!address.city.trim()) errors.city = 'City is required.';
    // if (!address.pincode.trim()) errors.pincode = 'Pincode is required.';
    // if (!address.country.trim()) errors.country = 'Country is required.';

    if (!credentials.username.trim()) errors.username = 'Please choose a username.';
    if (!credentials.password) errors.password = 'Please choose a password.';
    if (!credentials.confirm_password) errors.confirm_password = 'Please confirm your password.';
    else if (credentials.password && credentials.password !== credentials.confirm_password) {
      errors.confirm_password = 'Passwords do not match.';
    }

    return errors;
  };

  const buildClientRegisterPayload = () => ({
    user: {
      first_name: person.first_name,
      last_name: person.last_name,
      email: person.email,
      phone: person.phone,
      username: credentials.username,
      password: credentials.password,
      roles: regType === 'merchant' ? ['admin'] : ['super_user'],
      grants: regType === 'merchant' ? ['admin'] : ['super_user'],
    },
    address: {
      address_line1: address.address_line1,
      address_line2: address.address_line2,
      city: address.city,
      state: address.state,
      country: address.country,
      pincode: address.pincode,
      contact_name: `${person.first_name} ${person.last_name || ''}`.trim(),
      contact_number: person.phone,
    },
    client: {
      id: business.client_id,
      name: business.client_name,
      realm: regType === 'merchant' ? business.realm : undefined,
    },
  });

  const handleRegister = async () => {
    const errors = validateFields();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please fix the highlighted fields below.');
      return;
    }

    setFieldErrors({});
    setError('');
    setSubmitting(true);

    const routeScopeClientId = routeClientId || 'saas';

    try {
      const res = await axios.post(
        `${API_BASE}/${routeScopeClientId}/users/client-register`,
        buildClientRegisterPayload(),
        { params: { reg_type: regType },
        headers: { 'Content-Type': 'application/json' }, }
      );

      const result = res.data;
      const accessToken = result?.data?.access_token;
      const refreshToken = result?.data?.refresh_token;
      const screenId = result?.data?.screen_id;
      const effectiveClientId = result?.data?.client_id;

      setSuccess(true);

      if (onRegisterSuccess) {
        onRegisterSuccess(accessToken, refreshToken, screenId, effectiveClientId);
      }

      setTimeout(() => {
        navigate(`/saas/${effectiveClientId}/login`, { replace: true });
      }, 1800);
    } catch (err) {
      const detail = err.response?.data?.detail;

      if (err.response?.status === 400 && detail?.toLowerCase().includes('client id already exists')) {
        setDuplicateClientModal(true);
      } else if (err.response?.status === 400 && detail?.toLowerCase().includes('username already exists')) {
        setFieldErrors((prev) => ({ ...prev, username: 'This username is already taken.' }));
        setError('Please fix the highlighted fields below.');
      } else {
        setError(detail || err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-surface z-[9999]">
        <div className="text-center">
          <CheckCircle size={72} className="mx-auto text-brand" />
          <h1 className="mt-6 text-heading-md text-ink">
            You're all set!
          </h1>
          <p className="mt-2 text-ui text-ink-muted">
            Redirecting you to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-canvas font-sans">
      <div className="w-full max-w-2xl">
        <div className="bg-surface border border-line border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg p-8 md:p-10">
          <div className="text-center mb-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-soft bg-brand"
            >
              <UserPlus size={28} className="text-white" />
            </div>
            <h2 className="text-page-title text-ink">
              Create an Account
            </h2>
            <p className="text-ui mt-1 text-ink-muted">
              Register a new business, or create a super user account
            </p>
          </div>

          <div className="ui-toggle flex w-full mb-8">
            <button
              type="button"
              onClick={() => {
                setError('');
                setFieldErrors({});
                setRegType('merchant');
              }}
              className={`ui-toggle-btn flex-1 flex items-center justify-center gap-2 h-10 ${regType === 'merchant' ? 'ui-toggle-btn-active' : ''}`}
            >
              <Building2 size={18} />
              Merchant
            </button>
            <button
              type="button"
              onClick={() => {
                setError('');
                setFieldErrors({});
                setRegType('user');
              }}
              className={`ui-toggle-btn flex-1 flex items-center justify-center gap-2 h-10 ${regType === 'user' ? 'ui-toggle-btn-active' : ''}`}
            >
              <User size={18} />
              User
            </button>
          </div>

          {error && (
            <div className="ui-error flex items-center gap-2 mb-6">
              <AlertCircle size={18} />
              <span className="text-ui">{error}</span>
            </div>
          )}

          <div className="space-y-8">
            <div>
              <SectionTitle>{regType === 'merchant' ? 'Business Details' : 'Account / Tenant Details'}</SectionTitle>
              <div className="space-y-4">
                <Field
                  icon={Building2}
                  label={regType === 'merchant' ? 'Business Name' : 'Account Name'}
                  name="client_name"
                  value={business.client_name}
                  onChange={handleBusinessNameChange}
                  placeholder={regType === 'merchant' ? 'e.g. Spice Route Kitchen' : 'e.g. Jane Doe Admin'}
                  required
                  error={fieldErrors.client_name}
                />
                <Field
                  icon={Hash}
                  label="Client ID"
                  name="client_id"
                  value={business.client_id}
                  onChange={handleClientIdChange}
                  placeholder="auto-generated from name"
                  required
                  error={fieldErrors.client_id}
                />

                {regType === 'merchant' && (
                  <div>
                    <label className="block mb-1 text-micro font-bold uppercase tracking-wide text-ink-muted">
                      Realm <span className="text-brand"> *</span>
                    </label>
                    <div className="relative">
                      <div
                        className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${fieldErrors.realm ? 'text-state-occupied' : 'text-ink-faint'}`}
                      >
                        <Globe size={16} />
                      </div>
                      <select
                        name="realm"
                        value={business.realm}
                        onChange={handleChange(setBusiness)}
                        className={`ui-input h-11 appearance-none${fieldErrors.realm ? ' !border-state-occupied !bg-state-occupied-bg' : ''}`}
                      >
                        <option value="">Select a realm</option>
                        {realmOptions.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    {fieldErrors.realm && (
                      <p className="mt-1.5 text-micro font-semibold flex items-center gap-1 text-state-occupied">
                        <AlertCircle size={12} />
                        {fieldErrors.realm}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

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
                  error={fieldErrors.first_name}
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
                  error={fieldErrors.email}
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
                  error={fieldErrors.phone}
                />
              </div>
            </div>

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
                    error={fieldErrors.address_line1}
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
                  error={fieldErrors.city}
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
                  error={fieldErrors.pincode}
                />
                <Field
                  icon={Globe}
                  label="Country"
                  name="country"
                  value={address.country}
                  onChange={handleChange(setAddress)}
                  placeholder="Country"
                  error={fieldErrors.country}
                />
              </div>
            </div>

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
                    error={fieldErrors.username}
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
                  error={fieldErrors.password}
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
                  error={fieldErrors.confirm_password}
                />
              </div>
            </div>

            <button
              onClick={handleRegister}
              disabled={submitting}
              className="ui-btn ui-btn-add w-full h-11 tracking-wide"
            >
              {submitting ? 'Creating account...' : regType === 'merchant' ? 'Register Business' : 'Create Super User'}
            </button>

            <p className="text-center text-ui-sm text-ink-faint">
              Already have an account?{' '}
              <span
                className="font-semibold cursor-pointer text-brand hover:underline"
                onClick={() => navigate(routeClientId ? `/saas/${routeClientId}/login` : '/saas/easyfood/login')}
              >
                Log in
              </span>
            </p>
          </div>
        </div>
      </div>

      {duplicateClientModal && (
        <div className="ui-backdrop font-sans">
          <div className="ui-modal text-center animate-scale-in">
            <AlertCircle size={40} className="mx-auto mb-3 text-brand" />
            <h3 className="text-panel-title text-brand-dark mb-2">
              Client already exists
            </h3>
            <p className="text-ui mb-6 text-ink-muted">
              An account with the Client ID "<strong>{business.client_id}</strong>" already exists.
              Please choose a different name or ID and try again.
            </p>
            <button
              onClick={() => {
                setDuplicateClientModal(false);
                setFieldErrors((prev) => ({ ...prev, client_id: 'This Client ID is already taken.' }));
                setClientIdTouched(true);
              }}
              className="ui-btn ui-btn-add w-full h-11"
            >
              Try another Client ID
            </button>
          </div>
        </div>
      )}
    </div>
  );
}