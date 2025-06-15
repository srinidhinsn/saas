import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Lottie from 'lottie-react';
import './styles/Stylings.css';
import config from './data/Config'
import { useNavigate } from 'react-router-dom';
import Button from './data/Button'


const ForgotPage = () => {

    const navigate = useNavigate();

    const options = config.options.register

    const [username, setUsername] = useState('');
    const [method, setMethod] = useState('email');
    const [error, setError] = useState('');
    const [role, setRole] = useState('');
    const [clientid, setClientId] = useState('')

    async function handlePassword(e) {
        e.preventDefault();

        try {

            const response = await fetch('http://localhost:8001/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientid, username, role, method })
            });


            if (!response.ok) {
                const data = await response.json();
                setError(data.detail || 'Failed to send OTP.');
                return;
            }

            alert(`OTP sent to Your ${method} Successfully`)
            navigate('/reset', { state: { username, method, role, clientid } });

        } catch (err) {
            setError('Network error. Please try again later.');
            console.error(err);
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
                    <Lottie animationData={config.images.fImg} loop={true} />
                </div>

                <form className="form" onSubmit={handlePassword}>
                    <h2>{config.titles.register.title3}</h2>

                    <div className="form-group">
                        <input type="text" placeholder="Enter your ClientId" required value={clientid} onChange={(e) => setClientId(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <input type="text" placeholder="Enter your username" required value={username} onChange={(e) => setUsername(e.target.value)} />
                    </div>


                    <div className="form-group">
                        <select name='role' required value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="">{config.labels.register.label6}</option>
                            <option value="manager">{options.option1}</option>
                            <option value="admin">{options.option2}</option>
                            <option value="staff">{options.option3}</option>
                            <option value="waiter">{options.option4}</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <select
                            id="f_method"
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                        >
                            <option value="email"> {config.options.forgotPage.option1} </option>
                            <option value="sms"> {config.options.forgotPage.option2} </option>
                        </select>
                    </div>
                    {error}
                    <Button
                        text="Send Otp"
                        type="submit"
                        variant="primary"
                    />

                </form>
            </div>

        </motion.div>
    );
};

export default ForgotPage;