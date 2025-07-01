import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./styles/RegisterClient.css";

const RegisterClient = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        last_name: "",
        dob: "",
        gender: "",
        city: "",
        state: "",
        country: "",
        country_code: "",
        password: "",
        confirm_password: "",
        company_name: "",
        location: "",
        contact_number: "",
        company_number: "",
        company_address: "",
        client_address: "",
        fssai_number: "",
        gst_number: "",
        pan_number: "",
        aadhar_number: "",
        license_number: "",
        food_license_number: "",
        email: "",
        website: "",
        bill_paid: "false"
    });

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));

        // Inline validation logic
        const newErrors = { ...errors };

        if (name === "contact_number" || name === "company_number") {
            newErrors[name] = /^[6-9]\d{9}$/.test(value)
                ? ""
                : "Enter a valid 10-digit number starting with 6-9";
        }


        if (name === "password") {
            newErrors[name] =
                value.length >= 8 && /[^\w\s]/.test(value)
                    ? ""
                    : "Min 8 chars, include 1 special character";

            // Trigger confirm_password revalidation too
            if (form.confirm_password && form.confirm_password !== value) {
                newErrors.confirm_password = "Passwords do not match";
            } else {
                newErrors.confirm_password = "";
            }
        }

        if (name === "confirm_password") {
            newErrors[name] =
                value === form.password ? "" : "Passwords do not match";
        }

        setErrors(newErrors);

        if (name === "country") {
            const upperCountry = value.toUpperCase();

            const countryMap = {
                INDIA: "+91",
                USA: "+1",
                UK: "+44",
                AUSTRALIA: "+61",
                JAPAN: "+81",
                UAE: "+971",
                SINGAPORE: "+65",
                BANGLADESH: "+880",
                GERMANY: "+49",
                FRANCE: "+33"
            };

            const countryCode = countryMap[upperCountry] || "";

            setForm(prev => ({
                ...prev,
                [name]: upperCountry,
                country_code: countryCode
            }));

            return;
        }

    };


    const validate = () => {
        const newErrors = {};
        if (!/^[6-9]\d{9}$/.test(form.contact_number)) {
            newErrors.contact_number = "Enter a valid 10-digit number";
        }
        if (form.password.length < 8 || !/[^\w\s]/.test(form.password)) {
            newErrors.password = "Min 8 chars, 1 special character required";
        }
        if (form.password !== form.confirm_password) {
            newErrors.confirm_password = "Passwords do not match";
        }
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        try {
            const payload = {
                ...form,
                dob: form.dob || null,
                bill_paid: form.bill_paid === "true"
            };
            const res = await axios.post("http://localhost:9000/clients", payload);
            if (res.status === 200 || res.status === 201) {
                alert("Client registered successfully");
                navigate("/profile");
            }
        } catch (err) {
            console.error("Error registering client:", err);
            alert("Failed to register client");
        }
    };

    return (
        <div className="register-client-page">
            <h2>Register New Client</h2>
            <form onSubmit={handleSubmit} className="register-form">
                <div className="form-grid">
                    {/* Personal Details */}
                    {[
                        { label: "First Name", name: "name" },
                        { label: "Last Name", name: "last_name" },
                        { label: "DOB", name: "dob", type: "date" },
                        { label: "City", name: "city" },
                        { label: "State", name: "state" },
                        { label: "Country", name: "country" }
                    ].map(({ label, name, type }) => (
                        <div key={name} className="form-group">
                            <label>{label}</label>
                            <input
                                type={type || "text"}
                                name={name}
                                value={form[name]}
                                onChange={handleChange}
                                className={errors[name] ? "error" : ""}
                                required={["name", "contact_number", "company_name"].includes(name)}
                            />
                            {errors[name] && <span className="error-msg">{errors[name]}</span>}
                        </div>
                    ))}

                    {/* Country Code */}
                    <div className="form-group">
                        <label>Country Code</label>
                        <select
                            name="country_code"
                            value={form.country_code}
                            onChange={handleChange}
                            required
                            className={errors.country_code ? "error" : ""}
                        >
                            <option value="">-- Select --</option>
                            <option value="+91">+91 (India)</option>
                            <option value="+1">+1 (USA)</option>
                            <option value="+44">+44 (UK)</option>
                            <option value="+61">+61 (Australia)</option>
                            <option value="+81">+81 (Japan)</option>
                            <option value="+971">+971 (UAE)</option>
                            <option value="+65">+65 (Singapore)</option>
                            <option value="+880">+880 (Bangladesh)</option>
                            <option value="+49">+49 (Germany)</option>
                            <option value="+33">+33 (France)</option>
                        </select>
                    </div>

                    {/* Gender */}
                    <div className="form-group">
                        <label>Gender</label>
                        <select name="gender" value={form.gender} onChange={handleChange}>
                            <option value="">-- Select --</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Auth */}
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            className={errors.password ? "error" : ""}
                            required
                        />
                        {errors.password && <span className="error-msg">{errors.password}</span>}
                    </div>
                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            name="confirm_password"
                            value={form.confirm_password}
                            onChange={handleChange}
                            className={errors.confirm_password ? "error" : ""}
                            required
                        />
                        {errors.confirm_password && <span className="error-msg">{errors.confirm_password}</span>}
                    </div>

                    {/* Business & Legal */}
                    {[
                        "company_name", "location", "contact_number", "company_number",
                        "company_address", "client_address", "fssai_number",
                        "gst_number", "pan_number", "aadhar_number",
                        "license_number", "food_license_number", "email", "website"
                    ].map((name) => (
                        <div key={name} className="form-group">
                            <label>{name.replace(/_/g, " ").toUpperCase()}</label>
                            <input
                                type="text"
                                name={name}
                                value={form[name]}
                                onChange={handleChange}
                                className={errors[name] ? "error" : ""}
                                required={["company_name", "contact_number", "email"].includes(name)}
                            />
                            {errors[name] && <span className="error-msg">{errors[name]}</span>}
                        </div>
                    ))}

                    {/* Billing */}
                    <div className="form-group">
                        <label>Paid Status</label>
                        <select name="bill_paid" value={form.bill_paid} onChange={handleChange}>
                            <option value="true">Paid</option>
                            <option value="false">Unpaid</option>
                        </select>
                    </div>
                </div>

                <button type="submit">Register</button>
            </form>
        </div>
    );
};

export default RegisterClient;
