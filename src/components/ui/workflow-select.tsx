"use client";

import { getAuthContext } from "@/lib/auth";
import { Workflow } from "@/types/workflow";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import { User } from "lucide-react";
import { useState, useEffect } from "react";
import { any } from "zod";

interface WorkflowSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  onWorkFlowSelect?: (user: Workflow) => void;
  placeholder?: string;
}

export function WorkflowSelect({ value, onValueChange, onWorkFlowSelect, placeholder }: WorkflowSelectProps) {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      const fetchUsers = async () => {
        try {
          const { tenantId, userId } = getAuthContext();
          const response = await fetch("/api/workflows", {
            headers: {
              "x-tenant-id": tenantId,
              "x-user-id": userId,
            },
          });
          if (!response.ok) throw new Error("Failed to fetch users");
          const data = await response.json();
          setWorkflows(data.items || []);
        } catch (error) {
          console.error("Error fetching users:", error);
          setWorkflows([]);
        } finally {
          setLoading(false);
        }
      };
  
      fetchUsers();
    }, []);
  
    const handleValueChange = (newValue: string) => {
      onValueChange(newValue);
      if (onWorkFlowSelect) {
        const selectedUser = workflows.find(wf => wf.workflowId === newValue);
        if (selectedUser) {
            onWorkFlowSelect(selectedUser);
        }
      }
    };
  
    if (loading) {
      return <div>Loading users...</div>;
    }
  
    return (
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder || "Select a workflow"} />
        </SelectTrigger>
        <SelectContent className="max-h-[300px] overflow-y-auto">
          {Array.isArray(workflows) && workflows.map((user) => (
            <SelectItem key={user.workflowId} value={user.workflowId}>
              {`${user.workflowName}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  } 