import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner@2.0.3";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "developer";
  avatar?: string;
  projectsCount: number;
  tasksCount: number;
}

export function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      name: "Alice Johnson",
      email: "alice@projectflow.com",
      role: "manager",
      projectsCount: 3,
      tasksCount: 12,
    },
    {
      id: "2",
      name: "Bob Smith",
      email: "bob@projectflow.com",
      role: "developer",
      projectsCount: 2,
      tasksCount: 8,
    },
    {
      id: "3",
      name: "Carol White",
      email: "carol@projectflow.com",
      role: "developer",
      projectsCount: 2,
      tasksCount: 10,
    },
    {
      id: "4",
      name: "David Brown",
      email: "david@projectflow.com",
      role: "developer",
      projectsCount: 1,
      tasksCount: 5,
    },
    {
      id: "5",
      name: "Emma Davis",
      email: "emma@projectflow.com",
      role: "manager",
      projectsCount: 2,
      tasksCount: 9,
    },
    {
      id: "6",
      name: "Frank Miller",
      email: "frank@projectflow.com",
      role: "developer",
      projectsCount: 1,
      tasksCount: 6,
    },
    {
      id: "7",
      name: "Grace Lee",
      email: "grace@projectflow.com",
      role: "developer",
      projectsCount: 1,
      tasksCount: 4,
    },
    {
      id: "8",
      name: "Admin User",
      email: "admin@projectflow.com",
      role: "admin",
      projectsCount: 6,
      tasksCount: 0,
    },
  ]);

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<"admin" | "manager" | "developer">("developer");

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddUser = () => {
    setSelectedUser(null);
    setUserName("");
    setUserEmail("");
    setUserRole("developer");
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserRole(user.role);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = () => {
    if (!userName.trim() || !userEmail.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (selectedUser) {
      // Edit existing user
      setUsers(
        users.map((u) =>
          u.id === selectedUser.id
            ? { ...u, name: userName, email: userEmail, role: userRole }
            : u
        )
      );
      toast.success("User updated successfully");
    } else {
      // Add new user
      const newUser: User = {
        id: String(users.length + 1),
        name: userName,
        email: userEmail,
        role: userRole,
        projectsCount: 0,
        tasksCount: 0,
      };
      setUsers([...users, newUser]);
      toast.success("User added successfully");
    }

    setIsUserModalOpen(false);
    setSelectedUser(null);
    setUserName("");
    setUserEmail("");
    setUserRole("developer");
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setUsers(users.filter((u) => u.id !== userId));
      toast.success(`${user.name} has been removed`);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-700 hover:bg-purple-100";
      case "manager":
        return "bg-blue-100 text-blue-700 hover:bg-blue-100";
      case "developer":
        return "bg-green-100 text-green-700 hover:bg-green-100";
      default:
        return "bg-slate-100 text-slate-700 hover:bg-slate-100";
    }
  };

  return (
    <div className="flex-1 p-8 bg-slate-50 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-900">Users</h1>
            <p className="text-slate-600 mt-1">Manage team members and their roles</p>
          </div>
          <Button onClick={handleAddUser} className="gap-2">
            <Plus className="w-4 h-4" />
            Add User
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="text-xs bg-blue-500 text-white">
                            {user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-slate-900">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getRoleBadgeColor(user.role)}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">{user.projectsCount}</TableCell>
                    <TableCell className="text-slate-600">{user.tasksCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditUser(user)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                    No users found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* User Modal */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedUser ? "Edit User" : "Add New User"}</DialogTitle>
            <DialogDescription>
              {selectedUser ? "Update the user details below." : "Fill in the details to add a new user."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter full name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={userRole} onValueChange={(value: any) => setUserRole(value)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser}>
              {selectedUser ? "Update User" : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
