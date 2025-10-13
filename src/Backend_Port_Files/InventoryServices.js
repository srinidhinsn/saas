import axios from 'axios';

const inventoryServicesPort = axios.create({
    baseURL: 'https://inventory-service-qa-582942992169.asia-south2.run.app/saas',
});

export default inventoryServicesPort;
