import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.ts';
import db from '../../src/db/index.ts';
import { subDays, format, addDays } from 'date-fns';

export const getDashboard = (req: AuthRequest, res: Response): void => {
  const user = req.user;
  if (user.role === 'superadmin') {
    res.json({
      isSuperAdmin: true,
      pendingRequests: (db.prepare('SELECT count(*) as c FROM tenants').get() as any).c,
      missingDocs:     (db.prepare("SELECT count(*) as c FROM users WHERE role != 'superadmin'").get() as any).c,
      uploadedDocs:    (db.prepare('SELECT count(*) as c FROM documents').get() as any).c,
      chartData: [], expiringThisWeek: 0, overdueRequests: 0,
    });
    return;
  }
  const tid = user.tenant_id;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const in7days  = addDays(today, 7).toISOString().split('T')[0];

  const pendingRequests  = (db.prepare("SELECT count(*) as c FROM requests WHERE tenant_id = ? AND status = 'pending'").get(tid) as any).c;
  const uploadedDocs     = (db.prepare('SELECT count(*) as c FROM documents WHERE tenant_id = ?').get(tid) as any).c;
  const expiringThisWeek = (db.prepare("SELECT count(*) as c FROM requests WHERE tenant_id=? AND status='pending' AND deadline IS NOT NULL AND deadline>=? AND deadline<=?").get(tid, todayStr, in7days) as any).c;
  const overdueRequests  = (db.prepare("SELECT count(*) as c FROM requests WHERE tenant_id=? AND status='pending' AND deadline IS NOT NULL AND deadline<?").get(tid, todayStr) as any).c;

  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const day = subDays(today, i);
    const count = (db.prepare("SELECT count(*) as c FROM requests WHERE tenant_id=? AND date(created_at)=?").get(tid, format(day, 'yyyy-MM-dd')) as any).c;
    chartData.push({ date: format(day, 'MMM d'), count });
  }
  res.json({ pendingRequests, uploadedDocs, missingDocs: pendingRequests, expiringThisWeek, overdueRequests, chartData });
};
