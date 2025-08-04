import axios from 'axios';

const documentServicesPort = axios.create({
    baseURL: 'http://localhost:8004/saas',
});

export default documentServicesPort;
