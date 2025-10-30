import axios from 'axios';

const documentServicesPort = axios.create({
    baseURL: 'http://localhost:8005/saas',
});

export default documentServicesPort;
