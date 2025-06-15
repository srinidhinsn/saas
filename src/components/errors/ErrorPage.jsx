// components/ErrorPage.js
import React from "react";
import "../styles/ErrorPage.css"; // align this with your app styling

const ErrorPage = ({ statusCode, message }) => {
  return (
    <div className="error-page-wrapper">
      <div className="error-box">
        <h1>Error {statusCode}</h1>
        <p>{message}</p>
      </div>
    </div>
  );
};

export default ErrorPage;
