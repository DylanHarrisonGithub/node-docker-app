import express from 'express';
import { Service, ServicePromise } from '../services';
import { time } from 'console';

// Individual IP traffic stats
interface IpTrafficStats {
  ingress: number;       // Bytes received from this IP
  egress: number;        // Bytes sent to this IP
  requestCount: number;  // Number of requests from this IP
  lastSeen: number;     // Timestamp of the last request from this IP
  requestsPerSecond: number; // Average requests per second from this IP 
  rpsRequestCount: number; // Number of requests counted towards RPS calculation from this IP
  rpsLastReset: number; // Timestamp when RPS was last reset
}

// Daily or monthly aggregate stats
interface TimeWindowTrafficStats {
  totalIngress: number;  // Total bytes received across all IPs
  totalEgress: number;   // Total bytes sent across all IPs
  ipStats: Record<string, IpTrafficStats>; // Keyed by IP
}

// The top-level structure
export interface TrafficStats {
  daily: Record<string, TimeWindowTrafficStats>;   // e.g., "2025-09-04"
  monthly: Record<string, TimeWindowTrafficStats>; // e.g., "2025-09"
}


interface AbuseDetectionThresholds {
  maxTotalIngress?: number;    // e.g., 1GB per day
  maxTotalEgress?: number;     // e.g., 1GB per day
  maxIngressPerIp?: number;    // e.g., 100MB per IP per day
  maxEgressPerIp?: number;     // e.g., 100MB per IP per day
  maxRequestsPerIp?: number;   // e.g., 1000 requests per IP per day
  maxRequestsPerSecondPerIp?: number; // e.g., 10 requests per second per IP
}

interface AbuseReport {
  ip: string;
  reasons: string[];
  stats: IpTrafficStats;
}

interface AbuseWarning {
  type: 'totalIngress' | 'totalEgress';
  value: number;
  threshold: number;
  message: string;
}

export interface AbuseDetectionReport {
  date: string;
  offenders: AbuseReport[];
  warnings: AbuseWarning[];
  hasAbuse: boolean;
}

const monitoring = {

  // This function is designed to be used as express middleware and must be registered before any body-parsing middleware
  ingressMeter: async (req: express.Request, stats: TrafficStats): ServicePromise => {

    let bytesReceived = 0;

    req.on('data', (chunk: Buffer | string) => {
      bytesReceived += Buffer.isBuffer(chunk)
        ? chunk.length
        : Buffer.byteLength(chunk);
    });

    req.on('end', () => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';

      const now = new Date();
      const dayKey = now.toISOString().split('T')[0]; // e.g., "2025-09-04"
      const monthKey = dayKey.slice(0, 7);            // e.g., "2025-09"

      // === Ensure containers exist ===
      if (!stats.daily[dayKey]) {
        stats.daily[dayKey] = {
          totalIngress: 0,
          totalEgress: 0,
          ipStats: {},
        };
      }

      if (!stats.monthly[monthKey]) {
        stats.monthly[monthKey] = {
          totalIngress: 0,
          totalEgress: 0,
          ipStats: {},
        };
      }

      // === DAILY ===
      const dailyStats = stats.daily[dayKey];
      dailyStats.totalIngress += bytesReceived;

      const dailyIpStats = dailyStats.ipStats[ip] ??= {
        ingress: 0,
        egress: 0,
        requestCount: 0,
        lastSeen: now.getTime(),
        requestsPerSecond: 0,
        rpsRequestCount: 0,
        rpsLastReset: now.getTime()
      };

      const timeDiff = now.getTime() - dailyIpStats.rpsLastReset || 1;
      if (timeDiff < 60000 && dailyIpStats.rpsRequestCount > 0) { // only count requests within the last minute

        // dailyIpStats.requestsPerSecond = (dailyIpStats.requestsPerSecond*dailyIpStats.rpsRequestCount + (1000/timeDiff)) / (dailyIpStats.rpsRequestCount+1);
        // dailyIpStats.requestsPerSecond = ((dailyIpStats.requestCount+1)*dailyIpStats.requestsPerSecond) / (dailyIpStats.requestCount + (timeDiff/1000)* dailyIpStats.requestsPerSecond);

        dailyIpStats.rpsRequestCount += 1;
        if (dailyIpStats.rpsRequestCount > 5) {
          dailyIpStats.requestsPerSecond = (dailyIpStats.rpsRequestCount * 1000) / timeDiff;
        }
      } else {
        dailyIpStats.requestsPerSecond = 0;
        dailyIpStats.rpsRequestCount = 1;
        dailyIpStats.rpsLastReset = now.getTime();
      }

      dailyIpStats.ingress += bytesReceived;
      dailyIpStats.requestCount += 1;
      dailyIpStats.lastSeen = now.getTime();

      // === MONTHLY ===
      const monthlyStats = stats.monthly[monthKey];
      monthlyStats.totalIngress += bytesReceived;

      const monthlyIpStats = monthlyStats.ipStats[ip] ??= {
        ingress: 0,
        egress: 0,
        requestCount: 0,
        lastSeen: now.getTime(),
        requestsPerSecond: 0,
        rpsRequestCount: 0,
        rpsLastReset: now.getTime()
      };

      monthlyIpStats.ingress += bytesReceived;
      monthlyIpStats.requestCount += 1;

      // retain the highest RPS seen in the month
      if (dailyIpStats.requestsPerSecond > monthlyIpStats.requestsPerSecond && dailyIpStats.rpsRequestCount > 5) {
        monthlyIpStats.requestsPerSecond = dailyIpStats.requestsPerSecond;
        monthlyIpStats.rpsRequestCount = dailyIpStats.rpsRequestCount;
      }

    });
    return {
      success: true,
      messages: ['SERVER - SERVICES - MONITORING - INGRESS METER - Ingress meter attached successfully']
    };
  },

  // This function is designed to be used as express middleware, but this one can be registered after body-parsing middleware if desired
  egressMeter: async (req: express.Request, res: express.Response, stats: TrafficStats): ServicePromise => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    let bytesSent = 0;

    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    // Wrap res.write()
    res.write = (chunk: any, encoding?: any, callback?: any) => {
      if (chunk) {
        bytesSent += Buffer.isBuffer(chunk)
          ? chunk.length
          : Buffer.byteLength(chunk, encoding);
      }
      return originalWrite(chunk, encoding, callback);
    };

    // Wrap res.end()
    res.end = (chunk?: any, encoding?: any, callback?: any) => {
      if (chunk) {
        bytesSent += Buffer.isBuffer(chunk)
          ? chunk.length
          : Buffer.byteLength(chunk, encoding);
      }

      const now = new Date();
      const dayKey = now.toISOString().split('T')[0]; // e.g., "2025-09-04"
      const monthKey = dayKey.slice(0, 7);            // e.g., "2025-09"

      // === Ensure containers exist ===
      if (!stats.daily[dayKey]) {
        stats.daily[dayKey] = {
          totalIngress: 0,
          totalEgress: 0,
          ipStats: {},
        };
      }

      if (!stats.monthly[monthKey]) {
        stats.monthly[monthKey] = {
          totalIngress: 0,
          totalEgress: 0,
          ipStats: {},
        };
      }

      // === DAILY ===
      const dailyStats = stats.daily[dayKey];
      dailyStats.totalEgress += bytesSent;

      const dailyIpStats = dailyStats.ipStats[ip] ??= {
        ingress: 0,
        egress: 0,
        requestCount: 0,
        lastSeen: 0,
        requestsPerSecond: 0,
        rpsRequestCount: 0,
        rpsLastReset: now.getTime()
      };

      dailyIpStats.egress += bytesSent;
      dailyIpStats.requestCount += 1;
      dailyIpStats.lastSeen = Date.now();

      // === MONTHLY ===
      const monthlyStats = stats.monthly[monthKey];
      monthlyStats.totalEgress += bytesSent;

      const monthlyIpStats = monthlyStats.ipStats[ip] ??= {
        ingress: 0,
        egress: 0,
        requestCount: 0,
        lastSeen: 0,
        requestsPerSecond: 0,
        rpsRequestCount: 0,
        rpsLastReset: now.getTime()
      };

      monthlyIpStats.egress += bytesSent;
      monthlyIpStats.requestCount += 1;

      return originalEnd(chunk, encoding, callback);
    };
    return {
      success: true,
      messages: ['SERVER - SERVICES - MONITORING - EGRESS METER - Egress meter attached successfully']
    };
  },

  // Analyze traffic stats against defined thresholds and return an abuse report
  monitorTrafficStats: async (stats: TrafficStats, thresholds: AbuseDetectionThresholds): ServicePromise<AbuseDetectionReport> => {

    const offenders: AbuseReport[] = [];
    const warnings: AbuseWarning[] = [];

    // Use latest date
    const dates = Object.keys(stats.daily).sort();
    if (dates.length === 0) {
      return new Promise((resolve) => resolve({
        success: true,
        messages: ['No traffic stats available for analysis'],
        body: {
          date: '',
          offenders,
          warnings,
          hasAbuse: false,
        }
      }));
    }

    const latestDate = dates[dates.length - 1];
    const dailyStats = stats.daily[latestDate];

    // Global warnings
    if (
      thresholds.maxTotalIngress !== undefined &&
      dailyStats.totalIngress > thresholds.maxTotalIngress
    ) {
      warnings.push({
        type: 'totalIngress',
        value: dailyStats.totalIngress,
        threshold: thresholds.maxTotalIngress,
        message: `Total ingress exceeded threshold (${dailyStats.totalIngress} > ${thresholds.maxTotalIngress})`,
      });
    }

    if (
      thresholds.maxTotalEgress !== undefined &&
      dailyStats.totalEgress > thresholds.maxTotalEgress
    ) {
      warnings.push({
        type: 'totalEgress',
        value: dailyStats.totalEgress,
        threshold: thresholds.maxTotalEgress,
        message: `Total egress exceeded threshold (${dailyStats.totalEgress} > ${thresholds.maxTotalEgress})`,
      });
    }

    // Per-IP abuse
    for (const [ip, ipStats] of Object.entries(dailyStats.ipStats)) {
      const reasons: string[] = [];

      if (
        thresholds.maxIngressPerIp !== undefined &&
        ipStats.ingress > thresholds.maxIngressPerIp
      ) {
        reasons.push(`Ingress exceeded (${ipStats.ingress} > ${thresholds.maxIngressPerIp})`);
      }

      if (
        thresholds.maxEgressPerIp !== undefined &&
        ipStats.egress > thresholds.maxEgressPerIp
      ) {
        reasons.push(`Egress exceeded (${ipStats.egress} > ${thresholds.maxEgressPerIp})`);
      }

      if (
        thresholds.maxRequestsPerIp !== undefined &&
        ipStats.requestCount > thresholds.maxRequestsPerIp
      ) {
        reasons.push(`Request count exceeded (${ipStats.requestCount} > ${thresholds.maxRequestsPerIp})`);
      }

      if (
        thresholds.maxRequestsPerSecondPerIp !== undefined &&
        ipStats.requestsPerSecond > thresholds.maxRequestsPerSecondPerIp
      ) {
        reasons.push(`Requests per second exceeded (${ipStats.requestsPerSecond.toFixed(2)} > ${thresholds.maxRequestsPerSecondPerIp})`);
      }

      if (reasons.length > 0) {
        offenders.push({
          ip,
          reasons,
          stats: ipStats,
        });
      }
    }

    return new Promise((resolve) => resolve({
      success: !(offenders.length > 0 || warnings.length > 0),
      messages: ['SERVER - SERVICES - MONITORING - MONITORTRAFFICSTATS - Traffic stats analyzed successfully'],
      body: {
        date: latestDate,
        offenders,
        warnings,
        hasAbuse: offenders.length > 0 || warnings.length > 0,
      }
    }));

  },

  quickCheck: async (ip: string, stats: TrafficStats, thresholds: AbuseDetectionThresholds): ServicePromise<AbuseReport | null> => {

    // use today's date
    const today = new Date().toISOString().split('T')[0];
    const dailyStats = stats.daily[today];
    if (!dailyStats) {
      return new Promise((resolve) => resolve({
        success: true,
        messages: ['No daily stats for today'],
        body: null
      }));
    }
    const ipStats = dailyStats.ipStats[ip];
    if (!ipStats) {
      return new Promise((resolve) => resolve({
        success: true,
        messages: ['No stats for this IP today'],
        body: null
      }));
    }
    const reasons: string[] = [];
    if (
      thresholds.maxIngressPerIp !== undefined &&
      ipStats.ingress > thresholds.maxIngressPerIp
    ) {
      reasons.push(`Ingress exceeded (${ipStats.ingress} > ${thresholds.maxIngressPerIp})`);
    }
    if (
      thresholds.maxEgressPerIp !== undefined &&
      ipStats.egress > thresholds.maxEgressPerIp
    ) {
      reasons.push(`Egress exceeded (${ipStats.egress} > ${thresholds.maxEgressPerIp})`);
    }
    if (
      thresholds.maxRequestsPerIp !== undefined &&
      ipStats.requestCount > thresholds.maxRequestsPerIp
    ) {
      reasons.push(`Request count exceeded (${ipStats.requestCount} > ${thresholds.maxRequestsPerIp})`);
    }
    if (
      thresholds.maxRequestsPerSecondPerIp !== undefined &&
      ipStats.requestsPerSecond > thresholds.maxRequestsPerSecondPerIp
    ) {
      reasons.push(`Requests per second exceeded (${ipStats.requestsPerSecond.toFixed(2)} > ${thresholds.maxRequestsPerSecondPerIp})`);
    }
    if (reasons.length > 0) {
      return new Promise((resolve) => resolve({
        success: false,
        messages: ['Abuse detected for this IP'],
        body: {
          ip,
          reasons,
          stats: ipStats,
        }
      }));
    } else {
      return new Promise((resolve) => resolve({
        success: true,
        messages: ['No abuse detected for this IP'],
        body: null
      }));
    }
  },

  pruneStats: async (stats: TrafficStats, daysToKeep: number, monthsToKeep: number, ipsToKeep?: number): ServicePromise => {
    const now = new Date();

    // Prune daily stats
    const dayKeys = Object.keys(stats.daily);
    for (const dayKey of dayKeys) {
      const dayDate = new Date(dayKey);
      const ageInDays = (now.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays > daysToKeep) {
        delete stats.daily[dayKey];
      } else if (ipsToKeep !== undefined) {
        // Prune IPs within this day's stats
        const ipStats = stats.daily[dayKey].ipStats;
        const ipEntries = Object.entries(ipStats);
        if (ipEntries.length > ipsToKeep) {
          // Sort IPs by ingress + egress
          ipEntries.sort((a, b) => {
            const aTotal = a[1].ingress + a[1].egress;
            const bTotal = b[1].ingress + b[1].egress;
            return bTotal - aTotal; // Descending
          });
          const ipsToRemove = ipEntries.slice(ipsToKeep);
          for (const [ip] of ipsToRemove) {
            delete ipStats[ip];
          }
        }
      }
    }

    // Prune monthly stats
    const monthKeys = Object.keys(stats.monthly);
    for (const monthKey of monthKeys) {
      const [year, month] = monthKey.split('-').map(Number);
      const monthDate = new Date(year, month - 1); // Months are 0-based
      const ageInMonths = (now.getFullYear() - monthDate.getFullYear()) * 12 + (now.getMonth() - monthDate.getMonth());
      if (ageInMonths > monthsToKeep) {
        delete stats.monthly[monthKey];
      } else if (ipsToKeep !== undefined) {
        // Prune IPs within this month's stats
        const ipStats = stats.monthly[monthKey].ipStats;
        const ipEntries = Object.entries(ipStats);
        if (ipEntries.length > ipsToKeep) {
          // Sort IPs by ingress + egress
          ipEntries.sort((a, b) => {
            const aTotal = a[1].ingress + a[1].egress;
            const bTotal = b[1].ingress + b[1].egress;
            return bTotal - aTotal; // Descending
          });
          const ipsToRemove = ipEntries.slice(ipsToKeep);
          for (const [ip] of ipsToRemove) {
            delete ipStats[ip];
          }
        }
      }
    }
    return {
      success: true,
      messages: ['SERVER - SERVICES - MONITORING - PRUNESTATS - Traffic stats pruned successfully']
    };
  },

  // Middleware to quickly check for abuse from a specific IP on each request
  // Must be registered before body-parsing middleware to catch large payloads
  useMonitoring: async (
    req: express.Request, 
    res: express.Response, 
    stats: TrafficStats, 
    thresholds: AbuseDetectionThresholds,
    fullCheckIntervalMs: number = 60000,
    pruningIntervalMs: number = 3600000,
    pruningConfig: { daysToKeep: number, monthsToKeep: number, ipsToKeep?: number } = { daysToKeep: 7, monthsToKeep: 3, ipsToKeep: 1000 },
    intervalObject: { lastPruneTime: number, lastFullCheckTime: number }
  ): ServicePromise<AbuseReport | AbuseDetectionReport | null> => {

    await monitoring.ingressMeter(req, stats);
    await monitoring.egressMeter(req, res, stats);

    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    const quickCheckRes = await monitoring.quickCheck(ip, stats, thresholds);

    if (!quickCheckRes.success && quickCheckRes.body) {
      // Immediate abuse detected
      return new Promise((resolve) => resolve({
        success: false,
        messages: ['Immediate abuse detected for this IP'],
        body: quickCheckRes.body
      }));
    }

    const now = Date.now();
    if ((now - intervalObject.lastFullCheckTime) > fullCheckIntervalMs) {
      intervalObject.lastFullCheckTime = now;
      const fullCheckRes = await monitoring.monitorTrafficStats(stats, thresholds);
      if (!fullCheckRes.success && fullCheckRes.body) {
        // return abuse report for all offenders, even if this IP is not one of them
        return new Promise((resolve) => resolve({
          success: false,
          messages: ['Periodic full traffic analysis detected abuse'],
          body: fullCheckRes.body
        }));
      }
    }
    if ((now - intervalObject.lastPruneTime) > pruningIntervalMs) {
      intervalObject.lastPruneTime = now;
      await monitoring.pruneStats(stats, pruningConfig.daysToKeep, pruningConfig.monthsToKeep, pruningConfig.ipsToKeep);
    }
    return {
      success: true,
      messages: ['No abuse detected after full analysis'],
      body: null
    };

  }

} satisfies Service;

export default monitoring;
