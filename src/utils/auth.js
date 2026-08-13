import { setToken, clearToken, getToken } from './api';

export const loginUser = (employeeId, role, name, token) => {
    const user = {
        employeeId,
        role,
        name,
    };

    localStorage.setItem('user', JSON.stringify(user));
    // Store under the same key api.js's apiFetch reads from ('itour_token'),
    // so every dashboard request picks up the token issued at login.
    setToken(token);

    return user;
};

export const logoutUser = () => {
    localStorage.removeItem('user');
    clearToken();
};

export const getCurrentUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

export const getAuthToken = () => {
    return getToken();
};