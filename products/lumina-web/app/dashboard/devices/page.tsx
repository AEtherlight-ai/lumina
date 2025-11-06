/**
 * DESIGN DECISION: Device Management Dashboard
 * WHY: Users need visibility into all connected devices and storage allocation
 *
 * REASONING CHAIN:
 * 1. Multi-device support requires clear device inventory
 * 2. Storage allocation per device enables user control
 * 3. Last sync timestamp builds trust (users see system is working)
 * 4. Device type icons improve UX (quick visual identification)
 * 5. Add/remove flows with confirmation prevent accidental data loss
 *
 * PATTERN: Pattern-DEVICE-001 (Multi-device management)
 * RELATED: Dashboard overview, storage quota system
 * FUTURE: Device activity logs, remote wipe, storage reallocation
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

// Device type icons mapping
const deviceIcons = {
  desktop: "🖥️",
  laptop: "💻",
  tablet: "📱",
  mobile: "📱",
};

interface Device {
  id: string;
  device_name: string;
  device_type: "desktop" | "laptop" | "tablet" | "mobile";
  storage_allocated_mb: number;
  last_sync_at: string | null;
  created_at: string;
}

export default async function DevicesPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch user profile for storage context
  const { data: profile } = await supabase
    .from("profiles")
    .select("storage_limit_mb, storage_bonus_mb")
    .eq("id", user.id)
    .single();

  const totalStorage = (profile?.storage_limit_mb || 0) + (profile?.storage_bonus_mb || 0);

  // Fetch all user devices
  const { data: devices, error } = await supabase
    .from("devices")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching devices:", error);
  }

  const deviceList = (devices || []) as Device[];
  const totalAllocated = deviceList.reduce((sum, device) => sum + device.storage_allocated_mb, 0);

  // Helper function to format last sync time
  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Devices</h1>
          <p className="text-gray-600 mt-1">
            Manage your connected devices and storage allocation
          </p>
        </div>
        <Link
          href="/dashboard/devices/add"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Device
        </Link>
      </div>

      {/* Storage Overview */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Storage Allocation</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Available</span>
            <span className="font-medium">{totalStorage} MB</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Allocated to Devices</span>
            <span className="font-medium">{totalAllocated} MB</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Remaining</span>
            <span className="font-medium text-green-600">
              {totalStorage - totalAllocated} MB
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{
                width: `${totalStorage > 0 ? (totalAllocated / totalStorage) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Device List */}
      {deviceList.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-200 text-center">
          <div className="text-6xl mb-4">🖥️</div>
          <h3 className="text-xl font-semibold mb-2">No Devices Yet</h3>
          <p className="text-gray-600 mb-6">
            Add your first device to start syncing patterns and data
          </p>
          <Link
            href="/dashboard/devices/add"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Device
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {deviceList.map((device) => (
            <div
              key={device.id}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                {/* Device Info */}
                <div className="flex items-start space-x-4">
                  <div className="text-4xl">
                    {deviceIcons[device.device_type] || "🖥️"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{device.device_name}</h3>
                    <p className="text-sm text-gray-600 capitalize">
                      {device.device_type}
                    </p>
                    <div className="flex items-center space-x-4 mt-3 text-sm">
                      <div>
                        <span className="text-gray-600">Storage: </span>
                        <span className="font-medium">{device.storage_allocated_mb} MB</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Last Sync: </span>
                        <span className="font-medium">
                          {formatLastSync(device.last_sync_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Link
                    href={`/dashboard/devices/${device.id}/edit`}
                    className="text-blue-600 hover:text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/dashboard/devices/${device.id}/delete`}
                    className="text-red-600 hover:text-red-700 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">
          💡 Storage Allocation Tips
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Allocate more storage to devices you use most frequently</li>
          <li>• Desktop devices typically sync faster than mobile</li>
          <li>• You can adjust allocation anytime without losing data</li>
          <li>• Devices sync automatically when online</li>
        </ul>
      </div>
    </div>
  );
}
