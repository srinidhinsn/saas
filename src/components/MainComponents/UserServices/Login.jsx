import React, { useState } from 'react';
import { User, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { APP_ROOT } from '../../config/pathConfig';

const screenRouteMap = {
  super_admin_v1: "customer-data",
  default_user: "home",
  ecommerce_user_v1:"home"
};
 
export default function LoginPage({ onLoginSuccess ,clientId}) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = request OTP, 2 = verify & reset
  const [forgotForm, setForgotForm] = useState({
    username: '',
    otp: '',
    new_password: '',
    confirm_password: ''
  });
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const navigate = useNavigate();
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: form.username, password: form.password }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Invalid credentials');
      }

      const data = await response.json();
      const token = data.data.access_token;
      const screen_id = data.screen_id || 'default_user';

      // ✅ Just call the callback — App.jsx will handle navigation
      if (onLoginSuccess) {
        onLoginSuccess(token, screen_id, clientId);
      }

      setShowAnimation(true);

    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
};

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && form.username && form.password && !loading) {
      handleLogin();
    }
  };

  const handleForgotChange = (e) => {
    const { name, value } = e.target;
    setForgotForm((prev) => ({ ...prev, [name]: value }));
    setForgotError('');
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/forgot-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: forgotForm.username
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send OTP');
      }

      alert('OTP sent to your registered email');
      setForgotStep(2);
    } catch (err) {
      console.error('OTP request failed:', err);
      setForgotError(err.message || 'Failed to send OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');

    if (forgotForm.new_password !== forgotForm.confirm_password) {
      setForgotError('Passwords do not match');
      return;
    }

    setForgotLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/forgot-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: forgotForm.username,
            otp: forgotForm.otp,
            new_password: forgotForm.new_password,
            confirm_password: forgotForm.confirm_password
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to reset password');
      }

      alert('Password reset successfully! Please login with your new password.');
      setShowForgot(false);
      setForgotStep(1);
      setForgotForm({ username: '', otp: '', new_password: '', confirm_password: '' });
    } catch (err) {
      console.error('Reset password failed:', err);
      setForgotError(err.message || 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  };

  if (showAnimation) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg-primary text-action-primary z-[9999] animate-fadeBg">

        <div className="text-center animate-scaleFade">

          <CheckCircle size={80} className="mx-auto text-action-primary animate-glowPulse" />

          <h1 className="mt-6 text-5xl font-extrabold tracking-wide animate-slide">
            CHARIOT
          </h1>

          <p className="mt-2 text-lg opacity-80 tracking-wide animate-textFade">
            Welcome to Your Restaurant POS
          </p>

        </div>

        <style>
          {`
          @keyframes fadeBg {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }

          @keyframes scaleFade {
            0% { transform: scale(0.6); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }

          @keyframes glowPulse {
            0% { filter: drop-shadow(0 0 3px #ff6a00); }
            100% { filter: drop-shadow(0 0 20px #ff4500); }
          }

          @keyframes slide {
            0% { transform: translateY(25px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }

          @keyframes textFade {
            0% { opacity: 0; }
            100% { opacity: 0.9; }
          }

          .animate-fadeBg { animation: fadeBg .5s ease-out forwards; }
          .animate-scaleFade { animation: scaleFade 1s cubic-bezier(0.3,1,0.3,1) forwards; }
          .animate-glowPulse { animation: glowPulse 2s infinite alternate ease-in-out; }
          .animate-slide { animation: slide 1.2s ease-out forwards; }
          .animate-textFade { animation: textFade 1.6s ease-out forwards; }
        `}
        </style>
      </div>
    );
  }



  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f9fafb' }}>
      <div className="w-full max-w-md">


        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-md p-8 md:p-10">
          {/* Avatar Circle with Spinning Text */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="w-32 h-32 rounded-full flex items-center justify-center relative z-10 shadow-lg" style={{ backgroundColor: '#f97316' }}>
              <User size={48} className="text-white" strokeWidth={2} />
            </div>

          </div>

          <h2 className="text-2xl font-semibold text-center mb-2" style={{ color: '#111827' }}>
            Welcome Back
          </h2>
          <p className="text-center mb-6" style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Please login to your account
          </p>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5 flex items-center gap-2 text-red-600 animate-shake">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Login Form */}
          <div className="space-y-5">
            {/* Username Input */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
                Username
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9ca3af' }}>
                  <User size={20} />
                </div>
                <input
                  type="text"
                  name="username"
                  placeholder="Enter your username"
                  value={form.username}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-12 pr-4 py-3 border-2 rounded-lg text-base transition-all outline-none"
                  style={{
                    borderColor: '#e5e7eb',
                    backgroundColor: '#ffffff',
                    color: '#111827',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#f97316';
                    e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
                Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9ca3af' }}>
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-12 pr-4 py-3 border-2 rounded-lg text-base transition-all outline-none"
                  style={{
                    borderColor: '#e5e7eb',
                    backgroundColor: '#ffffff',
                    color: '#111827',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#f97316';
                    e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex items-center justify-end">
              <span
                onClick={() => setShowForgot(true)}
                className="text-sm cursor-pointer transition-colors font-medium"
                style={{ color: '#f97316' }}
                onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                onMouseOut={(e) => e.target.style.textDecoration = 'none'}
              >
                Forgot Password?
              </span>
            </div>

            {/* Login Button */}
            <button
              onClick={handleLogin}
              disabled={loading || !form.username || !form.password}
              className="w-full py-3.5 rounded-lg text-base font-semibold tracking-wide transition-all shadow-sm"
              style={{
                backgroundColor: loading || !form.username || !form.password ? '#d1d5db' : '#f97316',
                color: '#ffffff',
                cursor: loading || !form.username || !form.password ? 'not-allowed' : 'pointer',
                boxShadow: loading || !form.username || !form.password ? 'none' : '0 1px 3px rgba(249, 115, 22, 0.3)',
              }}
              onMouseOver={(e) => {
                if (!loading && form.username && form.password) {
                  e.target.style.backgroundColor = '#ea580c';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 6px rgba(249, 115, 22, 0.4)';
                }
              }}
              onMouseOut={(e) => {
                if (!loading && form.username && form.password) {
                  e.target.style.backgroundColor = '#f97316';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 1px 3px rgba(249, 115, 22, 0.3)';
                }
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </span>
              ) : (
                'LOGIN'
              )}
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t text-center" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs" style={{ color: '#9ca3af' }}>
              Need help? Contact your administrator
            </p>
          </div>
        </div>

        {/* Footer */}
        {/* <div className="text-center mt-6">
          <p className="text-xs" style={{ color: '#9ca3af' }}>
            © 2025 {clientId}. All rights reserved.
          </p>
        </div> */}
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => {
            setShowForgot(false);
            setForgotStep(1);
            setForgotError('');
            setForgotForm({ username: '', otp: '', new_password: '', confirm_password: '' });
          }}
        >
          <div
            className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: '#fed7aa' }}>
                <Lock size={28} style={{ color: '#f97316' }} />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#111827' }}>
                {forgotStep === 1 ? 'Forgot Password' : 'Reset Password'}
              </h3>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                {forgotStep === 1
                  ? 'Enter your username to receive an OTP'
                  : 'Enter the OTP and your new password'}
              </p>
            </div>

            {/* Error Message */}
            {forgotError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-600 animate-shake">
                <AlertCircle size={18} />
                <span className="text-sm">{forgotError}</span>
              </div>
            )}

            {/* Step 1: Request OTP */}
            {forgotStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9ca3af' }}>
                      <User size={20} />
                    </div>
                    <input
                      type="text"
                      name="username"
                      placeholder="Enter your username"
                      value={forgotForm.username}
                      onChange={handleForgotChange}
                      className="w-full pl-12 pr-4 py-3 border-2 rounded-lg text-base transition-all outline-none"
                      style={{
                        borderColor: '#e5e7eb',
                        backgroundColor: '#ffffff',
                        color: '#111827',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f97316';
                        e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleRequestOtp}
                  disabled={forgotLoading || !forgotForm.username}
                  className="w-full py-3 rounded-lg font-semibold transition-all shadow-sm"
                  style={{
                    backgroundColor: forgotLoading || !forgotForm.username ? '#d1d5db' : '#f97316',
                    color: '#ffffff',
                    cursor: forgotLoading || !forgotForm.username ? 'not-allowed' : 'pointer',
                  }}
                  onMouseOver={(e) => {
                    if (!forgotLoading && forgotForm.username) {
                      e.target.style.backgroundColor = '#ea580c';
                      e.target.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!forgotLoading && forgotForm.username) {
                      e.target.style.backgroundColor = '#f97316';
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {forgotLoading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </div>
            )}

            {/* Step 2: Verify OTP & Reset Password */}
            {forgotStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
                    OTP Code
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9ca3af' }}>
                      <Lock size={20} />
                    </div>
                    <input
                      type="text"
                      name="otp"
                      placeholder="Enter OTP"
                      value={forgotForm.otp}
                      onChange={handleForgotChange}
                      className="w-full pl-12 pr-4 py-3 border-2 rounded-lg text-base transition-all outline-none"
                      style={{
                        borderColor: '#e5e7eb',
                        backgroundColor: '#ffffff',
                        color: '#111827',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f97316';
                        e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9ca3af' }}>
                      <Lock size={20} />
                    </div>
                    <input
                      type="password"
                      name="new_password"
                      placeholder="Enter new password"
                      value={forgotForm.new_password}
                      onChange={handleForgotChange}
                      className="w-full pl-12 pr-4 py-3 border-2 rounded-lg text-base transition-all outline-none"
                      style={{
                        borderColor: '#e5e7eb',
                        backgroundColor: '#ffffff',
                        color: '#111827',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f97316';
                        e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9ca3af' }}>
                      <Lock size={20} />
                    </div>
                    <input
                      type="password"
                      name="confirm_password"
                      placeholder="Confirm new password"
                      value={forgotForm.confirm_password}
                      onChange={handleForgotChange}
                      className="w-full pl-12 pr-4 py-3 border-2 rounded-lg text-base transition-all outline-none"
                      style={{
                        borderColor: '#e5e7eb',
                        backgroundColor: '#ffffff',
                        color: '#111827',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f97316';
                        e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setForgotStep(1);
                      setForgotError('');
                    }}
                    className="flex-1 py-3 rounded-lg font-semibold transition-all border-2"
                    style={{
                      borderColor: '#e5e7eb',
                      backgroundColor: '#ffffff',
                      color: '#6b7280',
                    }}
                    onMouseOver={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.backgroundColor = '#f9fafb';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.backgroundColor = '#ffffff';
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={forgotLoading || !forgotForm.otp || !forgotForm.new_password || !forgotForm.confirm_password}
                    className="flex-1 py-3 rounded-lg font-semibold transition-all shadow-sm"
                    style={{
                      backgroundColor: forgotLoading || !forgotForm.otp || !forgotForm.new_password || !forgotForm.confirm_password ? '#d1d5db' : '#f97316',
                      color: '#ffffff',
                      cursor: forgotLoading || !forgotForm.otp || !forgotForm.new_password || !forgotForm.confirm_password ? 'not-allowed' : 'pointer',
                    }}
                    onMouseOver={(e) => {
                      if (!forgotLoading && forgotForm.otp && forgotForm.new_password && forgotForm.confirm_password) {
                        e.target.style.backgroundColor = '#ea580c';
                        e.target.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!forgotLoading && forgotForm.otp && forgotForm.new_password && forgotForm.confirm_password) {
                        e.target.style.backgroundColor = '#f97316';
                        e.target.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {forgotLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setShowForgot(false);
                  setForgotStep(1);
                  setForgotError('');
                  setForgotForm({ username: '', otp: '', new_password: '', confirm_password: '' });
                }}
                className="text-sm transition-colors"
                style={{ color: '#6b7280' }}
                onMouseOver={(e) => e.target.style.color = '#f97316'}
                onMouseOut={(e) => e.target.style.color = '#6b7280'}
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
