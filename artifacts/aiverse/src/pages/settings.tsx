import { useState } from "react";
import { motion } from "framer-motion";
import {
  User, Mail, Shield, Bell, Key, Trash2,
  Save, Loader2, Eye, EyeOff, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "api", label: "API Keys", icon: Key },
];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [section, setSection] = useState("profile");
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [notifs, setNotifs] = useState({
    emailAlerts: true,
    sessionComplete: true,
    billing: true,
    marketing: false,
  });

  const handleSaveProfile = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    toast.success("Profile updated");
  };

  const handleLogout = () => {
    logout();
    setLocation("/");
    toast.success("Signed out successfully");
  };

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-52 flex-shrink-0 border-r border-border p-3 space-y-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              section === s.id
                ? "bg-white/8 text-white font-medium border-l-2 border-cyan-400"
                : "text-white/50 hover:text-white hover:bg-white/5"
            }`}
          >
            <s.icon className="w-4 h-4 flex-shrink-0" />
            {s.label}
          </button>
        ))}

        <div className="pt-4 mt-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {section === "profile" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Profile Settings</h2>
              <p className="text-sm text-white/40 mt-1">Update your personal information</p>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center text-2xl font-black text-white border border-white/10">
                {(user?.name ?? user?.email ?? "?")[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{user?.name ?? "User"}</p>
                <p className="text-sm text-white/40">{user?.email}</p>
                <Badge variant="outline" className="mt-1 text-xs border-white/10 text-white/40">
                  {user?.plan ?? "FREE"}
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-white/70 text-sm">Display Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-white/70 text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    value={user?.email ?? ""}
                    disabled
                    className="pl-10 bg-white/5 border-white/10 text-white/40"
                  />
                </div>
                <p className="text-xs text-white/30">Email cannot be changed after registration</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-white/70 text-sm">Role</Label>
                <Input
                  value={user?.role ?? "USER"}
                  disabled
                  className="bg-white/5 border-white/10 text-white/40"
                />
              </div>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </motion.div>
        )}

        {section === "security" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Security</h2>
              <p className="text-sm text-white/40 mt-1">Manage your password and account security</p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card space-y-4">
              <h3 className="text-sm font-semibold text-white">Change Password</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-sm">Current Password</Label>
                  <Input type="password" placeholder="••••••••" className="bg-white/5 border-white/10 text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-sm">New Password</Label>
                  <Input type="password" placeholder="Min. 6 characters" className="bg-white/5 border-white/10 text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-sm">Confirm New Password</Label>
                  <Input type="password" placeholder="Repeat new password" className="bg-white/5 border-white/10 text-white" />
                </div>
                <Button className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold" onClick={() => toast.info("Password update coming soon")}>
                  Update Password
                </Button>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-red-500/20 bg-red-500/5 space-y-3">
              <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
              <p className="text-sm text-white/40">Once you delete your account, there is no going back. All data will be permanently removed.</p>
              <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => toast.error("Contact support to delete your account.")}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete Account
              </Button>
            </div>
          </motion.div>
        )}

        {section === "notifications" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Notifications</h2>
              <p className="text-sm text-white/40 mt-1">Control which notifications you receive</p>
            </div>
            <div className="space-y-3">
              {[
                { key: "emailAlerts", label: "Email Alerts", desc: "Important account and security notifications" },
                { key: "sessionComplete", label: "Session Complete", desc: "When a swarm session finishes" },
                { key: "billing", label: "Billing Updates", desc: "Invoices and subscription changes" },
                { key: "marketing", label: "Product Updates", desc: "New features and announcements" },
              ].map((n) => (
                <div key={n.key} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                  <div>
                    <p className="text-sm font-medium text-white">{n.label}</p>
                    <p className="text-xs text-white/40 mt-0.5">{n.desc}</p>
                  </div>
                  <Switch
                    checked={notifs[n.key as keyof typeof notifs]}
                    onCheckedChange={(v) => setNotifs(prev => ({ ...prev, [n.key]: v }))}
                  />
                </div>
              ))}
            </div>
            <Button className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold" onClick={() => toast.success("Notification preferences saved")}>
              <Save className="w-4 h-4 mr-2" /> Save Preferences
            </Button>
          </motion.div>
        )}

        {section === "api" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">API Keys</h2>
              <p className="text-sm text-white/40 mt-1">Manage your API keys for programmatic access</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card space-y-4">
              <h3 className="text-sm font-semibold text-white">Your API Key</h3>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 font-mono text-sm text-white/50">
                  {showKey ? "aiv_" + "x".repeat(40) : "••••••••••••••••••••••••••••••••••••••••••••"}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowKey(!showKey)}
                  className="text-white/40 hover:text-white"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-white/10 text-white/60" onClick={() => toast.success("API key copied to clipboard")}>
                  Copy Key
                </Button>
                <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => toast.info("Key rotation coming soon")}>
                  Rotate Key
                </Button>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-cyan-400/5 border border-cyan-400/10">
              <p className="text-sm text-cyan-400/80 font-medium mb-1">API Documentation</p>
              <p className="text-xs text-white/40">Use your API key to authenticate requests to the AIVerse REST API. Include it as: <code className="text-cyan-400/70">Authorization: Bearer your-key</code></p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
