const handleViewLocation = async (contact: ContactRecord) => {
  try {
    const { tenantId, userId } = getAuthContext();
    const response = await fetch(`/api/cases/${caseId}/locations/${contact.UUID}`, {
      headers: {
        "x-tenant-id": tenantId,
        "x-user-id": userId,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch location data");
    }

    const location = await response.json();
    setSelectedLocation(location);
  } catch (err) {
    console.error("Error fetching location:", err);
    setError(err instanceof Error ? err.message : "Failed to fetch location");
  }
}; 