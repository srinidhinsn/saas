import axios from 'axios';

const tableServicesPort = axios.create({
    baseURL: 'https://table-service-qa-582942992169.asia-south2.run.app/saas',
});

export default tableServicesPort;
