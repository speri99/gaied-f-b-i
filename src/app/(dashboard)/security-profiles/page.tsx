"use client";

import { useState } from "react";
import { SecurityProfilesTable } from "./components/SecurityProfilesTable";
import { SecurityProfileForm } from "./components/SecurityProfileForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SecurityProfile } from "@/types/security-profile";

export default function SecurityProfilesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<SecurityProfile | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEdit = (profile: SecurityProfile) => {
    setSelectedProfile(profile);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedProfile(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedProfile(null);
  };

  const handleSuccess = () => {
    handleDialogClose();
    setRefreshTrigger(prev => prev + 1); // Trigger table refresh
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Security Profiles</h1>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Profile
        </Button>
      </div>

      <SecurityProfilesTable 
        onEdit={handleEdit} 
        refreshTrigger={refreshTrigger}
      />

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {selectedProfile ? "Edit Security Profile" : "Create Security Profile"}
            </DialogTitle>
          </DialogHeader>
          <SecurityProfileForm
            profileId={selectedProfile?.profileId}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
