import axios from 'axios';

const inventoryServicesPort = axios.create({
    baseURL: 'http://localhost:8002/saas',
});

export default inventoryServicesPort;
