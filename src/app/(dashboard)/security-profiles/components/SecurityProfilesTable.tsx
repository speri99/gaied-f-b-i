"use client";

import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getAuthContext } from "@/lib/auth";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SecurityProfileForm } from "./SecurityProfileForm";

export function SecurityProfilesTable({ 
  onEdit,
  refreshTrigger 
}: { 
  onEdit: (profile: SecurityProfile) => void;
  refreshTrigger: number;
}) {
  const [profiles, setProfiles] = useState<SecurityProfile[]>([]);
  const [search, setSearch] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const { toast } = useToast();
  const { tenantId, userId } = getAuthContext();

  const fetchProfiles = async () => {
    try {
      const response = await fetch(
        `/api/security-profiles?search=${search}&showDeleted=${showDeleted}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch security profiles");
      }

      const data = await response.json();
      setProfiles(data.items);
    } catch (error) {
      console.error("Error fetching security profiles:", error);
      toast({
        title: "Error",
        description: "Failed to fetch security profiles",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [search, showDeleted, refreshTrigger]);

  const handleDelete = async (profileId: string) => {
    try {
      const response = await fetch(`/api/security-profiles/${profileId}`, {
        method: "DELETE",
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error("Failed to delete security profile");
      }

      toast({
        title: "Success",
        description: "Security profile deleted successfully",
      });

      fetchProfiles();
    } catch (error) {
      console.error("Error deleting security profile:", error);
      toast({
        title: "Error",
        description: "Failed to delete security profile",
        variant: "destructive",
      });
    }
  };

  function getPermissionBadgeVariant(permission: string) {
    switch (permission) {
      case "write":
        return "default";
      case "read":
        return "secondary";
      default:
        return "outline";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Input
          placeholder="Search profiles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center space-x-2">
          <Switch
            id="show-deleted"
            checked={showDeleted}
            onCheckedChange={setShowDeleted}
          />
          <Label htmlFor="show-deleted">Show Deleted Items</Label>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow key={profile.profileId}>
                <TableCell className="font-medium">{profile.name}</TableCell>
                <TableCell>{profile.description}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(profile.permissions).map(([key, value]) => (
                      <Badge
                        key={key}
                        variant={getPermissionBadgeVariant(value)}
                      >
                        {key}: {value}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {profile.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={profile.status === "Active" ? "default" : "secondary"}
                  >
                    {profile.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(profile)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(profile.profileId)}
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