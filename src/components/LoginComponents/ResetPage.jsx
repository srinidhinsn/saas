import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Lottie from 'lottie-react';
import './styles/Stylings.css';
import config from './data/Config'
import { useNavigate } from 'react-router-dom';
import Button from './data/Button'


const ResetImage = () => {

    const navigate = useNavigate();
    const options = config.options.register
    const [clientid, setClientId] = useState('')
    const [role, setRole] = useState('');
    const [username, setUsername] = useState('');
    const [otp, setOtp] = useState('');
    const [new_password, setNewPassword] = useState('');
    const [error, setError] = useState('');

    async function handleReset(e) {
        e.preventDefault();

        try {
            const response = await fetch('http://localhost:8001/api/reset-password', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ username, otp, new_password, clientid, role })
            })


            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to reset password');
            }

            alert("Password updated !! You can now login")
            navigate('/login')
        } catch (err) {
            setError(err.message)
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
                    <Lottie animationData={config.images.rImg} loop={true} />
                </div>

                <form className="form" onSubmit={handleReset}>
                    <h2>{config.titles.register.title3}</h2>

                    <div className="form-group">
                        <input type="text" placeholder="Enter your username" required value={username} onChange={(e) => setUsername(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <input type="text" placeholder="Client Id" required value={clientid} onChange={(e) => setClientId(e.target.value)} />
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
                        <input type="text" placeholder="Enter OTP" required value={otp} onChange={(e) => setOtp(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <input type="text" placeholder="Set new Password" required value={new_password} onChange={(e) => setNewPassword(e.target.value)} />
                    </div>


                    {error}

                    <Button
                        text="Reset Password"
                        type="submit"
                        variant="primary"
                    />

                </form>
            </div>
        </motion.div>
    );
};

export default ResetImage;