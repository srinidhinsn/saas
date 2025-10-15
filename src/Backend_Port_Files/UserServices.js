import axios from 'axios';

const userServicesPort = axios.create({
    baseURL: 'http://localhost:8000/saas',
});

export default userServicesPort;


//


// import axios from 'axios';

// const userServicesPort = axios.create({
//     baseURL: 'http://localhost:8000/saas',
//     withCredentials: true,
//     headers: {
//         'Content-Type': 'application/json'
//     }
// });

// export default userServicesPort;
