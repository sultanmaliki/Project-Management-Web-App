import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api";
import { ROLE_LABELS, type Role, type UserListItem } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { ConfirmDialog } from "./ConfirmDialog";
import { MIN_PASSWORD_LENGTH } from "./SignupPage";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Skeleton } from "./ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

const ROLE_STYLES: Record<Role, string> = {
  admin: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  manager: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  developer: "bg-green-100 text-green-700 hover:bg-green-100",
};

interface FormState {
  name: string;
  email: string;
  role: Role;
  password: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = { name: "", email: "", role: "developer", password: "", is_active: true };

export function UsersPage() {
  const { user: me } = useAuth();
  const { data: users, loading, error, reload } = useApi(() => api.users.list(), []);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<UserListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<UserListItem | null>(null);

  const filtered = (users ?? []).filter((u) => {
    const q = search.trim().toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (user: UserListItem) => {
    setEditing(user);
    setForm({ name: user.name, email: user.email, role: user.role, password: "", is_active: user.is_active });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return setFormError("Name and email are required.");
    if (!editing && form.password.length < MIN_PASSWORD_LENGTH) return setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (editing && form.password && form.password.length < MIN_PASSWORD_LENGTH) return setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);

    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await api.users.update(editing.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          is_active: form.is_active,
          ...(form.password ? { password: form.password } : {}),
        });
        toast.success("User updated.");
      } else {
        await api.users.create({ name: form.name.trim(), email: form.email.trim(), role: form.role, password: form.password });
        toast.success("User created.");
      }
      setFormOpen(false);
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await api.users.remove(toDelete.id);
      toast.success(`${toDelete.name} has been removed.`);
      setToDelete(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete the user."));
      throw err;
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Users</h1>
            <p className="text-slate-600 mt-1">Manage team members and their roles</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" aria-hidden /> Add User
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
          <Input aria-label="Search users" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={reload}>
              Retry
            </Button>
          </div>
        ) : loading && !users ? (
          <Skeleton className="h-64 rounded-lg" />
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
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
                {filtered.length > 0 ? (
                  filtered.map((user) => (
                    <TableRow key={user.id} className={user.is_active ? undefined : "opacity-60"}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-blue-500 text-white">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-slate-900">{user.name}</span>
                          {!user.is_active && <Badge variant="outline">Inactive</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={ROLE_STYLES[user.role]}>
                          {ROLE_LABELS[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">{user.project_count}</TableCell>
                      <TableCell className="text-slate-600">{user.task_count}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(user)} aria-label={`Edit ${user.name}`}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setToDelete(user)}
                            disabled={user.id === me?.id}
                            title={user.id === me?.id ? "You can't delete your own account" : undefined}
                            aria-label={`Delete ${user.name}`}
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
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSave} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit user" : "Add new user"}</DialogTitle>
              <DialogDescription>{editing ? "Update the user's details or reset their password." : "Create an account with a role and an initial password."}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="user-name">Name</Label>
              <Input id="user-name" value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input id="user-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-role">Role</Label>
              <Select value={form.role} onValueChange={(role) => setForm({ ...form, role: role as Role })}>
                <SelectTrigger id="user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">{editing ? "New password (leave blank to keep)" : "Password"}</Label>
              <Input id="user-password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
            </div>
            {editing && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Account is active (inactive users cannot sign in)
              </label>
            )}
            {formError && (
              <p role="alert" className="text-sm text-red-600">
                {formError}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Update user" : "Add user"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete ${toDelete?.name ?? "user"}?`}
        description="Their tasks will become unassigned. This can't be undone. To just block sign-in, deactivate the account instead."
        onCancel={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
