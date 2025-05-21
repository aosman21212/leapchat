import { hasRole } from "@/services/user.service"

// Component for to make a component role based visible or disable
const RoleBase = ({ children, allowedRoles }: {children: any, allowedRoles: Array<"user"|"manager"|"superadmin">}) => {
  const userRole = localStorage.getItem("userRole")

  if (!hasRole(allowedRoles)) {
    return null;
  }

  return <>{children}</>
}

export default RoleBase;