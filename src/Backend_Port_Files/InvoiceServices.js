import axios from 'axios';

const invoiceServicesPort = axios.create({
    baseURL: 'http://localhost:8004/saas',
});

export default invoiceServicesPort;
