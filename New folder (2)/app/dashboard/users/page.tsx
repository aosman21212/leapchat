"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/ui/data-table"
import { UserPlus, Mail, Shield, UserCheck, RefreshCw, Power } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

// Add pagination type
type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Update User type to match API response
type User = {
  _id: string;
  username: string;
  email: string;
  role: string;
  token: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

// Add this type for user details
type UserDetails = {
  _id: string;
  username: string;
  email: string;
  role: string;
  token: string | null;
  refreshToken: string | null;
  createdAt: string;
  updatedAt: string;
  __v: number;
  // Add any additional fields that might come from the API
};

// Add API response type
type APIResponse = {
  users: User[];
  pagination: Pagination;
}

export default function UsersPage() {
  const { language } = useLanguage()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingUsers, setIsFetchingUsers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false)
  const [userToEdit, setUserToEdit] = useState<User | null>(null)
  const [userToUpdateRole, setUserToUpdateRole] = useState<User | null>(null)
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null)
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)
  const [userToToggle, setUserToToggle] = useState<User | null>(null)
  const [newRole, setNewRole] = useState("")
  const [isUpdatingRole, setIsUpdatingRole] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [editUserForm, setEditUserForm] = useState<{ username: string; email: string; role: string; isActive: boolean }>({ username: "", email: "", role: "user", isActive: true })
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [addUserForm, setAddUserForm] = useState({ username: "", email: "", password: "", role: "user" })
  const [isAdding, setIsAdding] = useState(false)

    const fetchUsers = async () => {
    setIsFetchingUsers(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("You must be logged in to view users.")
      }
      const response = await fetch('http://localhost:5000/api/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        },
        cache: 'no-store',
        next: { revalidate: 0 }
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to fetch users.")
      }
      const data = await response.json() as APIResponse
      
      // Handle the new API response format
      if (!data.users || !Array.isArray(data.users)) {
        throw new Error("Invalid API response format: Could not find users array in response.")
      }

      // Map the users data to match our frontend structure
      const validUsers = data.users.map(user => ({
        ...user,
        token: user.isActive ? (user.token || "active") : null,
        createdAt: new Date(user.createdAt).toISOString(),
        updatedAt: new Date(user.updatedAt).toISOString()
      }))

      setUsers(validUsers)
      setError(null)
    } catch (error) {
      console.error('Error fetching users:', error)
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch users. Please try again."
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      setUsers([])
    } finally {
      setIsLoading(false)
      setIsFetchingUsers(false)
    }
  }

  // Polling for real-time updates
  useEffect(() => {
    fetchUsers()
    pollingRef.current = setInterval(fetchUsers, 10000) // every 10 seconds
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  // Add debounced search
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!debouncedSearchQuery) return users

    const query = debouncedSearchQuery.toLowerCase()
    return users.filter(user => 
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    )
  }, [users, debouncedSearchQuery])

  // Define columns for the DataTable
  const columns: Column<User>[] = useMemo(() => [
    {
      header: "Username",
      accessorKey: "username",
      enableSorting: true,
      enableFiltering: true,
    },
    {
      header: "Email",
      accessorKey: "email",
      enableSorting: true,
      enableFiltering: true,
      meta: {
        visibleFrom: "md",
      },
    },
    {
      header: "Role",
      accessorKey: "role",
      enableSorting: true,
      cell: (row) => (
        <div className="flex items-center gap-1">
          {row.role === "superadmin" && <Shield className="h-3.5 w-3.5 text-primary" />}
          {row.role === "manager" && <UserCheck className="h-3.5 w-3.5 text-blue-500" />}
          {row.role}
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "token",
      enableSorting: true,
      cell: (row) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
            row.token !== null ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
          }`}
        >
          {row.token !== null ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Created At",
      accessorKey: "createdAt",
      enableSorting: true,
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
      meta: {
        visibleFrom: "lg",
      },
    },
    {
      header: "Actions",
      accessorKey: "_id",
      enableSorting: false,
      enableFiltering: false,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleToggleStatus(row)}
            disabled={isTogglingStatus && userToToggle?._id === row._id}
            className={cn(
              "h-8 w-8",
              row.token !== null ? "text-green-500 hover:text-green-600" : "text-gray-500 hover:text-gray-600"
            )}
          >
            <Power className="h-4 w-4" />
            <span className="sr-only">{row.token !== null ? 'Deactivate' : 'Activate'} User</span>
          </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleViewDetails(row)}>
              View Details
            </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditUser(row)}>
                Edit User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChangeRole(row)}>
                Change Role
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleResetPassword(row)}>
                Reset Password
              </DropdownMenuItem>
            {row.role !== 'user' && (
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => {
                  setUserToDelete(row)
                  setDeleteDialogOpen(true)
                }}
              >
                Delete Role
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      ),
      meta: {
        className: "w-[100px]",
      },
    },
  ], [isTogglingStatus, userToToggle])

  const handleDeleteRole = async () => {
    if (!userToDelete) return
    setIsDeleting(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("You must be logged in to delete a role.")
      }
      const response = await fetch(`http://localhost:5000/api/users/${userToDelete._id}/role`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-store'
        }
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to delete role.")
      }
      toast({
        title: "Role Deleted",
        description: `Successfully removed role from ${userToDelete.username}`,
      })
      // Immediately refetch users after deleting
      await fetchUsers()
    } catch (error) {
      console.error('Error deleting role:', error)
      const errorMessage = error instanceof Error ? error.message : "Failed to delete role. Please try again."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  // Add function to handle view details
  const handleViewDetails = async (user: User) => {
    setSelectedUser(user)
    setIsViewDialogOpen(true)
  }

  // Add function to handle edit user
  const handleEditUser = (user: User) => {
    setUserToEdit(user)
    setEditUserForm({
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.token !== null // or user.isActive if available
    })
    setIsEditDialogOpen(true)
  }

  // Add function to handle change role
  const handleChangeRole = (user: User) => {
    setUserToUpdateRole(user)
    setIsRoleDialogOpen(true)
  }

  // Add function to handle reset password
  const handleResetPassword = (user: User) => {
    setUserToResetPassword(user)
    setIsResetPasswordDialogOpen(true)
  }

  // Add toggle status function
  const handleToggleStatus = async (user: User) => {
    setIsTogglingStatus(true)
    setUserToToggle(user)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("You must be logged in to toggle user status.")
      }
      const response = await fetch(`http://localhost:5000/api/users/${user._id}/toggle-status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to toggle user status.")
      }
      setStatusMessage(`Successfully ${user.token ? 'deactivated' : 'activated'} ${user.username}`)
      setIsStatusDialogOpen(true)
      toast({
        title: "Status Updated",
        description: `Successfully ${user.token ? 'deactivated' : 'activated'} ${user.username}`,
      })
      await fetchUsers() // Refetch users after toggle
    } catch (error) {
      console.error('Error toggling status:', error)
      const errorMsg = error instanceof Error ? error.message : "Failed to toggle status. Please try again."
      setStatusMessage(errorMsg)
      setIsStatusDialogOpen(true)
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setIsTogglingStatus(false)
      setUserToToggle(null)
    }
  }

  // Add function to handle role update
  const handleUpdateRole = async () => {
    if (!userToUpdateRole || !newRole) return
    setIsUpdatingRole(true)
    setRoleError(null)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("You must be logged in to update roles.")
      }
      const response = await fetch(`http://localhost:5000/api/auth/update-role/${userToUpdateRole._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to update role.")
      }
      toast({
        title: "Role Updated",
        description: `Successfully updated ${userToUpdateRole.username}'s role to ${newRole}`,
      })
      setIsRoleDialogOpen(false)
      setUserToUpdateRole(null)
      setNewRole("")
      await fetchUsers() // Refetch users after role update
    } catch (error) {
      console.error('Error updating role:', error)
      const errorMsg = error instanceof Error ? error.message : "Failed to update role. Please try again."
      setRoleError(errorMsg)
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setIsUpdatingRole(false)
    }
  }

  // Add save handler for edit
  const handleEditUserSave = async () => {
    if (!userToEdit) return
    try {
      const token = localStorage.getItem("token")
      if (!token) throw new Error("You must be logged in to edit a user.")
      const response = await fetch(`http://localhost:5000/api/users/${userToEdit._id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Cache-Control": "no-store"
        },
        body: JSON.stringify({
          username: editUserForm.username,
          email: editUserForm.email,
          role: editUserForm.role,
          isActive: editUserForm.isActive
        })
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to update user.")
      }
      toast({ title: "User updated", description: "User details updated successfully." })
      setIsEditDialogOpen(false)
      setUserToEdit(null)
      // Immediately refetch users after editing
      await fetchUsers()
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update user.", variant: "destructive" })
    }
  }

  // Add user handler
  const handleAddUser = async () => {
    setIsAdding(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) throw new Error("You must be logged in to add a user.")
      const response = await fetch("http://localhost:5000/api/users", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Cache-Control": "no-store"
        },
        body: JSON.stringify(addUserForm)
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to add user.")
      }
      toast({ title: "User added", description: "New user created successfully." })
      setIsAddDialogOpen(false)
      setAddUserForm({ username: "", email: "", password: "", role: "user" })
      // Immediately refetch users after adding
      await fetchUsers()
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to add user.", variant: "destructive" })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Users</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    <div className="space-y-6">
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Users</h1>
          <p className="text-muted-foreground">Manage users and their access</p>
        </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Add User
            </Button>
          <Button variant="outline" onClick={fetchUsers} disabled={isFetchingUsers}>
            {isFetchingUsers ? (
              <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Refreshing...
              </>
            ) : (
              <>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </>
            )}
            </Button>
          </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <DataTable
            data={filteredUsers}
          columns={columns}
          title="User Management"
          description="View and manage all users in the system"
          searchPlaceholder="Search users..."
          exportFilename="users-export"
          initialPageSize={10}
          pageSizeOptions={[5, 10, 15, 20]}
            isLoading={isLoading || isFetchingUsers}
          />
        )}

        {/* Status Message Dialog */}
        <AlertDialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {statusMessage.includes("Successfully") ? "Success" : "Error"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {statusMessage}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsStatusDialogOpen(false)}>
                Close
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* View Details Dialog */}
      <AlertDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>User Details</AlertDialogTitle>
          </AlertDialogHeader>
            {selectedUser && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="font-medium">Username</div>
                  <div className="col-span-3">{selectedUser.username}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="font-medium">Email</div>
                  <div className="col-span-3">{selectedUser.email}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="font-medium">Role</div>
                  <div className="col-span-3">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                      selectedUser.role === "superadmin" ? "bg-purple-100 text-purple-700" :
                      selectedUser.role === "manager" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-700"
                    )}>
                      {selectedUser.role === "superadmin" && <Shield className="mr-1 h-3 w-3" />}
                      {selectedUser.role === "manager" && <UserCheck className="mr-1 h-3 w-3" />}
                      {selectedUser.role}
                    </span>
            </div>
              </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="font-medium">Status</div>
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                        selectedUser.token !== null ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        <Power className={cn(
                          "mr-1 h-3 w-3",
                          selectedUser.token !== null ? "text-green-600" : "text-red-600"
                        )} />
                        {selectedUser.token !== null ? "Active" : "Inactive"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          handleToggleStatus(selectedUser)
                          setTimeout(() => setIsViewDialogOpen(false), 1000)
                        }}
                        disabled={isTogglingStatus && userToToggle?._id === selectedUser._id}
                        className="h-7 px-2"
                      >
                        {isTogglingStatus && userToToggle?._id === selectedUser._id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Power className="h-3 w-3" />
                        )}
                        <span className="ml-1 text-xs">
                          {selectedUser.token !== null ? "Deactivate" : "Activate"}
                        </span>
                      </Button>
              </div>
              </div>
              </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="font-medium">Created At</div>
                  <div className="col-span-3">
                  {new Date(selectedUser.createdAt).toLocaleString()}
                  </div>
              </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="font-medium">Last Updated</div>
                  <div className="col-span-3">
                  {new Date(selectedUser.updatedAt).toLocaleString()}
                  </div>
                </div>
              </div>
          )}
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsViewDialogOpen(false)}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        {/* Edit User Dialog */}
        <AlertDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Edit User</AlertDialogTitle>
            </AlertDialogHeader>
            {userToEdit && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="font-medium">Username</div>
                  <input
                    type="text"
                    value={editUserForm.username}
                    onChange={e => setEditUserForm(f => ({ ...f, username: e.target.value }))}
                    className="col-span-3 rounded-md border px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="font-medium">Email</div>
                  <input
                    type="email"
                    value={editUserForm.email}
                    onChange={e => setEditUserForm(f => ({ ...f, email: e.target.value }))}
                    className="col-span-3 rounded-md border px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="font-medium">Role</div>
                  <select
                    value={editUserForm.role}
                    onChange={e => setEditUserForm(f => ({ ...f, role: e.target.value }))}
                    className="col-span-3 rounded-md border px-3 py-2"
                  >
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="font-medium">Active</div>
                  <input
                    type="checkbox"
                    checked={editUserForm.isActive}
                    onChange={e => setEditUserForm(f => ({ ...f, isActive: e.target.checked }))}
                    className="col-span-3"
                  />
                </div>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleEditUserSave}>
                Save Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Change Role Dialog */}
        <AlertDialog open={isRoleDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setRoleError(null)
            setNewRole("")
          }
          setIsRoleDialogOpen(open)
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Change Role</AlertDialogTitle>
              <AlertDialogDescription>
                Change the role for {userToUpdateRole?.username}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {userToUpdateRole && (
              <div className="grid gap-4 py-4">
                {roleError && (
                  <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {roleError}
                  </div>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="font-medium">Current Role</div>
                  <div className="col-span-3">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                      userToUpdateRole.role === "superadmin" ? "bg-purple-100 text-purple-700" :
                      userToUpdateRole.role === "manager" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-700"
                    )}>
                      {userToUpdateRole.role === "superadmin" && <Shield className="mr-1 h-3 w-3" />}
                      {userToUpdateRole.role === "manager" && <UserCheck className="mr-1 h-3 w-3" />}
                      {userToUpdateRole.role}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="font-medium">New Role</div>
                  <select
                    value={newRole}
                    onChange={(e) => {
                      setNewRole(e.target.value)
                      setRoleError(null)
                    }}
                    className={cn(
                      "col-span-3 rounded-md border px-3 py-2",
                      roleError ? "border-destructive" : "border-input",
                      "bg-background"
                    )}
                    disabled={isUpdatingRole}
                  >
                    <option value="">Select a role</option>
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel 
                disabled={isUpdatingRole}
                onClick={() => {
                  setRoleError(null)
                  setNewRole("")
                  setIsRoleDialogOpen(false)
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleUpdateRole}
                disabled={isUpdatingRole || !newRole}
                className="bg-primary hover:bg-primary/90"
              >
                {isUpdatingRole ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Updating...
                  </>
                ) : (
                  "Update Role"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reset Password Dialog */}
        <AlertDialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Password</AlertDialogTitle>
            </AlertDialogHeader>
            {userToResetPassword && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="font-medium">Username</div>
                  <div className="col-span-3">{userToResetPassword.username}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="font-medium">New Password</div>
                  <input
                    type="password"
                    className="col-span-3 rounded-md border px-3 py-2"
                    placeholder="Enter new password"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="font-medium">Confirm Password</div>
                  <input
                    type="password"
                    className="col-span-3 rounded-md border px-3 py-2"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsResetPasswordDialogOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => setIsResetPasswordDialogOpen(false)}>
                Reset Password
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the {userToDelete?.role} role from {userToDelete?.username}? 
              This will set their role to "user".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              {isDeleting ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin">⟳</span> Deleting...
                </>
              ) : (
                "Delete Role"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        {/* Add User Dialog */}
        <AlertDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Add User</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="font-medium">Username</div>
                <input
                  type="text"
                  value={addUserForm.username}
                  onChange={e => setAddUserForm(f => ({ ...f, username: e.target.value }))}
                  className="col-span-3 rounded-md border px-3 py-2"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="font-medium">Email</div>
                <input
                  type="email"
                  value={addUserForm.email}
                  onChange={e => setAddUserForm(f => ({ ...f, email: e.target.value }))}
                  className="col-span-3 rounded-md border px-3 py-2"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="font-medium">Password</div>
                <input
                  type="password"
                  value={addUserForm.password}
                  onChange={e => setAddUserForm(f => ({ ...f, password: e.target.value }))}
                  className="col-span-3 rounded-md border px-3 py-2"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="font-medium">Role</div>
                <select
                  value={addUserForm.role}
                  onChange={e => setAddUserForm(f => ({ ...f, role: e.target.value }))}
                  className="col-span-3 rounded-md border px-3 py-2"
                >
                  <option value="user">User</option>
                  <option value="manager">Manager</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleAddUser} disabled={isAdding}>
                {isAdding ? "Adding..." : "Add User"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
