import axios from 'axios';

const userServicesPort = axios.create({
    baseURL: 'http://localhost:8000/saas',
});

export default userServicesPort;
