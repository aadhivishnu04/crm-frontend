export const loginUser = (employeeId, role, name, token) => {
    const user = {
        employeeId,
        role,
        name,
    };

    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);

    return user;
};

export const logoutUser = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
};

export const getCurrentUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

export const getAuthToken = () => {
    return localStorage.getItem('token');
};