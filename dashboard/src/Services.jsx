import React, { useState } from "react";
import './styles/Services.css';

function Services() {
    const ALL_FEATURES = [
        "Dashboard", "Order", "Table Management", "Table Selection",
        "Menu", "Combos", "KDS", "Invoice", "Transaction", "Customer Reviews", "KOT bill"
    ];

    const FEATURE_DESCRIPTIONS = {
        "Dashboard": "View table overviews and real-time activity summary.",
        "Order": "Create and manage new customer orders at any table.",
        "Table Management": "Add, edit, and configure physical dining tables.",
        "Table Selection": "Assign incoming guests to available tables.",
        "Menu": "Customize your food and drink menu items.",
        "Combos": "Create bundled offers with fixed pricing or savings.",
        "KDS": "Kitchen Display System to manage food prep in real-time.",
        "Invoice": "View and generate PDF receipts for orders.",
        "Transaction": "Track payment history and billing details.",
        "Customer Reviews": "Collect customer feedback and star ratings.",
        "KOT bill": "Bill Generating"
    };

    const [enabledFeatures, setEnabledFeatures] = useState([]);
    const [expandEcom, setExpandEcom] = useState(false);

    const toggleFeature = (feature) => {
        setEnabledFeatures(prev =>
            prev.includes(feature)
                ? prev.filter(f => f !== feature)
                : [...prev, feature]
        );
    };

    return (
        <div className="services-wrapper">
            <div
                className={`feature-card ecom-service-toggle ${expandEcom ? "expanded" : ""}`}
                onClick={() => setExpandEcom(!expandEcom)}
            >
                <h3 className="feature-title"> Ecom Services</h3>
                <p className="feature-text">
                    Click to {expandEcom ? "hide" : "view"} all Ecom-related features.
                </p>
            </div>
            <div
                className={`feature-card new-service-toggle ${expandEcom ? "expanded" : ""}`}

            >
                <h3 className="feature-title"> New Services</h3>
                <p className="feature-text">
                    Click to {expandEcom ? "hide" : "view"} all New services.
                </p>
            </div>
            {expandEcom && (
                <section className="features-grid">
                    {ALL_FEATURES.map((feature, index) => (
                        <div
                            key={index}
                            className={`feature-card ${enabledFeatures.includes(feature) ? 'feature-enabled' : ''}`}
                            onClick={() => toggleFeature(feature)}
                        >
                            <h4 className="feature-title">{feature}</h4>
                            <p className="feature-text">{FEATURE_DESCRIPTIONS[feature]}</p>
                        </div>
                    ))}
                </section>
            )}
        </div>
    );
}

export default Services;
