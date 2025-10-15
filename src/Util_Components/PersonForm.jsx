import React, { useState, useEffect } from "react";
import { FaUserEdit } from "react-icons/fa";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import axios from 'axios';

const FIELD_MAP = [
  { field: "first_name", label: "Full Name", type: "text" },
  { field: "last_name", label: "Nick Name", type: "text" },
  { field: "email", label: "Email", type: "email" },
  { field: "phone", label: "Phone", type: "tel" },
  { field: "dob", label: "Date of Birth", type: "date" },
];

export default function UserProfileForm() {
  const { clientId } = useParams();
  const token = localStorage.getItem("access_token");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    dob: "",
  });
  const [loading, setLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/person-details`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.data?.person) {
          const p = res.data.data.person;
          setForm({
            first_name: p.first_name || "",
            last_name: p.last_name || "",
            email: p.email || "",
            phone: p.phone || "",
            dob: p.dob || "",
          });
        }
      } catch {
        toast.error("Failed to fetch profile details");
      }
    };
    if (clientId && token) fetchProfile();
  }, [clientId, token]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/person-details`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(res.data.data?.message || "Profile saved!");
      setProfileSaved(true);
    } catch {
      toast.error("Failed to save user profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mpc-backdrop">
      <div className="mpc-card">
        <div className="mpc-profile-header">
          <img
            src="" // or your user's avatar
            alt="avatar"
            className="mpc-avatar"
          />
          <div>
            <div className="mpc-name">{`${form.first_name || ""} ${form.last_name || ""}`.trim() || "Your name"}</div>
            <div className="mpc-email">{form.email || "your@email.com"}</div>
          </div>
          <button className="mpc-edit-btn" disabled>
            <FaUserEdit /> Edit
          </button>
        </div>
        <form className="mpc-details-grid" onSubmit={handleSubmit}>
          <div className="mpc-field-group">
            <label className="mpc-label">Full Name</label>
            <input
              className="mpc-input"
              name="first_name"
              type="text"
              value={form.first_name}
              onChange={handleChange}
              placeholder="Your First Name"
            />
          </div>
          <div className="mpc-field-group">
            <label className="mpc-label">Nick Name</label>
            <input
              className="mpc-input"
              name="last_name"
              type="text"
              value={form.last_name}
              onChange={handleChange}
              placeholder="Your Nick Name"
            />
          </div>
          <div className="mpc-field-group">
            <label className="mpc-label">Email</label>
            <input
              className="mpc-input"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Your Email"
            />
          </div>
          <div className="mpc-field-group">
            <label className="mpc-label">Phone</label>
            <input
              className="mpc-input"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="Your Phone"
            />
          </div>
          <div className="mpc-field-group">
            <label className="mpc-label">Date of Birth</label>
            <input
              className="mpc-input"
              name="dob"
              type="date"
              value={form.dob}
              onChange={handleChange}
              placeholder="Your Birthday"
            />
          </div>
          <div className="mpc-actions">
            <button type="submit" className="mpc-btn" disabled={loading}>
              {loading ? "Updating..." : profileSaved ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
