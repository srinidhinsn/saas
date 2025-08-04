import axios from 'axios';

const invoiceServicesPort = axios.create({
    baseURL: 'http://localhost:8005/saas',
});

export default invoiceServicesPort;
