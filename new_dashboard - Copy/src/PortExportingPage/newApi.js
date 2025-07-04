// this is for tablemanagement
import instance from './axiosInstance';

const clientId = 'bc752c9c-3a54-464d-a28f-7e04abde6d26';

const response = await instance.get(`/${clientId}/tables/read`, {
    headers: {
        Authorization: `Bearer ${token}`  // if token required
    }
});
export default instance;
