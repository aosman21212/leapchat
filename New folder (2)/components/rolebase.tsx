import { hasRole } from "@/services/user.service"

// Component for to make a component role based visible or disable
const RoleBase = ({ 
  children, 
  allowedRoles,
  isBulkAction = false 
}: {
  children: any, 
  allowedRoles: Array<"user"|"manager"|"superadmin">,
  isBulkAction?: boolean
}) => {
  const userRole = localStorage.getItem("userRole")

  // If it's a bulk action, only superadmin can access it
  if (isBulkAction && userRole !== "superadmin") {
    return null;
  }

  // For non-bulk actions, check against allowed roles
  if (!hasRole(allowedRoles)) {
    return null;
  }

  return <>{children}</>
}

export default RoleBase;