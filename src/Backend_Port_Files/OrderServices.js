import axios from 'axios';

const orderServicesPort = axios.create({
    baseURL: 'http://localhost:8003/saas',
});

export default orderServicesPort;
