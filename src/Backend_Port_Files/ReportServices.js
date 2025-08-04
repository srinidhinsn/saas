import axios from 'axios';

const reportServicesPort = axios.create({
    baseURL: 'http://localhost:8006/saas',
});

export default reportServicesPort;
