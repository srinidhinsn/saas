import axios from 'axios';

const documentServicesPort = axios.create({
    baseURL: 'https://document-service-qa-582942992169.asia-south2.run.app/saas',
});

export default documentServicesPort;
