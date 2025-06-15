import React from "react";
import loginImage from '../assets/login-animation.json'
import registerImage from '../assets/signup-animation.json';
import ForgotImage from '../assets/forgotpassword-animation.json';
import ResetImage from '../assets/resetpage-animation.json';
import { label } from "framer-motion/client";

const config = {
    labels: {
        register: {
            label1: "Username",
            label2: "Password",
            label3: "Email",
            label4: "Contact",
            label5: "Role",
            label6: "Select a role",
            label7: "Already have an Account?"
        },
        login: {
            label1: "Username",
            label2: "Password",
            label3: "Forgot Password",
            label4: "New Here?"
        }
    },
    options: {
        register: {
            option1: "Manager",
            option2: "Admin",
            option3: "Staff",
            option4: "Waiter",
        },
        forgotPage: {
            option1: "Email",
            option2: "Contact",
        }
    },
    titles: {
        register: {
            title1: "Create Your Account",
            title2: "LogIn Into Your Account",
            title3: "Forgot Password",
        }
    },
    images: {
        loginImg: loginImage,
        regImg: registerImage,
        fImg: ForgotImage,
        rImg: ResetImage
    },
}

export default config;