import axios from 'axios';

const userServicesPort = axios.create({
    baseURL: 'https://user-service-qa-582942992169.asia-south2.run.app/saas',
});

export default userServicesPort;
