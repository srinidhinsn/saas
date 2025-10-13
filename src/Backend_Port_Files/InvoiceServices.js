import axios from 'axios';

const invoiceServicesPort = axios.create({
    baseURL: 'https://billing-service-qa-582942992169.asia-south2.run.app/saas',
});

export default invoiceServicesPort;
