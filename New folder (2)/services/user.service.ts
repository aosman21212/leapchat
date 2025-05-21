export const getAuthUser = () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
};

/**
 * 
 * @param roles Array of roles to check against
 * @returns {boolean} True if the user has one of the roles, false otherwise
 */
export const hasRole = (roles: Array<"user" | "manager" | "superadmin"> = []) => {
    const user = getAuthUser();
    if(!user) return false;
    return roles.includes(user.role);
};

