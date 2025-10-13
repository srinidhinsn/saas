import axios from 'axios';

const orderServicesPort = axios.create({
    baseURL: 'https://order-service-qa-582942992169.asia-south2.run.app/saas',
});

export default orderServicesPort;
