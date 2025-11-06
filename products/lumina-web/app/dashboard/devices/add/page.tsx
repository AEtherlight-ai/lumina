/**
 * DESIGN DECISION: Add Device Flow with Storage Allocation
 * WHY: Users need to register new devices and allocate storage upfront
 *
 * REASONING CHAIN:
 * 1. Device name helps users identify devices ("Work Laptop", "Home Desktop")
 * 2. Device type enables type-specific optimizations (desktop = always-on, mobile = battery-aware)
 * 3. Storage slider prevents over-allocation (can't exceed available storage)
 * 4. Visual feedback shows remaining storage in real-time
 * 5. Form validation prevents empty names or zero storage
 *
 * PATTERN: Pattern-DEVICE-001 (Multi-device management)
 * RELATED: Device list page, storage quota system
 * FUTURE: Auto-detect device type, recommend storage based on device capabilities
 */

"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

export default function AddDevicePage() {
  const router = useRouter();
  const supabase = createClient();

  const [deviceName, setDeviceName] = useState("");
  const [deviceType, setDeviceType] = useState<"desktop" | "laptop" | "tablet" | "mobile">(
    "desktop"
  );
  const [storageAllocated, setStorageAllocated] = useState(100);
  const [loading, setLoading] = useState(false);

  // Storage context
  const [totalStorage, setTotalStorage] = useState(0);
  const [allocatedStorage, setAllocatedStorage] = useState(0);
  const [remainingStorage, setRemainingStorage] = useState(0);

  useEffect(() => {
    async function fetchStorageInfo() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile storage limits
      const { data: profile } = await supabase
        .from("profiles")
        .select("storage_limit_mb, storage_bonus_mb")
        .eq("id", user.id)
        .single();

      const total = (profile?.storage_limit_mb || 0) + (profile?.storage_bonus_mb || 0);
      setTotalStorage(total);

      // Get allocated storage from existing devices
      const { data: devices } = await supabase
        .from("devices")
        .select("storage_allocated_mb")
        .eq("user_id", user.id);

      const allocated = (devices || []).reduce(
        (sum, device) => sum + device.storage_allocated_mb,
        0
      );
      setAllocatedStorage(allocated);
      setRemainingStorage(total - allocated);

      // Set default allocation (20% of remaining or 100MB, whichever is smaller)
      const defaultAllocation = Math.min(Math.floor((total - allocated) * 0.2), 100);
      setStorageAllocated(Math.max(defaultAllocation, 10)); // Minimum 10MB
    }

    fetchStorageInfo();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!deviceName.trim()) {
      toast.error("Please enter a device name");
      return;
    }

    if (storageAllocated > remainingStorage) {
      toast.error("Storage allocation exceeds available storage");
      return;
    }

    if (storageAllocated < 10) {
      toast.error("Minimum storage allocation is 10 MB");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("devices").insert({
        user_id: user.id,
        device_name: deviceName.trim(),
        device_type: deviceType,
        storage_allocated_mb: storageAllocated,
        last_sync_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success(`${deviceName} added successfully!`);
      router.push("/dashboard/devices");
    } catch (error: any) {
      toast.error(error.message || "Failed to add device");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/devices"
          className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block"
        >
          ← Back to Devices
        </Link>
        <h1 className="text-3xl font-bold">Add New Device</h1>
        <p className="text-gray-600 mt-1">Register a device to sync your patterns and data</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 space-y-6">
        {/* Device Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Device Name
          </label>
          <input
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="e.g., Work Laptop, Home Desktop"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Give your device a memorable name
          </p>
        </div>

        {/* Device Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Device Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: "desktop", icon: "🖥️", label: "Desktop" },
              { value: "laptop", icon: "💻", label: "Laptop" },
              { value: "tablet", icon: "📱", label: "Tablet" },
              { value: "mobile", icon: "📱", label: "Mobile" },
            ].map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setDeviceType(type.value as any)}
                className={`p-4 border-2 rounded-lg transition-all ${
                  deviceType === type.value
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                disabled={loading}
              >
                <div className="text-3xl mb-2">{type.icon}</div>
                <div className="text-sm font-medium">{type.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Storage Allocation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Storage Allocation
          </label>
          <div className="space-y-4">
            <input
              type="range"
              min="10"
              max={remainingStorage}
              value={storageAllocated}
              onChange={(e) => setStorageAllocated(parseInt(e.target.value))}
              className="w-full"
              disabled={loading}
            />
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">10 MB</span>
              <span className="font-semibold text-lg text-blue-600">
                {storageAllocated} MB
              </span>
              <span className="text-gray-600">{remainingStorage} MB</span>
            </div>
          </div>

          {/* Storage Info */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Available</span>
              <span className="font-medium">{totalStorage} MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Already Allocated</span>
              <span className="font-medium">{allocatedStorage} MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Remaining</span>
              <span className="font-medium text-green-600">{remainingStorage} MB</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !deviceName.trim() || storageAllocated > remainingStorage}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? "Adding Device..." : "Add Device"}
        </button>
      </form>

      {/* Help Text */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Allocation Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Allocate more to devices you use most frequently</li>
          <li>• You can adjust allocation later without losing data</li>
          <li>• Desktop: 500MB-2GB recommended</li>
          <li>• Mobile: 100MB-500MB recommended</li>
        </ul>
      </div>
    </div>
  );
}
