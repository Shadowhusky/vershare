import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/admin-auth";
import { readAllShares } from "@/lib/storage";

export async function GET(request: NextRequest) {
  // Auth check
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shares = await readAllShares();
  const now = new Date();

  // Total shares
  const totalShares = shares.length;

  // Total size
  let totalSize = 0;
  for (const share of shares) {
    if (share.contentSize) totalSize += share.contentSize;
    if (share.fileSize) totalSize += share.fileSize;
  }

  // Shares by type
  const sharesByType: Record<string, number> = {
    text: 0,
    markdown: 0,
    code: 0,
    file: 0,
    image: 0,
  };
  for (const share of shares) {
    if (share.type in sharesByType) {
      sharesByType[share.type]++;
    }
  }

  // Shares over time (last 30 days)
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const dayMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const share of shares) {
    const dateStr = new Date(share.createdAt).toISOString().slice(0, 10);
    if (dateStr in dayMap) {
      dayMap[dateStr]++;
    }
  }
  const sharesOverTime = Object.entries(dayMap).map(([date, count]) => ({
    date,
    count,
  }));

  // Top languages
  const langMap: Record<string, number> = {};
  for (const share of shares) {
    if (share.type === "code" && share.language) {
      langMap[share.language] = (langMap[share.language] || 0) + 1;
    }
  }
  const topLanguages = Object.entries(langMap)
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Recent shares
  const sorted = [...shares].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const recentShares = sorted.slice(0, 20).map((s) => ({
    id: s.id,
    type: s.type,
    title: s.title || s.fileName || `${s.type} share`,
    createdAt: s.createdAt,
    fileSize: s.fileSize || s.contentSize || 0,
  }));

  // Average size
  const averageSize = totalShares > 0 ? Math.round(totalSize / totalShares) : 0;

  // Today shares
  const todayStr = now.toISOString().slice(0, 10);
  const todayShares = shares.filter(
    (s) => new Date(s.createdAt).toISOString().slice(0, 10) === todayStr
  ).length;

  // This week shares
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeekShares = shares.filter(
    (s) => new Date(s.createdAt).getTime() >= weekAgo.getTime()
  ).length;

  // Storage used
  const storageUsed = shares.reduce((sum, s) => sum + (s.fileSize || 0), 0);

  // Hourly distribution
  const hourlyDist = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: 0,
  }));
  for (const share of shares) {
    const hour = new Date(share.createdAt).getHours();
    hourlyDist[hour].count++;
  }

  // Storage by type
  const storageByType: Record<string, number> = { text: 0, markdown: 0, code: 0, file: 0, image: 0 };
  for (const share of shares) {
    const size = share.fileSize || share.contentSize || 0;
    if (share.type in storageByType) storageByType[share.type] += size;
  }

  // Growth rate (this week vs last week)
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const lastWeekShares = shares.filter(
    (s) => {
      const t = new Date(s.createdAt).getTime();
      return t >= twoWeeksAgo.getTime() && t < weekAgo.getTime();
    }
  ).length;
  const growthRate = lastWeekShares > 0
    ? Math.round(((thisWeekShares - lastWeekShares) / lastWeekShares) * 100)
    : thisWeekShares > 0 ? 100 : 0;

  // Cumulative growth (30 days)
  let cumulative = shares.filter(
    (s) => new Date(s.createdAt) < thirtyDaysAgo
  ).length;
  const cumulativeGrowth = sharesOverTime.map(({ date, count }) => {
    cumulative += count;
    return { date, total: cumulative };
  });

  // MIME distribution
  const mimeMap: Record<string, number> = {};
  for (const share of shares) {
    if (share.mimeType) {
      mimeMap[share.mimeType] = (mimeMap[share.mimeType] || 0) + 1;
    }
  }
  const mimeDistribution = Object.entries(mimeMap)
    .map(([mimeType, count]) => ({ mimeType, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Size distribution histogram
  const sizeBuckets = [
    { range: "0-1KB", min: 0, max: 1024 },
    { range: "1-10KB", min: 1024, max: 10240 },
    { range: "10-100KB", min: 10240, max: 102400 },
    { range: "100KB-1MB", min: 102400, max: 1048576 },
    { range: "1-10MB", min: 1048576, max: 10485760 },
    { range: "10MB+", min: 10485760, max: Infinity },
  ];
  const sizeDistribution = sizeBuckets.map(({ range, min, max }) => ({
    range,
    count: shares.filter((s) => {
      const size = s.fileSize || s.contentSize || 0;
      return size >= min && size < max;
    }).length,
  }));

  // Weekly comparison
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const thisWeekDaily = dayNames.map((day, i) => ({ day, count: 0 }));
  const lastWeekDaily = dayNames.map((day, i) => ({ day, count: 0 }));
  for (const share of shares) {
    const d = new Date(share.createdAt);
    const t = d.getTime();
    if (t >= weekAgo.getTime()) {
      thisWeekDaily[d.getDay()].count++;
    } else if (t >= twoWeeksAgo.getTime()) {
      lastWeekDaily[d.getDay()].count++;
    }
  }

  // Expiry stats
  const permanentCount = shares.filter((s) => s.expiresAt === null || s.expiresAt === undefined).length;
  const expiredCount = shares.filter(
    (s) => s.expiresAt && new Date(s.expiresAt) < now
  ).length;

  return NextResponse.json({
    totalShares,
    totalSize,
    sharesByType,
    sharesOverTime,
    topLanguages,
    recentShares,
    averageSize,
    todayShares,
    thisWeekShares,
    storageUsed,
    hourlyDistribution: hourlyDist,
    storageByType,
    growthRate,
    cumulativeGrowth,
    mimeDistribution,
    sizeDistribution,
    weeklyComparison: { thisWeek: thisWeekDaily, lastWeek: lastWeekDaily },
    permanentCount,
    expiredCount,
  });
}
