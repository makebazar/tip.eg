"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, X, Settings, Copy, Check, RefreshCw, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  LocationWithStats, 
  selectActiveLocation, 
  createLocation, 
  updateLocation, 
  deleteLocation,
  getLocationManagers,
  removeLocationManager
} from "@/app/actions/locations";
import { getOrCreateInviteLink, regenerateInviteLink } from "@/app/actions/invites";
import { logoutBusiness } from "@/app/actions/auth";

interface LocationsClientProps {
  locations: LocationWithStats[];
  activeBusinessId: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export function LocationsClient({ locations: initialLocations, activeBusinessId, user }: LocationsClientProps) {
  const [locations, setLocations] = useState<LocationWithStats[]>(initialLocations);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationWithStats | null>(null);
  
  // Settings modal tabs & managers state
  const [activeTab, setActiveTab] = useState<"general" | "managers" | "danger">("general");
  const [managers, setManagers] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);



  const filteredLocations = locations.filter((loc) =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (loc.city && loc.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (loc.address && loc.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Load managers and invite link when editing a location
  useEffect(() => {
    if (editingLocation) {
      setActiveTab("general");
      getLocationManagers(editingLocation.id).then((res) => {
        if (res.success && res.managers) {
          setManagers(res.managers);
        }
      });

      getOrCreateInviteLink(editingLocation.id, "MANAGER").then((res) => {
        if (res.success && res.token) {
          setInviteToken(res.token);
        }
      });
    }
  }, [editingLocation]);

  const handleSelectLocation = async (id: string) => {
    setSelectingId(id);
    try {
      await selectActiveLocation(id);
    } catch (err: any) {
      console.error(err);
      setSelectingId(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createLocation(formData);

    setLoading(false);
    if (result.success) {
      setIsCreateModalOpen(false);
      window.location.reload();
    } else {
      setError(result.error || "Failed to create location");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingLocation) return;
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateLocation(editingLocation.id, formData);

    setLoading(false);
    if (result.success) {
      setLocations(prev => prev.map(l => l.id === editingLocation.id ? {
        ...l,
        name: (formData.get("name") as string) || l.name,
        name_ar: (formData.get("name_ar") as string) || l.name_ar,
        city: (formData.get("city") as string) || l.city,
        address: (formData.get("address") as string) || l.address,
        currency: (formData.get("currency") as string) || l.currency,
        business_type: (formData.get("business_type") as string) || l.business_type,
      } : l));
      setEditingLocation(null);
    } else {
      setError(result.error || "Failed to update location");
    }
  };

  const handleCopyInviteLink = () => {
    if (!inviteToken) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/business/invite/${inviteToken}`;

    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleResetInviteLink = async () => {
    if (!editingLocation) return;
    setLoading(true);
    const res = await regenerateInviteLink(editingLocation.id, "MANAGER");
    setLoading(false);

    if (res.success && res.token) {
      setInviteToken(res.token);
    } else {
      alert("Failed to reset invitation link");
    }
  };

  const handleRemoveManager = async (managerId: string) => {
    if (!editingLocation) return;
    setLoading(true);
    const res = await removeLocationManager(editingLocation.id, managerId);
    setLoading(false);

    if (res.success) {
      setManagers(prev => prev.filter(m => m.id !== managerId));
    } else {
      alert(res.error || "Failed to remove manager");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!editingLocation) return;
    if (!confirm(`Are you sure you want to delete "${editingLocation.name}"? This action cannot be undone.`)) return;

    setLoading(true);
    const result = await deleteLocation(editingLocation.id);
    setLoading(false);

    if (result.success) {
      setLocations(prev => prev.filter(l => l.id !== editingLocation.id));
      setEditingLocation(null);
    } else {
      alert(result.error || "Failed to delete location");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-900 font-sans pb-16">
      {/* Top Navbar */}
      <header className="w-full sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 py-3.5">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link href="/business/locations" className="flex items-center gap-2 group select-none">
            <span className="text-2xl font-black tracking-tight text-slate-900">
              tip<span className="text-[#B58A1C]">.eg</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/business/account" title="Account Settings">
              <Button variant="secondary" size="icon-sm">
                <Settings className="w-4 h-4 text-slate-600" />
                <span className="sr-only">Account Settings</span>
              </Button>
            </Link>
            <form action={logoutBusiness}>
              <Button variant="destructive" size="icon-sm" type="submit" title="Logout">
                <LogOut className="w-4 h-4" />
                <span className="sr-only">Logout</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-8">


        {/* Toolbar & Search */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by name or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button onClick={() => setIsCreateModalOpen(true)} size="default">
            <Plus className="w-4 h-4" />
            <span>Add New Location</span>
          </Button>
        </div>

        {/* Locations Grid */}
        {filteredLocations.length === 0 ? (
          <Card className="p-12 text-center my-8">
            <h3 className="text-base font-bold text-slate-900">No Locations Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {searchQuery ? "No locations match your search query." : "You don't have any locations set up yet. Click the button above to add your first location."}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateModalOpen(true)} variant="secondary" className="mt-4">
                + Add First Location
              </Button>
            )}
          </Card>
        ) : (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLocations.map((location) => {
              const isActive = location.id === activeBusinessId;
              const isSelecting = selectingId === location.id;

              return (
                <motion.div
                  key={location.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className={`p-6 flex flex-col justify-between h-full ${isActive ? "border-[#B58A1C] ring-2 ring-[#B58A1C]/20" : ""}`}>
                    <div>
                      {/* Header line */}
                      <div className="mb-4">
                        <h3 className="font-bold text-slate-900 text-lg leading-tight">
                          {location.name}
                        </h3>
                        {location.name_ar && (
                          <p className="text-xs text-slate-500 font-arabic">{location.name_ar}</p>
                        )}
                        <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                          {location.business_type || "RESTAURANT"}
                        </span>
                      </div>

                      {/* Address & Info */}
                      <div className="space-y-2 text-xs text-slate-600 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                        <div className="font-medium text-slate-700 truncate">
                          {location.address || location.city || "No address specified"}
                        </div>
                        <div className="flex items-center justify-between text-slate-500 pt-1.5 border-t border-slate-200/60 font-medium">
                          <span>{location.spots_count} spots</span>
                          <span>{location.staff_count} staff</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Open Dashboard + Settings Icon */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        onClick={() => handleSelectLocation(location.id)}
                        disabled={isSelecting}
                        variant={isActive ? "secondary" : "default"}
                        className="flex-1"
                      >
                        {isSelecting ? "Opening..." : isActive ? "Open Dashboard" : "Manage Location"}
                      </Button>

                      <Button
                        onClick={() => setEditingLocation(location)}
                        variant="secondary"
                        size="icon"
                        title="Location Settings"
                      >
                        <Settings className="w-4 h-4 text-slate-600" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* CREATE LOCATION MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg"
            >
              <Card className="p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Create New Location</h3>
                    <p className="text-xs text-slate-500">Add a new restaurant, branch, or venue</p>
                  </div>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                    {error}
                  </div>
                )}

                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Location Name <span className="text-[#B58A1C]">*</span>
                    </label>
                    <Input
                      name="name"
                      required
                      placeholder="e.g. Downtown Branch"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Arabic Name</label>
                      <Input
                        name="name_ar"
                        placeholder="فرع وسط البلد"
                        className="font-arabic"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Business Type</label>
                      <select
                        name="business_type"
                        defaultValue="RESTAURANT"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#B58A1C]"
                      >
                        <option value="RESTAURANT">Restaurant / Cafe</option>
                        <option value="HOTEL">Hotel</option>
                        <option value="SALON">Salon / Barber</option>
                        <option value="DELIVERY">Delivery Service</option>
                        <option value="CAR_WASH">Car Wash</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                      <Input
                        name="city"
                        placeholder="Cairo / Alexandria"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
                      <select
                        name="currency"
                        defaultValue="EGP"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#B58A1C]"
                      >
                        <option value="EGP">EGP (Egyptian Pound)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="AED">AED (Dirham)</option>
                        <option value="SAR">SAR (Riyal)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                    <Input
                      name="address"
                      placeholder="123 Main St, Block 4"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button type="button" onClick={() => setIsCreateModalOpen(false)} variant="secondary">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading} variant="default">
                      {loading ? "Creating..." : "Create Location"}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT LOCATION & SETTINGS MODAL */}
      <AnimatePresence>
        {editingLocation && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg"
            >
              <Card className="p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{editingLocation.name} — Settings</h3>
                    <p className="text-xs text-slate-500">Manage base details, managers, and access</p>
                  </div>
                  <button
                    onClick={() => setEditingLocation(null)}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Settings Sub-Tabs */}
                <div className="flex border-b border-slate-200 mb-5 text-xs font-medium">
                  <button
                    onClick={() => setActiveTab("general")}
                    className={`pb-2.5 px-3 border-b-2 transition-colors ${
                      activeTab === "general"
                        ? "border-[#B58A1C] text-[#B58A1C] font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    General Info
                  </button>
                  <button
                    onClick={() => setActiveTab("managers")}
                    className={`pb-2.5 px-3 border-b-2 transition-colors ${
                      activeTab === "managers"
                        ? "border-[#B58A1C] text-[#B58A1C] font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Location Managers ({managers.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("danger")}
                    className={`pb-2.5 px-3 border-b-2 transition-colors ${
                      activeTab === "danger"
                        ? "border-red-600 text-red-600 font-bold"
                        : "border-transparent text-slate-500 hover:text-red-600"
                    }`}
                  >
                    Danger Zone
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                    {error}
                  </div>
                )}

                {/* TAB 1: GENERAL INFO */}
                {activeTab === "general" && (
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Location Name</label>
                      <Input
                        name="name"
                        defaultValue={editingLocation.name}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Arabic Name</label>
                        <Input
                          name="name_ar"
                          defaultValue={editingLocation.name_ar || ""}
                          className="font-arabic"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Business Type</label>
                        <select
                          name="business_type"
                          defaultValue={editingLocation.business_type}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#B58A1C]"
                        >
                          <option value="RESTAURANT">Restaurant / Cafe</option>
                          <option value="HOTEL">Hotel</option>
                          <option value="SALON">Salon / Barber</option>
                          <option value="DELIVERY">Delivery Service</option>
                          <option value="CAR_WASH">Car Wash</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                        <Input
                          name="city"
                          defaultValue={editingLocation.city || ""}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
                        <select
                          name="currency"
                          defaultValue={editingLocation.currency}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-[#B58A1C]"
                        >
                          <option value="EGP">EGP (Egyptian Pound)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="AED">AED (Dirham)</option>
                          <option value="SAR">SAR (Riyal)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                      <Input
                        name="address"
                        defaultValue={editingLocation.address || ""}
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                      <Button type="button" onClick={() => setEditingLocation(null)} variant="secondary">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading} variant="default">
                        {loading ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                )}

                {/* TAB 2: LOCATION MANAGERS */}
                {activeTab === "managers" && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600">
                      Share invitation link to assign managers to this location.
                    </p>

                    {/* Manager Invite Link Card */}
                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-amber-900">Manager Invitation Link</h4>
                        <button
                          type="button"
                          onClick={handleResetInviteLink}
                          disabled={loading}
                          className="text-[11px] text-amber-800 hover:text-amber-950 flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Reset Link
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={inviteToken && typeof window !== "undefined" ? `${window.location.origin}/business/invite/${inviteToken}` : "Loading invite link..."}
                          className="h-9 text-xs font-mono bg-white text-slate-800 flex-1"
                        />
                        <Button onClick={handleCopyInviteLink} size="sm" variant="default">
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Existing Managers List */}
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Managers ({managers.length})</h4>
                      {managers.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No additional managers assigned yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {managers.map((m) => (
                            <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 text-xs">
                              <div>
                                <span className="font-bold text-slate-800">{m.name}</span>
                                <span className="text-slate-500 ml-2">({m.email})</span>
                              </div>
                              {m.id !== user.id ? (
                                <Button
                                  type="button"
                                  onClick={() => handleRemoveManager(m.id)}
                                  variant="destructive"
                                  size="sm"
                                >
                                  Remove
                                </Button>
                              ) : (
                                <Badge variant="secondary">Owner (You)</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: DANGER ZONE */}
                {activeTab === "danger" && (
                  <div className="p-4 rounded-xl bg-red-50/50 border border-red-200 space-y-3">
                    <h4 className="text-sm font-bold text-red-700">Delete Business Location</h4>
                    <p className="text-xs text-red-600/90 leading-relaxed">
                      Permanently remove <strong>{editingLocation.name}</strong> along with its assigned spots, menu items, and venue records. This action cannot be undone.
                    </p>
                    <div className="pt-2">
                      <Button onClick={handleDeleteConfirm} disabled={loading} variant="destructive">
                        Delete Location
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
