import React from 'react';
import './styles/HomePage3.css';
import multipleStoreImg from './assets/multiplestore.jpg'
import singleStoreImg from './assets/singlestore.png'
import cloudImg from './assets/cloud.png'
import { useNavigate } from 'react-router-dom';

const services = [
    'Billing System',
    'Dine-In Management',
    'Inventory Tracking',
    'Order Management',
    'Customer Support',
    'Advanced Reports',
    'Multi-Branch Support',
];

const plans = [
    { name: 'Basic (299/month)', features: [true, true, false, true, false, false, false] },
    { name: 'Standard (499/month)', features: [true, true, true, true, true, true, false] },
    { name: 'Premium (699/month)', features: [true, true, true, true, true, true, true] },
];

export default function HomePage() {
    const navigate = useNavigate();
    return (
        <div>
            <nav className="navbar">
                <div className="navbar-left">
                    <div className="logo">🍴MyPOS</div>
                </div>
                <ul className="navbar-links">
                    <li><a href="#business-types">Business Types</a></li>
                    <li><a href="#partners">Partners</a></li>
                    <li><a href="#about">About</a></li>
                    <li><a href="#help">Help</a></li>
                </ul>
                <div className="navbar-right">
                    <a href="/login" className="login-link">Login</a>
                    <button className="trial-button">Free Trial</button>
                </div>
            </nav>

            <main className="main-content">
                <h1>Welcome to MyPOS Platform</h1>
                <p>Effortless restaurant management. Try it free.</p>

                <section className="subscription-flex-section">
                    <h2 className="sub-title">Compare Our Plans</h2>
                    <div className="subscription-row">

                        <div className="plan-column service-column">
                            <div className="column-header">Services</div>
                            {services.map((service, i) => (
                                <div key={i} className="column-item">{service}</div>
                            ))}
                        </div>

                        {plans.map((plan, index) => (
                            <div key={index} className="plan-column plan-card" onClick={() => navigate('/payment')}>
                                <div className="column-header">{plan.name}</div>
                                {plan.features.map((available, i) => (
                                    <div key={i} className="column-item">
                                        {available ? '✔️' : '❌'}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </section>
            </main>


            <section className="pos-showcase">
                <h2 className="pos-title">The POS system that fits your store</h2>
                <div className="pos-cards">
                    <div className="pos-card">
                        <img src={singleStoreImg} alt="Single Store" />
                        <div className="pos-content">
                            <h3>Single Store</h3>
                            <p>Manage all operations with ease from one place.</p>
                            <p>Ideal for cafes, small diners, and quick-service outlets.</p>
                        </div>
                    </div>

                    <div className="pos-card">
                        <img src={multipleStoreImg} alt="Multiple Stores" />
                        <div className="pos-content">
                            <h3>Multiple Stores</h3>
                            <p>Centralize billing, inventory, and reporting across locations.</p>
                            <p>Perfect for growing restaurant chains.</p>
                        </div>
                    </div>

                    <div className="pos-card">
                        <img src={cloudImg} alt="Cloud POS" />
                        <div className="pos-content">
                            <h3>Cloud-Based POS</h3>
                            <p>Access your restaurant data from anywhere, anytime.</p>
                            <p>Secure, scalable, and always online.</p>
                        </div>
                    </div>
                </div>
            </section>


            <section className="pos-features">
                <h2 className="features-title">POS FEATURES</h2>
                <p className="features-subtitle">Every feature at your fingertips</p>
                <p className="features-description">
                    Get everything you need to manage and grow your restaurant in one place.
                </p>

                <div className="features-grid">
                    <div className="feature-item">
                        <h3>Billing</h3>
                        <p>Fast and accurate billing system to handle dine-in, takeout, and delivery orders.</p>
                        <p>Integrates with printers and tax rules seamlessly.</p>
                    </div>

                    <div className="feature-item">
                        <h3>Dine-In Management</h3>
                        <p>Organize tables, assign waiters, and manage active orders with a real-time layout.</p>
                        <p>Perfect for casual and fine dining setups.</p>
                    </div>

                    <div className="feature-item">
                        <h3>Inventory Tracking</h3>
                        <p>Track stock levels, set low-stock alerts, and manage ingredients smartly.</p>
                        <p>Helps reduce waste and optimize procurement.</p>
                    </div>

                    <div className="feature-item">
                        <h3>Customer Database</h3>
                        <p>Build a customer list from visits and orders.</p>
                        <p>Use it for loyalty programs, SMS campaigns, and insights.</p>
                    </div>

                    <div className="feature-item">
                        <h3>Reports & Analytics</h3>
                        <p>Detailed sales, item, staff, and expense reports in one place.</p>
                        <p>Helps make smart, data-driven decisions daily.</p>
                    </div>

                    <div className="feature-item">
                        <h3>Multi-Outlet Support</h3>
                        <p>Manage multiple branches from a central dashboard.</p>
                        <p>Maintain consistency in menu, pricing, and performance.</p>
                    </div>
                </div>

                <div className="btn">
                    <button>Expolre All</button>
                </div>

            </section>



            <footer className="footer">
                <p>© 2025 Chariot Consultancy. All rights reserved.</p>
            </footer>

        </div>
    );
}
