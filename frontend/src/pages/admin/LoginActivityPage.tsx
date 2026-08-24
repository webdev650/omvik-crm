import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { KeyRound, Calendar, UserCheck, ShieldCheck, Laptop, Smartphone, RefreshCw, Filter } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { getLoginActivity } from '../../api/admin';
import { getUsers } from '../../api/users';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';

function formatDateISO(d: Date) {
  return d.toISOString().split('T')[0];
}

function parseDeviceFromUserAgent(ua: string = '') {
  const uaLower = ua.toLowerCase();
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(uaLower);
  let browser = 'Unknown Browser';

  if (uaLower.includes('edg/')) browser = 'Edge';
  else if (uaLower.includes('chrome/')) browser = 'Chrome';
  else if (uaLower.includes('firefox/')) browser = 'Firefox';
  else if (uaLower.includes('safari/')) browser = 'Safari';

  let os = 'Unknown OS';
  if (uaLower.includes('windows')) os = 'Windows';
  else if (uaLower.includes('mac os')) os = 'macOS';
  else if (uaLower.includes('android')) os = 'Android';
  else if (uaLower.includes('iphone') || uaLower.includes('ipad')) os = 'iOS';
  else if (uaLower.includes('linux')) os = 'Linux';

  return {
    isMobile,
    summary: `${isMobile ? '📱 Mobile' : '💻 Desktop'} (${browser} on ${os})`,
    raw: ua
  };
}

export default function LoginActivityPage() {
  const now = new Date();
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>(formatDateISO(tenDaysAgo));
  const [toDate, setToDate] = useState<string>(formatDateISO(now));

  // Query User List for Picker
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers
  });
  const usersList = usersData?.users || [];

  // Query Login Activity Logs
  const { data: activityData, isLoading, isError, refetch } = useQuery({
    queryKey: ['loginActivity', selectedUserId, fromDate, toDate],
    queryFn: () =>
      getLoginActivity({
        userId: selectedUserId || undefined,
        from: fromDate || undefined,
        to: toDate || undefined
      })
  });

  const logs = activityData?.logs || [];

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    setFromDate(formatDateISO(start));
    setToDate(formatDateISO(end));
  };

  const applyThisYear = () => {
    const end = new Date();
    const start = new Date(end.getFullYear(), 0, 1);
    setFromDate(formatDateISO(start));
    setToDate(formatDateISO(end));
  };

  // Metrics calculation
  const uniqueUsers = new Set(logs.map((l: any) => l.user?._id)).size;
  const mobileCount = logs.filter((l: any) => parseDeviceFromUserAgent(l.userAgent).isMobile).length;
  const desktopCount = logs.length - mobileCount;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Security & Access Governance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Employee Login Activity Log
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Audit authentication sessions, client IP addresses, device user-agents, and login frequencies.
            </p>
          </div>

          <Button
            onClick={() => refetch()}
            variant="outline"
            className="h-11 px-4 border-slate-800 bg-[#0b0f19] text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl gap-2 min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Audit Log</span>
          </Button>
        </div>

        {/* Controls Card */}
        <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            {/* Employee Picker */}
            <div className="space-y-2">
              <Label htmlFor="userFilter" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                👤 Filter by Employee
              </Label>
              <select
                id="userFilter"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#0b0f19] border border-slate-800 text-slate-100 text-sm font-semibold focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Employees / Organization-wide</option>
                {usersList.map((u: any) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.employeeId || 'ID'}) — {u.role?.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Date Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="from" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  From Date
                </Label>
                <Input
                  id="from"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-[#0b0f19] border-slate-800 text-slate-100 font-mono text-xs h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  To Date
                </Label>
                <Input
                  id="to"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-[#0b0f19] border-slate-800 text-slate-100 font-mono text-xs h-11"
                />
              </div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800/80">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-2">Quick Presets:</span>
            <Button
              type="button"
              onClick={() => applyPreset(10)}
              variant="outline"
              className="h-8 text-xs border-slate-800 bg-[#0b0f19] text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors"
            >
              Last 10 Days
            </Button>
            <Button
              type="button"
              onClick={() => applyPreset(30)}
              variant="outline"
              className="h-8 text-xs border-slate-800 bg-[#0b0f19] text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors"
            >
              Last 30 Days
            </Button>
            <Button
              type="button"
              onClick={() => applyPreset(90)}
              variant="outline"
              className="h-8 text-xs border-slate-800 bg-[#0b0f19] text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors"
            >
              Last 90 Days
            </Button>
            <Button
              type="button"
              onClick={applyThisYear}
              variant="outline"
              className="h-8 text-xs border-slate-800 bg-[#0b0f19] text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors"
            >
              This Year
            </Button>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl border border-slate-800/80 bg-[#131c31] space-y-1">
            <p className="text-xs text-indigo-400 uppercase tracking-wider font-semibold">Total Login Sessions</p>
            <div className="text-2xl font-black text-white font-mono">{logs.length}</div>
            <p className="text-[11px] text-slate-400">Authenticated logins in date range</p>
          </div>

          <div className="p-4 rounded-2xl border border-slate-800/80 bg-[#131c31] space-y-1">
            <p className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">Active Unique Employees</p>
            <div className="text-2xl font-black text-emerald-400 font-mono">{uniqueUsers}</div>
            <p className="text-[11px] text-slate-400">Distinct user accounts logged in</p>
          </div>

          <div className="p-4 rounded-2xl border border-slate-800/80 bg-[#131c31] space-y-1">
            <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold">Desktop vs Mobile</p>
            <div className="text-2xl font-black text-white font-mono">
              {desktopCount} <span className="text-xs text-slate-400 font-normal">desktop / {mobileCount} mobile</span>
            </div>
            <p className="text-[11px] text-slate-400">Device category distribution</p>
          </div>
        </div>

        {/* Login Log Table */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-[#0b0f19]">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">🔑 Authentication Log ({logs.length})</h4>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-2">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading security audit logs...</p>
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-xs font-bold text-red-400">
              Failed to load login activity. Access denied or server error.
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No login activity recorded in the selected date range.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#0b0f19]">
                <TableRow className="border-b border-slate-800">
                  <TableHead className="text-slate-400 font-semibold text-xs">Date & Time</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs">Employee Name / ID</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs">Role</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs">Client IP Address</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs">Device & Browser</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => {
                  const device = parseDeviceFromUserAgent(log.userAgent);
                  const dateObj = new Date(log.loginAt || log.createdAt);

                  return (
                    <TableRow key={log._id} className="border-b border-slate-800/40 hover:bg-slate-800/40">
                      <TableCell className="font-mono text-slate-200 text-xs font-bold whitespace-nowrap">
                        {dateObj.toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}{' '}
                        <span className="text-indigo-400">
                          {dateObj.toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </TableCell>

                      <TableCell className="font-bold text-white text-xs">
                        <div>
                          <p>{log.user?.name || 'Unknown User'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            ID: {log.user?.employeeId || 'SYS'} • {log.user?.email}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
                          {log.user?.role || 'telecaller'}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-mono text-xs text-indigo-300 font-bold whitespace-nowrap">
                        {log.ipAddress || '127.0.0.1'}
                      </TableCell>

                      <TableCell className="text-xs text-slate-300">
                        <div className="flex items-center gap-1.5" title={log.userAgent}>
                          {device.isMobile ? (
                            <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : (
                            <Laptop className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          )}
                          <span>{device.summary}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  );
}
