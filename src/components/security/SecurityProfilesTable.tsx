"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit, Trash2, Lock, Key } from "lucide-react";
import FadeInSection from "@/components/animations/FadeInSection";

// Mock data for initial development
const mockProfiles = [
  {
    id: "1",
    name: "Administrator",
    description: "Full system access with all permissions",
    permissions: ["read", "write", "delete", "manage_users", "manage_roles"],
    status: "Active",
  },
  {
    id: "2",
    name: "Case Manager",
    description: "Access to manage cases and contacts",
    permissions: ["read", "write", "manage_cases"],
    status: "Active",
  },
  {
    id: "3",
    name: "Viewer",
    description: "Read-only access to cases and reports",
    permissions: ["read"],
    status: "Active",
  },
];

const SecurityProfilesTable = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [profiles, setProfiles] = useState(mockProfiles);

  // Filter profiles based on search query
  const filteredProfiles = profiles.filter(
    (profile) =>
      profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <FadeInSection>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Security Profiles</CardTitle>
              <CardDescription>
                Manage security profiles and permissions
              </CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Profile
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Security Profile</DialogTitle>
                  <DialogDescription>
                    Create a new security profile and set its permissions.
                  </DialogDescription>
                </DialogHeader>
                {/* Add profile form will go here */}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search profiles..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profile Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.name}</TableCell>
                    <TableCell>{profile.description}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {profile.permissions.map((permission) => (
                          <Badge
                            key={permission}
                            variant="outline"
                            className="capitalize"
                          >
                            {permission.replace("_", " ")}
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
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </FadeInSection>
  );
};

export default SecurityProfilesTable; 