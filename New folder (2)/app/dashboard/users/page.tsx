"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/ui/data-table"
import { UserPlus, Mail, Shield, UserCheck, RefreshCw } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
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

// Define the User type
type User = {
  _id: string
  username: string
  email: string
  role: string
  token: string | null
  refreshToken: string | null
  createdAt: string
  updatedAt: string
  __v: number
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

    const fetchUsers = async () => {
    setIsFetchingUsers(true)
      try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("You must be logged in to view users.")
      }

      console.log('Fetching users with token:', token)
        
        const response = await fetch('http://localhost:5000/api/users', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

      console.log('API Response status:', response.status)

        if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(errorData.message || "Failed to fetch users.")
        }

        const data = await response.json()
      console.log('API Response data:', data)
      
      // Handle different possible response formats
      let usersArray: User[] = []
      
      if (Array.isArray(data)) {
        usersArray = data
      } else if (data.users && Array.isArray(data.users)) {
        usersArray = data.users
      } else if (data.data && Array.isArray(data.data)) {
        usersArray = data.data
      } else {
        console.error('Unexpected API response format:', data)
        throw new Error("Invalid API response format: Could not find users array in response.")
      }

      // Ensure all required fields are present
      const validUsers = usersArray.filter(user => {
        const isValid = user._id && user.username && user.email && user.role
        if (!isValid) {
          console.warn('Invalid user data:', user)
        }
        return isValid
      })

      if (validUsers.length === 0) {
        throw new Error("No valid users found in the response.")
      }

      setUsers(validUsers)
      setError(null)
      toast({
        title: "Users Fetched",
        description: `Successfully fetched ${validUsers.length} users.`,
      })
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
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to delete role.")
      }

      // Update the users list
      setUsers(users.map(user => 
        user._id === userToDelete._id 
          ? { ...user, role: 'user' } // Set role to 'user' after deletion
          : user
      ))

      toast({
        title: "Role Deleted",
        description: `Successfully removed role from ${userToDelete.username}`,
      })
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

  // Fetch initial data on component mount
  useEffect(() => {
    fetchUsers()
  }, [])

  // Define columns for the DataTable
  const columns: Column<User>[] = [
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
            row.token ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
          }`}
        >
          {row.token ? "Active" : "Inactive"}
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit User</DropdownMenuItem>
            <DropdownMenuItem>Change Role</DropdownMenuItem>
            <DropdownMenuItem>Reset Password</DropdownMenuItem>
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
      ),
      meta: {
        className: "w-[50px]",
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Users</h1>
          <p className="text-muted-foreground">Manage users and their access</p>
        </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button>
              <UserPlus className="mr-2 h-4 w-4" /> Add User
            </Button>
          <Button variant="outline" onClick={fetchUsers} disabled={isFetchingUsers}>
            {isFetchingUsers ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Fetching...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh Users
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
          data={users}
          columns={columns}
          title="User Management"
          description="View and manage all users in the system"
          searchPlaceholder="Search users..."
          exportFilename="users-export"
          initialPageSize={10}
          pageSizeOptions={[5, 10, 15, 20]}
        />
      )}

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
    </div>
  )
}
