import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './styles/Titlecard.css';

const TitleCard = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/login');
        }, 4000); // 4 seconds
        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <motion.div
            className="title-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
        >
            <h1 className="title-main">BILLING X</h1>
            <p className="subtitle">A B2B Billing Solution</p>
        </motion.div>
    );
};

export default TitleCard;
