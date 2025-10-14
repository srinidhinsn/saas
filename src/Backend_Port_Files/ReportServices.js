import axios from 'axios';

const reportServicesPort = axios.create({
    baseURL: 'https://report-service-qa-582942992169.asia-south2.run.app/saas',
});

export default reportServicesPort;
