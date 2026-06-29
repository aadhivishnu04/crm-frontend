export const loginUser = (employeeId, role, name) => {
    // We added 'name' to the incoming parameters and to the user object!
    const user = { employeeId, role, name };
    localStorage.setItem('user', JSON.stringify(user));
    return user;
};

export const logoutUser = () => {
    localStorage.removeItem('user');
};

export const getCurrentUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};