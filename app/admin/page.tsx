"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2, RefreshCcw, Save } from "lucide-react";
import { AlignJustify, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Attendee } from "@/types/database.types";

export default function AdminPage() {
  const router = useRouter();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [aiSummaryText, setAiSummaryText] = useState("");
  const [newAttendee, setNewAttendee] = useState({
    name: "",
    email: "",
    job_title: "",
    company: "",
    linkedin_url: "",
    about: "",
    industry_tags: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/admin/attendees");
        const data = await response.json();
        if (!response.ok || !data.success) {
          router.push("/network");
          return;
        }
        setAttendees(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load attendees");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [router]);

  const selected = useMemo(
    () => attendees.find((attendee) => attendee.id === selectedId) || null,
    [attendees, selectedId]
  );

  const filteredAttendees = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return attendees;
    return attendees.filter((attendee) =>
      [attendee.name, attendee.email, attendee.company, attendee.job_title]
        .filter(Boolean)
        .some((field) => field?.toLowerCase().includes(query))
    );
  }, [attendees, searchTerm]);

  useEffect(() => {
    if (!selected) {
      setAiSummaryText("");
      return;
    }
    const bullets = (selected.ai_summary || "")
      .split("\n")
      .map((line: string) => line.trim())
      .filter(Boolean)
      .map((line: string) => (line.startsWith("•") ? line : `• ${line}`));
    setAiSummaryText(bullets.join("\n"));
  }, [selected]);

  const updateSelected = (patch: Partial<Attendee>) => {
    if (!selected) return;
    setAttendees((prev) =>
      prev.map((attendee) =>
        attendee.id === selected.id ? { ...attendee, ...patch } : attendee
      )
    );
  };

  const toggleMultiSelect = () => {
    setIsMultiSelect((prev) => !prev);
    setSelectedIds(new Set());
  };

  const toggleSelectedId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(
      `Permanently delete ${selectedIds.size} profile(s)? This cannot be undone.`
    );
    if (!confirmed) return;

    setError("");
    setSuccess("");
    setIsDeleting(true);

    try {
      const ids = Array.from(selectedIds);
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/attendees/${id}`, { method: "DELETE" }).then((res) => res.json())
        )
      );

      const failures = results.filter((result) => !result?.success);
      if (failures.length > 0) {
        throw new Error("Some profiles could not be deleted.");
      }

      setAttendees((prev) => prev.filter((attendee) => !selectedIds.has(attendee.id)));
      setSelectedIds(new Set());
      setSelectedId(null);
      setIsMultiSelect(false);
      setSuccess("Profiles deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete profiles");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const normalizedSummary = aiSummaryText
        .split("\n")
        .map((line) => line.replace(/^•\s*/, "").trim())
        .filter(Boolean)
        .join("\n");

      const response = await fetch(`/api/admin/attendees/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selected.name,
          email: selected.email || null,
          job_title: selected.job_title,
          company: selected.company,
          linkedin_url: selected.linkedin_url,
          about: selected.about,
          ai_summary: normalizedSummary,
          industry_tags: selected.industry_tags,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save");
      }

      updateSelected(data.data);
      setSuccess("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!selected) return;
    setError("");
    setSuccess("");
    setIsRegenerating(true);

    try {
      const response = await fetch("/api/enrich-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selected.name,
          job_title: selected.job_title || undefined,
          company: selected.company || undefined,
          linkedin_url: selected.linkedin_url || undefined,
          about: selected.about || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to regenerate");
      }

      const summaryLines = Array.isArray(data.data?.summary) ? data.data.summary : [];
      const bullets = summaryLines
        .map((line: string) => line.trim())
        .filter(Boolean)
        .map((line: string) => (line.startsWith("•") ? line : `• ${line}`));

      setAiSummaryText(bullets.join("\n"));
      updateSelected({
        ai_summary: summaryLines.join("\n"),
        industry_tags: data.data?.industry_tags || [],
      });
      setSuccess("AI summary regenerated. Save to apply.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCreateAttendee = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const name = newAttendee.name.trim();
    if (!name) {
      setError("Name is required to create a profile.");
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch("/api/admin/attendees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: newAttendee.email.trim() || null,
          job_title: newAttendee.job_title.trim() || null,
          company: newAttendee.company.trim() || null,
          linkedin_url: newAttendee.linkedin_url.trim() || null,
          about: newAttendee.about.trim() || null,
          industry_tags: newAttendee.industry_tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create attendee");
      }

      setAttendees((prev) => [data.data, ...prev]);
      setSelectedId(data.data.id);
      setNewAttendee({
        name: "",
        email: "",
        job_title: "",
        company: "",
        linkedin_url: "",
        about: "",
        industry_tags: "",
      });
      setSuccess("Profile created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create attendee");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    const confirmed = window.confirm(
      `Permanently delete ${selected.name}'s profile? They can sign up again later with the same email.`
    );
    if (!confirmed) return;

    setError("");
    setSuccess("");
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/attendees/${selected.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete");
      }

      setAttendees((prev) => prev.filter((attendee) => attendee.id !== selected.id));
      setSelectedId(null);
      setSelectedIds(new Set());
      setIsMultiSelect(false);
      setSuccess("Profile deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-12 h-12 text-badger-red animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-16 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-badger-red mb-6">Admin: Manage Attendees</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Attendees</h2>
              <button
                type="button"
                onClick={() => setIsAddOpen((prev) => !prev)}
                className="inline-flex items-center px-3 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-900 hover:border-badger-red/50 transition-all duration-200"
              >
                Add attendee
                {isAddOpen ? (
                  <ChevronUp className="w-4 h-4 ml-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-2" />
                )}
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search attendees..."
                  className={cn(
                    "w-full pl-9 pr-3 py-2 rounded-xl",
                    "bg-gray-50 border border-gray-300",
                    "text-gray-900 placeholder:text-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                    "transition-all duration-200"
                  )}
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={toggleMultiSelect}
                  className={cn(
                    "inline-flex items-center px-3 py-2 rounded-full text-xs font-semibold border transition-all",
                    isMultiSelect
                      ? "border-badger-red text-badger-red"
                      : "border-gray-300 text-gray-600 hover:border-badger-red/50"
                  )}
                >
                  <AlignJustify className="w-4 h-4 mr-2" />
                  Multi-select
                </button>
                {isMultiSelect && (
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={isDeleting || selectedIds.size === 0}
                    className={cn(
                      "inline-flex items-center px-3 py-2 rounded-full text-xs font-semibold border transition-all",
                      selectedIds.size === 0 || isDeleting
                        ? "border-gray-300 text-gray-400"
                        : "border-red-500 text-red-600 hover:bg-red-50"
                    )}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete selected
                  </button>
                )}
              </div>
            </div>

            {isAddOpen && (
              <div className="mb-4 space-y-3">
                {isCreating && (
                  <p className="text-xs text-gray-500 text-center">
                    Generating AI summary and tags...
                  </p>
                )}
                <form onSubmit={handleCreateAttendee} className="space-y-3">
                  <input
                    value={newAttendee.name}
                    onChange={(e) => setNewAttendee({ ...newAttendee, name: e.target.value })}
                    placeholder="Full name"
                    className={cn(
                      "w-full px-3 py-2 rounded-xl",
                      "bg-gray-50 border border-gray-300",
                      "text-gray-900 placeholder:text-gray-400",
                      "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                      "transition-all duration-200"
                    )}
                  />
                  <input
                    value={newAttendee.email}
                    onChange={(e) => setNewAttendee({ ...newAttendee, email: e.target.value })}
                    placeholder="Email (optional)"
                    type="email"
                    className={cn(
                      "w-full px-3 py-2 rounded-xl",
                      "bg-gray-50 border border-gray-300",
                      "text-gray-900 placeholder:text-gray-400",
                      "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                      "transition-all duration-200"
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={newAttendee.job_title}
                      onChange={(e) =>
                        setNewAttendee({ ...newAttendee, job_title: e.target.value })
                      }
                      placeholder="Job title"
                      className={cn(
                        "w-full px-3 py-2 rounded-xl",
                        "bg-gray-50 border border-gray-300",
                        "text-gray-900 placeholder:text-gray-400",
                        "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                        "transition-all duration-200"
                      )}
                    />
                    <input
                      value={newAttendee.company}
                      onChange={(e) => setNewAttendee({ ...newAttendee, company: e.target.value })}
                      placeholder="Company"
                      className={cn(
                        "w-full px-3 py-2 rounded-xl",
                        "bg-gray-50 border border-gray-300",
                        "text-gray-900 placeholder:text-gray-400",
                        "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                        "transition-all duration-200"
                      )}
                    />
                  </div>
                  <input
                    value={newAttendee.linkedin_url}
                    onChange={(e) =>
                      setNewAttendee({ ...newAttendee, linkedin_url: e.target.value })}
                    placeholder="LinkedIn URL (optional)"
                    className={cn(
                      "w-full px-3 py-2 rounded-xl",
                      "bg-gray-50 border border-gray-300",
                      "text-gray-900 placeholder:text-gray-400",
                      "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                      "transition-all duration-200"
                    )}
                  />
                  <textarea
                    value={newAttendee.about}
                    onChange={(e) => setNewAttendee({ ...newAttendee, about: e.target.value })}
                    placeholder="About (optional)"
                    rows={3}
                    className={cn(
                      "w-full px-3 py-2 rounded-xl",
                      "bg-gray-50 border border-gray-300",
                      "text-gray-900 placeholder:text-gray-400",
                      "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                      "transition-all duration-200",
                      "resize-none"
                    )}
                  />
                  <input
                    value={newAttendee.industry_tags}
                    onChange={(e) =>
                      setNewAttendee({ ...newAttendee, industry_tags: e.target.value })}
                    placeholder="Industry tags (comma separated)"
                    className={cn(
                      "w-full px-3 py-2 rounded-xl",
                      "bg-gray-50 border border-gray-300",
                      "text-gray-900 placeholder:text-gray-400",
                      "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                      "transition-all duration-200"
                    )}
                  />
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-badger-red text-white font-semibold hover:bg-badger-darkred transition-all duration-200"
                  >
                    {isCreating ? (
                      <span className="inline-flex items-center">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Creating...
                      </span>
                    ) : (
                      "Create Profile"
                    )}
                  </button>
                </form>
              </div>
            )}

            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {filteredAttendees.map((attendee) => {
                const isSelected = selectedIds.has(attendee.id);
                return (
                  <button
                    key={attendee.id}
                    type="button"
                    onClick={() =>
                      isMultiSelect ? toggleSelectedId(attendee.id) : setSelectedId(attendee.id)
                    }
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl border transition-colors",
                      isMultiSelect && isSelected
                        ? "border-badger-red bg-badger-red/10"
                        : attendee.id === selectedId
                        ? "border-badger-red bg-badger-red/10"
                        : "border-gray-200 hover:border-badger-red/50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{attendee.name}</p>
                        <p className="text-xs text-gray-500">
                          {attendee.email || "Email pending"}
                        </p>
                      </div>
                      {isMultiSelect && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectedId(attendee.id)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-badger-red focus:ring-badger-red"
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="lg:col-span-2 border border-gray-200 rounded-2xl p-6">
            {!selected ? (
              <p className="text-gray-600">Select an attendee to edit.</p>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      value={selected.name}
                      onChange={(e) => updateSelected({ name: e.target.value })}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl",
                        "bg-gray-50 border border-gray-300",
                        "text-gray-900 placeholder:text-gray-400",
                        "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                        "transition-all duration-200"
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      value={selected.email ?? ""}
                      onChange={(e) => updateSelected({ email: e.target.value })}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl",
                        "bg-gray-50 border border-gray-300",
                        "text-gray-900 placeholder:text-gray-400",
                        "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                        "transition-all duration-200"
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                    <input
                      value={selected.job_title ?? ""}
                      onChange={(e) => updateSelected({ job_title: e.target.value })}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl",
                        "bg-gray-50 border border-gray-300",
                        "text-gray-900 placeholder:text-gray-400",
                        "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                        "transition-all duration-200"
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                    <input
                      value={selected.company ?? ""}
                      onChange={(e) => updateSelected({ company: e.target.value })}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl",
                        "bg-gray-50 border border-gray-300",
                        "text-gray-900 placeholder:text-gray-400",
                        "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                        "transition-all duration-200"
                      )}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn URL</label>
                  <input
                    value={selected.linkedin_url ?? ""}
                    onChange={(e) => updateSelected({ linkedin_url: e.target.value })}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl",
                      "bg-gray-50 border border-gray-300",
                      "text-gray-900 placeholder:text-gray-400",
                      "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                      "transition-all duration-200"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">About</label>
                  <textarea
                    value={selected.about ?? ""}
                    onChange={(e) => updateSelected({ about: e.target.value })}
                    rows={4}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl",
                      "bg-gray-50 border border-gray-300",
                      "text-gray-900 placeholder:text-gray-400",
                      "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                      "transition-all duration-200",
                      "resize-none"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">AI Summary</label>
                  <textarea
                    value={aiSummaryText}
                    onChange={(e) => setAiSummaryText(e.target.value)}
                    rows={6}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl",
                      "bg-gray-50 border border-gray-300",
                      "text-gray-900 placeholder:text-gray-400",
                      "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                      "transition-all duration-200",
                      "resize-none"
                    )}
                  />
                  <p className="mt-2 text-xs text-gray-500">Use one bullet per line.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Industry Tags</label>
                  <input
                    value={selected.industry_tags?.join(", ") ?? ""}
                    onChange={(e) =>
                      updateSelected({
                        industry_tags: e.target.value
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean),
                      })
                    }
                    className={cn(
                      "w-full px-4 py-3 rounded-xl",
                      "bg-gray-50 border border-gray-300",
                      "text-gray-900 placeholder:text-gray-400",
                      "focus:outline-none focus:ring-2 focus:ring-badger-red focus:border-transparent",
                      "transition-all duration-200"
                    )}
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
                {success && <p className="text-sm text-green-600">{success}</p>}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center px-5 py-2.5 rounded-full bg-badger-red text-white font-semibold hover:bg-badger-darkred transition-all duration-200"
                  >
                    {isSaving ? (
                      <span className="inline-flex items-center">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Saving...
                      </span>
                    ) : (
                      <span className="inline-flex items-center">
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    className="inline-flex items-center px-5 py-2.5 rounded-full border border-badger-red text-badger-red font-semibold hover:bg-badger-red hover:text-white transition-all duration-200"
                  >
                    {isRegenerating ? (
                      <span className="inline-flex items-center">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Regenerating...
                      </span>
                    ) : (
                      <span className="inline-flex items-center">
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Regenerate
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center px-5 py-2.5 rounded-full border border-red-500 text-red-600 font-semibold hover:bg-red-500 hover:text-white transition-all duration-200"
                  >
                    {isDeleting ? (
                      <span className="inline-flex items-center">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Deleting...
                      </span>
                    ) : (
                      "Delete Profile"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
