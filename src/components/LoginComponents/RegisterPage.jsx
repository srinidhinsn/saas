import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Lottie from 'lottie-react';
import './styles/Stylings.css';
import config from './data/Config'
import { useNavigate } from 'react-router-dom';
import Button from './data/Button'


const RegisterPage = () => {

    const options = config.options.register

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: "",
        password: "",
        role: "",
        email: "",
        phone: "",
    })

    const [error, setError] = useState('')

    function handleChange(e) {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }


    async function handleSubmit(e) {
        e.preventDefault();

        try {
            const response = await fetch('http://localhost:8001/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Server responded with:", data);
                setError(data.detail || "Registration failed");
                return;
            }


            alert(`Registration Successfull`);
            console.log(response)
            navigate('/login');

        } catch (err) {
            setError('Network error. Please try again later.');
            console.log(err);
        }

    }

    return (
        <motion.div
            className="wrapper"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.6 }}
        >
            <div className="card">
                <div className="image-box">
                    <Lottie animationData={config.images.regImg} loop={true} />
                </div>

                <form className="form" onSubmit={handleSubmit}>
                    <h2>{config.titles.register.title1}</h2>


                    <div className="form-group">
                        <input name='username' type="text" placeholder="Enter your username" required value={formData.username} onChange={handleChange} />
                    </div>

                    <div className="form-group">
                        <input name='password' type="password" placeholder="Enter a password" required value={formData.password} onChange={handleChange} />
                    </div>

                    <div className="form-group">
                        <select name='role' required value={formData.role} onChange={handleChange}>
                            <option value="">{config.labels.register.label6}</option>
                            <option value="manager">{options.option1}</option>
                            <option value="admin">{options.option2}</option>
                            <option value="staff">{options.option3}</option>
                            <option value="waiter">{options.option4}</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <input name='email' type="email" placeholder="Enter your email" required value={formData.email} onChange={handleChange} />
                    </div>

                    <div className="form-group">
                        <input name='phone' type="text" placeholder="Phone number" required value={formData.contact} onChange={handleChange} />
                    </div>


                    <Button
                        text="Register"
                        type="submit"
                        variant="primary"
                    />

                    <div className="form-group1">
                        <h4> {config.labels.register.label7} </h4>
                        <a onClick={() => navigate('/login')}> Sign In</a>
                    </div>

                </form>
            </div>
        </motion.div>
    );
};

export default RegisterPage;