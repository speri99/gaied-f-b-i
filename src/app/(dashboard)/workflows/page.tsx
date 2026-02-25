"use client";

import React, { useState, useEffect } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { Plus, Search, Edit, Trash2, Loader2 } from "lucide-react";
import { getAuthContext, useAuth } from "@/lib/auth";
import { Workflow } from "@/types/workflow";


export default function WorkflowsTable() {
  const { createAuthHeaders, user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authContext, setAuthContext] = useState<{ tenantId: string; userId: string } | null>(null);


  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      const context = await getAuthContext();
      setAuthContext(context);
      // Move inside so it uses fresh context
      const workflows = await fetch("/api/workflows", {
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": context.tenantId,
          "x-user-id": context.userId,
        },
      });
      const data = await workflows.json();
      setWorkflows(data.items);
      setLoading(false)
      console.log("Fetched workflows:", data);
    };
    initAuth();
  }, []);

  // const filteredWorkflows = workflows.filter((wf) =>
  //   wf.workflowName.toLowerCase().includes(searchQuery.toLowerCase())
  // );

  const handleEdit = (id: string) => router.push(`/workflows/${id}`);
  const handleDelete = () => {
    setWorkflows(workflows.filter((w) => w.workflowId !== selectedWorkflow?.workflowId));
    setDeleteDialogOpen(false);
    setSelectedWorkflow(null);
  };

  return (
    <>
      <div className="space-y-6">

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>All Workflows</CardTitle>
                <CardDescription>Manage your workflow automations.</CardDescription>
              </div>
              <div>
                <Button onClick={() => router.push("/workflows/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Workflow
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search workflows..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="rounded-md border">

              {loading ? (<div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>) : (<Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Tenant Id</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Status</TableHead>

                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflows.length ? (
                    workflows.map((wf) => (
                      <TableRow key={wf.workflowId} className="hover:bg-muted/50 transition-colors">
                        <TableCell>{wf.workflowName}</TableCell>
                        <TableCell>{wf.tenantId}</TableCell>
                        <TableCell>{wf.createdBy}</TableCell>
                        <TableCell>
                          <Badge variant={wf.status === "ACTIVE" ? "default" : "secondary"}>
                            {wf.status}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(wf.workflowId)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedWorkflow(wf);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        No workflows found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>)}

            </div>
          </CardContent>
        </Card>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
              <p className="text-muted-foreground">
                Are you sure you want to delete “{selectedWorkflow?.workflowName}”? This cannot be undone.
              </p>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}