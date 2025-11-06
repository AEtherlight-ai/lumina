'use client';

/**
 * DESIGN DECISION: Client-side license generation with server action fallback
 * WHY: Need interactive UI for license generation + copy to clipboard
 *
 * REASONING CHAIN:
 * 1. User clicks "Add Device" → fetch /api/license/generate
 * 2. License key displayed prominently with copy button
 * 3. User downloads desktop app for their OS (Windows/Mac/Linux)
 * 4. Desktop app prompts for license on first launch
 * 5. License validated against Supabase, device activated
 * 6. User sees device in web dashboard with "Active" status
 *
 * PATTERN: Pattern-LICENSE-001 (License Generation and Activation)
 * RELATED: devices table, app/api/license/generate, desktop settings
 */

import { useEffect, useState } from 'react';
import { Download, Copy, CheckCircle, Monitor, Laptop, Tablet, Smartphone, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function DownloadPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<any[]>([]);
  const [tier, setTier] = useState('free');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  async function fetchDevices() {
    try {
      const res = await fetch('/api/devices');
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
        setTier(data.tier || 'free');
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddDevice() {
    setGenerating(true);
    try {
      const res = await fetch('/api/license/generate', {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('License generated! Copy it below.');
        await fetchDevices(); // Refresh devices list
      } else {
        toast.error(data.error || 'Failed to generate license');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Download Lumina</h1>
        <p className="text-gray-600 mt-1">
          Download the desktop app and activate your devices
        </p>
      </div>

      {/* Active Devices */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Your Devices</h2>
          <button
            onClick={handleAddDevice}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating && <Loader2 className="h-4 w-4 animate-spin" />}
            + Add Device
          </button>
        </div>

        {devices && devices.length > 0 ? (
          <div className="space-y-4">
            {devices.map((device) => (
              <DeviceCard key={device.id} device={device} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Monitor className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No devices yet</h3>
            <p className="text-gray-600 mb-6">
              Click "Add Device" to generate a license key and download the app
            </p>
          </div>
        )}
      </div>

      {/* Download Links */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Download Desktop App</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Windows */}
          <DownloadCard
            platform="Windows"
            version="1.0.0"
            size="2.8 MB"
            icon="🪟"
            downloadUrl="https://github.com/aetherlight/lumina/releases/download/v1.0.0/Lumina-Setup-1.0.0.exe"
            instructions={[
              'Download the .exe installer',
              'Run installer (may show Windows SmartScreen warning)',
              'Launch Lumina from Start Menu',
              'Enter your license key when prompted',
            ]}
          />

          {/* macOS */}
          <DownloadCard
            platform="macOS"
            version="1.0.0"
            size="3.2 MB"
            icon="🍎"
            downloadUrl="https://github.com/aetherlight/lumina/releases/download/v1.0.0/Lumina-1.0.0.dmg"
            instructions={[
              'Download the .dmg file',
              'Open .dmg and drag Lumina to Applications',
              'Right-click Lumina → Open (first time only)',
              'Enter your license key when prompted',
            ]}
          />

          {/* Linux */}
          <DownloadCard
            platform="Linux"
            version="1.0.0"
            size="2.5 MB"
            icon="🐧"
            downloadUrl="https://github.com/aetherlight/lumina/releases/download/v1.0.0/Lumina-1.0.0.AppImage"
            instructions={[
              'Download the .AppImage file',
              'Make executable: chmod +x Lumina-1.0.0.AppImage',
              'Run: ./Lumina-1.0.0.AppImage',
              'Enter your license key when prompted',
            ]}
          />
        </div>
      </div>

      {/* Installation Guide */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Activation Guide</h2>
        <ol className="space-y-3 text-gray-700">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold">
              1
            </span>
            <span>
              <strong>Generate License:</strong> Click "Add Device" above to create a new license key
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold">
              2
            </span>
            <span>
              <strong>Download App:</strong> Choose your operating system above and download
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold">
              3
            </span>
            <span>
              <strong>Install & Launch:</strong> Follow OS-specific installation instructions
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold">
              4
            </span>
            <span>
              <strong>Activate:</strong> Paste your license key when the app prompts (or go to Settings)
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold">
              5
            </span>
            <span>
              <strong>Start Using:</strong> Device will show as "Active" in the dashboard above
            </span>
          </li>
        </ol>
      </div>

      {/* Tier Limits */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Device Limits</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <TierCard
            name="Free"
            devices={3}
            current={tier === 'free'}
          />
          <TierCard
            name="Network"
            devices={5}
            current={tier === 'network'}
          />
          <TierCard
            name="Pro"
            devices={10}
            current={tier === 'pro'}
          />
          <TierCard
            name="Enterprise"
            devices="Unlimited"
            current={tier === 'enterprise'}
          />
        </div>
      </div>
    </div>
  );
}

function DeviceCard({ device }: { device: any }) {
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'desktop':
        return <Monitor className="h-5 w-5" />;
      case 'laptop':
        return <Laptop className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const statusColor = device.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600';
  const statusText = device.is_active ? 'Active' : 'Pending';

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 p-3 rounded-lg bg-blue-100 text-blue-600">
          {getDeviceIcon(device.device_type)}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{device.device_name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
              {statusText}
            </span>
            {device.activated_at && (
              <span className="text-sm text-gray-500">
                Activated {new Date(device.activated_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {device.license_key && !device.is_active && (
        <div className="flex items-center gap-2">
          <code className="px-3 py-1 bg-gray-100 rounded font-mono text-sm text-gray-700">
            {device.license_key}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(device.license_key);
              toast.success('License key copied to clipboard!');
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Copy license key"
          >
            <Copy className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      )}
    </div>
  );
}

function DownloadCard({
  platform,
  version,
  size,
  icon,
  downloadUrl,
  instructions,
}: {
  platform: string;
  version: string;
  size: string;
  icon: string;
  downloadUrl: string;
  instructions: string[];
}) {
  return (
    <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 transition-colors">
      <div className="text-center mb-4">
        <div className="text-5xl mb-3">{icon}</div>
        <h3 className="text-xl font-bold text-gray-900">{platform}</h3>
        <p className="text-sm text-gray-600">v{version} • {size}</p>
      </div>

      <a
        href={downloadUrl}
        className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors mb-4"
      >
        <Download className="h-5 w-5" />
        Download
      </a>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700">Installation:</h4>
        <ol className="space-y-1">
          {instructions.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="flex-shrink-0 text-blue-600">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function TierCard({
  name,
  devices,
  current,
}: {
  name: string;
  devices: number | string;
  current: boolean;
}) {
  return (
    <div className={`p-4 rounded-lg border-2 ${current ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-gray-900">{name}</h3>
        {current && (
          <CheckCircle className="h-5 w-5 text-blue-600" />
        )}
      </div>
      <p className="text-2xl font-black text-gray-900">{devices}</p>
      <p className="text-sm text-gray-600">devices</p>
    </div>
  );
}
