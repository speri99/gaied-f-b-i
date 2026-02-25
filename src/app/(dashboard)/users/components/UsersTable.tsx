"use client";

import { useEffect, useState } from "react";
import { User, UserStatus } from "@/types/user";
import { SecurityProfile } from "@/types/security-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MoreVertical } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getAuthContext } from "@/lib/auth";

const STATUS_OPTIONS: { value: UserStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

interface UsersTableProps {
  onEdit: (user: User) => void;
  refreshTrigger: number;
}

export function UsersTable({ onEdit, refreshTrigger }: UsersTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [securityProfiles, setSecurityProfiles] = useState<SecurityProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const { toast } = useToast();
  const { tenantId, userId } = getAuthContext();

  const fetchSecurityProfiles = async () => {
    try {
      setIsLoadingProfiles(true);
      const response = await fetch("/api/security-profiles", {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch security profiles");
      }

      const data = await response.json();
      setSecurityProfiles(data.items);
    } catch (error) {
      console.error("Error fetching security profiles:", error);
      toast({
        title: "Error",
        description: "Failed to fetch security profiles",
        variant: "destructive",
      });
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch(`/api/users?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Failed to fetch users: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.items) {
        console.warn('No items array in response:', data);
        setUsers([]);
        return;
      }

      setUsers(data.items);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch users",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchSecurityProfiles();
  }, [refreshTrigger]);

  useEffect(() => {
    fetchUsers();
  }, [search, statusFilter, refreshTrigger]);

  const getSecurityProfileName = (profileId: string) => {
    if (!securityProfiles.length) {
      console.log("Security profiles not loaded yet");
      return profileId;
    }
    const profile = securityProfiles.find(p => p.profileId === profileId);
    return profile?.name || profileId;
  };

  const handleDelete = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as UserStatus | "all")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Security Profile</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Auth Method</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.userId}>
                <TableCell className="font-medium">
                  {user.firstName} {user.lastName}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {isLoadingProfiles ? (
                      <Badge variant="outline">Loading...</Badge>
                    ) : user.securityProfiles?.length > 0 ? (
                      user.securityProfiles.map(profileId => (
                        <Badge key={profileId} variant="outline">
                          {getSecurityProfileName(profileId)}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline">No Profile</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.status === "Active" ? "default" : "secondary"}
                  >
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{user.authMethod}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(user)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(user.userId)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 