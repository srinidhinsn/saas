import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Lottie from 'lottie-react';
import './styles/Stylings.css';
import config from './data/Config'
import { useNavigate } from 'react-router-dom';
// import Button from './styles/Button.css'
import Button from './data/Button';

const LoginPage = () => {

    const navigate = useNavigate();
    const options = config.options.register

    const [clientid, setClientId] = useState('')
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('');

    const [error, setError] = useState('');

    async function handleLogin(e) {
        e.preventDefault();

        try {
            const response = await fetch('http://localhost:8001/api/login', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ clientid, username, password, role })
            });

            if (!response.ok) {
                throw new Error("Invalid username or password")
            }

            const data = await response.json();
            alert("Login successfull")
            localStorage.setItem("isLoggedIn", "true");
            navigate("/dine");
            console.log(data)

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
                    <Lottie animationData={config.images.loginImg} loop={true} />
                </div>

                <form className="form" onSubmit={handleLogin}>
                    <h2>{config.titles.register.title2}</h2>

                    <div className="form-group">
                        <input type="text" placeholder="Enter your ClientId" required value={clientid} onChange={(e) => setClientId(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <input type="text" placeholder="Enter your username" required value={username} onChange={(e) => setUsername(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <input type="text" placeholder="Enter a password" required value={password} onChange={(e) => setPassword(e.target.value)} />
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

                    <Button
                        text="Login"
                        type="submit"
                        variant="primary"
                    />

                    <div className="form-group">
                        <p onClick={() => navigate('/forgot')}>{config.labels.login.label3}</p>
                    </div>

                    <div className="form-group1">
                        <h4>{config.labels.login.label4}</h4>
                        <a onClick={() => navigate('/register')}> Sign Up</a>
                    </div>
                    {error}
                </form>
            </div>
        </motion.div>
    );
};

export default LoginPage;