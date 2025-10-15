import axios from 'axios';

const tableServicesPort = axios.create({
    baseURL: 'http://localhost:8001/saas',
});

export default tableServicesPort;
