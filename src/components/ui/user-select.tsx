"use client";

import { User } from "@/types/user";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAuthContext } from "@/lib/auth";

interface UserSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  onUserSelect?: (user: User) => void;
  placeholder?: string;
}

export function UserSelect({ value, onValueChange, onUserSelect, placeholder }: UserSelectProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { tenantId, userId } = getAuthContext();
        const response = await fetch("/api/users", {
          headers: {
            "x-tenant-id": tenantId,
            "x-user-id": userId,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch users");
        const data = await response.json();
        setUsers(data.items || []);
      } catch (error) {
        console.error("Error fetching users:", error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleValueChange = (newValue: string) => {
    onValueChange(newValue);
    if (onUserSelect) {
      const selectedUser = users.find(user => user.userId === newValue);
      if (selectedUser) {
        onUserSelect(selectedUser);
      }
    }
  };

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder || "Select a user"} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px] overflow-y-auto">
        {Array.isArray(users) && users.map((user) => (
          <SelectItem key={user.userId} value={user.userId}>
            {`${user.firstName} ${user.lastName}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 