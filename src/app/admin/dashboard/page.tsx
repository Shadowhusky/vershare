"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Database,
  FileText,
  Clock,
  TrendingUp,
  Loader2,
  LogOut,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
} from "lucide-react";
import StatCard from "@/components/admin/StatCard";
import ShareTypePieChart from "@/components/admin/ShareTypePieChart";
import SharesOverTimeChart from "@/components/admin/SharesOverTimeChart";
import HourlyHeatmap from "@/components/admin/HourlyHeatmap";
import TopLanguagesChart from "@/components/admin/TopLanguagesChart";
import SharesTable from "@/components/admin/SharesTable";
import StorageGauge from "@/components/admin/StorageGauge";
import StorageByTypeChart from "@/components/admin/StorageByTypeChart";
import SizeDistributionChart from "@/components/admin/SizeDistributionChart";
import WeeklyComparisonChart from "@/components/admin/WeeklyComparisonChart";
import CumulativeGrowthChart from "@/components/admin/CumulativeGrowthChart";
import MimeDistributionChart from "@/components/admin/MimeDistributionChart";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { formatFileSize } from "@/lib/constants";

interface Stats {
  totalShares: number;
  totalSize: number;
  averageSize: number;
  todayShares: number;
  thisWeekShares: number;
  sharesByType: Record<string, number>;
  sharesOverTime: Array<{ date: string; count: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
  topLanguages: Array<{ language: string; count: number }>;
  recentShares: Array<{ id: string; type: string; title: string; createdAt: string; fileSize: number }>;
  storageUsed: number;
  storageByType: Record<string, number>;
  growthRate: number;
  cumulativeGrowth: Array<{ date: string; total: number }>;
  mimeDistribution: Array<{ mimeType: string; count: number }>;
  sizeDistribution: Array<{ range: string; count: number }>;
  weeklyComparison: {
    thisWeek: Array<{ day: string; count: number }>;
    lastWeek: Array<{ day: string; count: number }>;
  };
  permanentCount: number;
  expiredCount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCleanup, setShowCleanup] = useState(false);
  const router = useRouter();

  const [statsKey, setStatsKey] = useState(0);
  const refreshStats = () => setStatsKey((k) => k + 1);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => {
        if (res.status === 401) { router.push("/admin"); return null; }
        if (!res.ok) throw new Error("Failed to load stats");
        return res.json() as Promise<Stats>;
      })
      .then((data) => { if (data) setStats(data); })
      .catch((err) => setError(err.message));
  }, [router, statsKey]);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
  };

  const handleCleanup = async () => {
    await fetch("/api/admin/cleanup", { method: "POST" });
    setShowCleanup(false);
    refreshStats();
  };

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-pixel-pink font-[family-name:var(--font-pixel-stack)] text-xs">! {error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="py-12 flex items-center justify-center gap-3">
        <Loader2 size={16} className="text-pixel-green animate-spin" />
        <span className="text-pixel-green font-[family-name:var(--font-pixel-stack)] text-xs">LOADING STATS...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-sm text-glow">
          DASHBOARD
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCleanup(true)}
            className="flex items-center gap-2 px-3 py-2 border border-pixel-amber/30 text-pixel-amber text-xs font-[family-name:var(--font-pixel-stack)] hover:bg-pixel-amber/10 transition-all"
          >
            <Trash2 size={12} />
            CLEANUP EXPIRED
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 border border-pixel-pink/30 text-pixel-pink text-xs font-[family-name:var(--font-pixel-stack)] hover:bg-pixel-pink/10 transition-all"
          >
            <LogOut size={12} />
            LOGOUT
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="TOTAL" value={stats.totalShares} icon={<Database size={20} />} color="green" />
        <StatCard label="TODAY" value={stats.todayShares} icon={<TrendingUp size={20} />} color="cyan" />
        <StatCard
          label="GROWTH"
          value={`${stats.growthRate >= 0 ? "+" : ""}${stats.growthRate}%`}
          icon={stats.growthRate >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
          color={stats.growthRate >= 0 ? "green" : "pink"}
        />
        <StatCard label="PERMANENT" value={stats.permanentCount} icon={<Lock size={20} />} color="purple" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="THIS WEEK" value={stats.thisWeekShares} icon={<Clock size={20} />} color="amber" />
        <StatCard label="AVG SIZE" value={formatFileSize(stats.averageSize)} icon={<FileText size={20} />} color="cyan" />
        <StatCard label="TOTAL SIZE" value={formatFileSize(stats.totalSize)} icon={<Database size={20} />} color="pink" />
        <StatCard label="EXPIRED" value={stats.expiredCount} icon={<Clock size={20} />} color="amber" />
      </div>

      {/* Storage */}
      <StorageGauge usedBytes={stats.storageUsed} />

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="pixel-border p-4 bg-pixel-dark/80">
          <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-xs mb-4">SHARES OVER TIME</h3>
          <SharesOverTimeChart data={stats.sharesOverTime} />
        </div>
        <div className="pixel-border p-4 bg-pixel-dark/80">
          <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-xs mb-4">CUMULATIVE GROWTH</h3>
          <CumulativeGrowthChart data={stats.cumulativeGrowth} />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="pixel-border p-4 bg-pixel-dark/80">
          <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-xs mb-4">BY TYPE</h3>
          <ShareTypePieChart data={stats.sharesByType} />
        </div>
        <div className="pixel-border p-4 bg-pixel-dark/80">
          <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-xs mb-4">STORAGE BY TYPE</h3>
          <StorageByTypeChart data={stats.storageByType} />
        </div>
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="pixel-border p-4 bg-pixel-dark/80">
          <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-xs mb-4">WEEKLY COMPARISON</h3>
          <WeeklyComparisonChart thisWeek={stats.weeklyComparison.thisWeek} lastWeek={stats.weeklyComparison.lastWeek} />
        </div>
        <div className="pixel-border p-4 bg-pixel-dark/80">
          <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-xs mb-4">SIZE DISTRIBUTION</h3>
          <SizeDistributionChart data={stats.sizeDistribution} />
        </div>
      </div>

      {/* Charts row 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="pixel-border p-4 bg-pixel-dark/80">
          <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-xs mb-4">HOURLY ACTIVITY</h3>
          <HourlyHeatmap data={stats.hourlyDistribution} />
        </div>
        <div className="pixel-border p-4 bg-pixel-dark/80">
          <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-xs mb-4">TOP LANGUAGES</h3>
          <TopLanguagesChart data={stats.topLanguages} />
        </div>
      </div>

      {/* MIME distribution */}
      <div className="pixel-border p-4 bg-pixel-dark/80">
        <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-xs mb-4">MIME TYPES</h3>
        <MimeDistributionChart data={stats.mimeDistribution} />
      </div>

      {/* All shares */}
      <div className="pixel-border p-4 bg-pixel-dark/80">
        <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-xs mb-4">ALL SHARES</h3>
        <SharesTable onDataChange={refreshStats} />
      </div>

      <ConfirmDialog
        open={showCleanup}
        title="CLEANUP EXPIRED"
        message="Delete all expired shares and their files? This frees up storage."
        confirmLabel="CLEANUP"
        confirmColor="green"
        onConfirm={handleCleanup}
        onCancel={() => setShowCleanup(false)}
      />
    </div>
  );
}
