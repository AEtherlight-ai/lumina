/**
 * DESIGN DECISION: Delete Confirmation with Data Warning
 * WHY: Prevent accidental device removal and data loss
 *
 * REASONING CHAIN:
 * 1. Confirmation page forces user to acknowledge action (prevent accidental clicks)
 * 2. Show device details before deletion (user confirms correct device)
 * 3. Warning about data loss sets expectations (patterns may need re-sync)
 * 4. Storage reallocation explanation builds trust (storage returns to pool)
 * 5. Cancel button provides easy exit (reduce friction for changed minds)
 *
 * PATTERN: Pattern-DEVICE-001 (Multi-device management)
 * RELATED: Device list page, add device flow
 * FUTURE: Archive device instead of delete, restore deleted devices within 30 days
 */

"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

interface Device {
  id: string;
  device_name: string;
  device_type: string;
  storage_allocated_mb: number;
  last_sync_at: string | null;
}

export default function DeleteDevicePage() {
  const router = useRouter();
  const params = useParams();
  const deviceId = params.id as string;
  const supabase = createClient();

  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    async function fetchDevice() {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .eq("id", deviceId)
        .single();

      if (error || !data) {
        toast.error("Device not found");
        router.push("/dashboard/devices");
        return;
      }

      setDevice(data as Device);
    }

    fetchDevice();
  }, [deviceId, supabase, router]);

  const handleDelete = async () => {
    if (confirmText !== device?.device_name) {
      toast.error("Device name doesn't match");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("devices").delete().eq("id", deviceId);

      if (error) throw error;

      toast.success(`${device?.device_name} removed successfully`);
      router.push("/dashboard/devices");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove device");
      setLoading(false);
    }
  };

  if (!device) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading device...</p>
        </div>
      </div>
    );
  }

  const deviceIcons = {
    desktop: "🖥️",
    laptop: "💻",
    tablet: "📱",
    mobile: "📱",
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
        <h1 className="text-3xl font-bold text-red-600">Remove Device</h1>
        <p className="text-gray-600 mt-1">This action cannot be undone</p>
      </div>

      {/* Device Info */}
      <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-red-200">
        <div className="flex items-start space-x-4">
          <div className="text-4xl">
            {deviceIcons[device.device_type as keyof typeof deviceIcons] || "🖥️"}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{device.device_name}</h3>
            <p className="text-sm text-gray-600 capitalize mb-3">{device.device_type}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Storage Allocated: </span>
                <span className="font-medium">{device.storage_allocated_mb} MB</span>
              </div>
              <div>
                <span className="text-gray-600">Last Sync: </span>
                <span className="font-medium">
                  {device.last_sync_at
                    ? new Date(device.last_sync_at).toLocaleDateString()
                    : "Never"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-red-50 rounded-xl p-6 border-2 border-red-200 space-y-4">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">⚠️</div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 mb-2">What Happens When You Remove This Device?</h3>
            <ul className="text-sm text-red-800 space-y-2">
              <li>
                <strong>• Data on this device will stop syncing</strong>
                <br />
                <span className="text-red-700">
                  Patterns and data on this device won't sync to your other devices
                </span>
              </li>
              <li>
                <strong>• Storage allocation will be freed</strong>
                <br />
                <span className="text-red-700">
                  {device.storage_allocated_mb} MB will be returned to your available storage pool
                </span>
              </li>
              <li>
                <strong>• You can re-add this device later</strong>
                <br />
                <span className="text-red-700">
                  Data will need to be re-synced from your other devices
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Confirmation Form */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type <span className="font-bold">{device.device_name}</span> to confirm deletion
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={device.device_name}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            disabled={loading}
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleDelete}
            disabled={loading || confirmText !== device.device_name}
            className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? "Removing Device..." : "Yes, Remove Device"}
          </button>
          <Link
            href="/dashboard/devices"
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium text-center"
          >
            Cancel
          </Link>
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Alternative Options</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Not using this device often? Reduce its storage allocation instead</li>
          <li>• Need to free up storage? Remove unused devices first</li>
          <li>• Changed your mind? Click Cancel to go back</li>
        </ul>
      </div>
    </div>
  );
}
