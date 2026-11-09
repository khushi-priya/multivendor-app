// Integration tests: transactional shop+owner creation, tenant isolation, role checks.
// Requires a MySQL test database with migrations applied:
//   NODE_ENV=test npm run migrate   (uses DB_NAME_TEST)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');

process.env.NODE_ENV = 'test';
const { sequelize, User, Shop, ShopCategory, Wholesaler } = require('../src/models');
const { createApp } = require('../src/app');

const H = { 'X-Requested-With': 'XMLHttpRequest' };
const run = Date.now().toString(36);
const adminEmail = `admin-${run}@test.local`;
const customerEmail = `customer-${run}@test.local`;
const ownerA = `owner-a-${run}@test.local`;
const ownerB = `owner-b-${run}@test.local`;
const PASSWORD = 'Passw0rd-test';

let app;
let admin;
let category;
const state = {};

async function login(email, password = PASSWORD) {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/login').set(H).send({ email, password });
  return { agent, res };
}

before(async () => {
  app = createApp();
  category = (await ShopCategory.findOrCreate({ where: { name: `Test-${run}` } }))[0];
  await User.create({
    name: 'Test Admin',
    email: adminEmail,
    role: 'super_admin',
    status: 'active',
    passwordHash: await bcrypt.hash(PASSWORD, 4),
  });
  await User.create({
    name: 'Test Customer',
    email: customerEmail,
    role: 'customer',
    status: 'active',
    passwordHash: await bcrypt.hash(PASSWORD, 4),
  });
  admin = (await login(adminEmail)).agent;
});

after(async () => {
  await new Promise((resolve) => app.locals.sessionStore.close(resolve));
  await sequelize.close();
});

const shopPayload = (name, email) => ({
  shop: { name, categoryId: category.id, address: '12 Market Road, Test City' },
  owner: { name: `Owner ${name}`, email, phone: '9876543210', initialPassword: PASSWORD },
});

test('create shop + owner in one call; owner lands in own shop', async () => {
  const a = await admin.post('/api/v1/admin/shops').set(H).send(shopPayload(`Shop A ${run}`, ownerA));
  assert.equal(a.status, 201);
  assert.equal(a.body.shop.owner.email, ownerA);
  assert.equal(JSON.stringify(a.body).includes('passwordHash'), false);
  state.shopA = a.body.shop.id;

  const b = await admin.post('/api/v1/admin/shops').set(H).send(shopPayload(`Shop B ${run}`, ownerB));
  assert.equal(b.status, 201);
  state.shopB = b.body.shop.id;

  const { res } = await login(ownerA);
  assert.equal(res.status, 200);
  assert.equal(res.body.user.shop.id, state.shopA);
  assert.equal(res.body.user.shop.role, 'shop_owner');

  const ownerAgent = request.agent(app);
  const ownerLogin = await ownerAgent.post('/api/v1/auth/shop-owner/login').set(H).send({ email: ownerA, password: PASSWORD });
  assert.equal(ownerLogin.status, 200);
  assert.equal(ownerLogin.body.user.shop.id, state.shopA);
  assert.equal(ownerLogin.body.user.shop.role, 'shop_owner');
  assert.equal(JSON.stringify(ownerLogin.body).includes('passwordHash'), false);
  assert.equal((await ownerAgent.get('/api/v1/shop/owner-dashboard')).body.shop.name, a.body.shop.name);
  assert.equal((await ownerAgent.get('/api/v1/admin/shops')).status, 403);
  assert.equal((await request(app).get('/api/v1/shop/owner-dashboard')).status, 401);

  assert.equal((await request(app).post('/api/v1/auth/shop-owner/login').set(H).send({ email: ownerA, password: 'incorrect' })).status, 401);
  assert.equal((await request(app).post('/api/v1/auth/shop-owner/login').set(H).send({ email: adminEmail, password: PASSWORD })).status, 403);
});

test('admin and customer login endpoints create role-scoped persistent sessions', async () => {
  const adminAgent = request.agent(app);
  const adminLogin = await adminAgent
    .post('/api/v1/auth/admin/login')
    .set(H)
    .send({ email: adminEmail, password: PASSWORD });
  assert.equal(adminLogin.status, 200);
  assert.equal(adminLogin.body.user.role, 'super_admin');
  assert.equal((await adminAgent.get('/api/v1/auth/me')).body.user.role, 'super_admin');
  assert.equal((await adminAgent.get('/api/v1/admin/stats')).status, 200);

  assert.equal(
    (await request(app).post('/api/v1/auth/admin/login').set(H).send({
      email: adminEmail,
      password: 'incorrect',
    })).status,
    401,
  );
  assert.equal(
    (await request(app).post('/api/v1/auth/admin/login').set(H).send({
      email: adminEmail,
    })).status,
    422,
  );

  const customerAgent = request.agent(app);
  const customerLogin = await customerAgent
    .post('/api/v1/auth/customer/login')
    .set(H)
    .send({ email: customerEmail, password: PASSWORD });
  assert.equal(customerLogin.status, 200);
  assert.equal(customerLogin.body.user.role, 'customer');
  assert.equal((await customerAgent.get('/api/v1/auth/me')).body.user.role, 'customer');
  assert.equal((await customerAgent.get('/api/v1/admin/stats')).status, 403);
  assert.equal(
    (await request(app).post('/api/v1/auth/admin/login').set(H).send({
      email: customerEmail,
      password: PASSWORD,
    })).status,
    403,
  );

  assert.equal((await customerAgent.post('/api/v1/auth/logout').set(H)).status, 200);
  assert.equal((await customerAgent.get('/api/v1/auth/me')).status, 401);
});

test('owner login stays bound to its assigned shop; inactive and unassigned accounts are rejected', async () => {
  const ownerBLogin = await request.agent(app).post('/api/v1/auth/shop-owner/login').set(H).send({ email: ownerB, password: PASSWORD });
  assert.equal(ownerBLogin.status, 200);
  assert.equal(ownerBLogin.body.user.shop.id, state.shopB);

  const ownerUser = await User.findOne({ where: { email: ownerA } });
  await ownerUser.update({ status: 'disabled' });
  assert.equal((await request(app).post('/api/v1/auth/shop-owner/login').set(H).send({ email: ownerA, password: PASSWORD })).status, 401);
  await ownerUser.update({ status: 'active' });

  const unassignedEmail = `unassigned-${run}@test.local`;
  await User.create({
    name: 'Unassigned Shop Account',
    email: unassignedEmail,
    role: 'shop_user',
    status: 'active',
    passwordHash: await bcrypt.hash(PASSWORD, 4),
  });
  assert.equal((await request(app).post('/api/v1/auth/shop-owner/login').set(H).send({ email: unassignedEmail, password: PASSWORD })).status, 403);
});

test('employee attendance, salary history and finalized payroll are shop-scoped and paid explicitly', async () => {
  const owner = (await login(ownerA)).agent;
  const otherOwner = (await login(ownerB)).agent;
  const created = await owner.post('/api/v1/shop/employees').set(H).send({
    name: 'Payroll Employee', email: `payroll-employee-${run}@test.local`, phone: '9876543210', password: PASSWORD,
    role: 'sales_associate', salaryType: 'monthly', baseSalary: '2800.00', designation: 'Cashier', employeeCode: 'EMP-001', joinedDate: '2026-02-01',
  });
  assert.equal(created.status, 201);
  const userId = created.body.employee.userId;
  const membershipId = created.body.employee.membershipId;
  assert.ok(membershipId);

  const list = await owner.get('/api/v1/shop/employees?q=EMP-001&page=1&pageSize=10');
  assert.equal(list.body.total, 1);
  assert.equal(list.body.items[0].profile.employeeCode, 'EMP-001');
  assert.equal((await owner.patch(`/api/v1/shop/employees/${membershipId}`).set(H).send({ designation: 'Senior Cashier' })).status, 200);
  assert.equal((await otherOwner.get('/api/v1/shop/employees')).body.items.some((e) => e.userId === userId), false);
  assert.equal((await otherOwner.patch(`/api/v1/shop/employees/${membershipId}`).set(H).send({ designation: 'Intruder' })).status, 404);

  const attendancePayload = { userId, date: '2026-02-01', status: 'absent', workingHours: 0 };
  assert.equal((await owner.post('/api/v1/shop/attendance').set(H).send({ ...attendancePayload, date: '2026-02-30' })).status, 422);
  assert.equal((await owner.post('/api/v1/shop/attendance').set(H).send(attendancePayload)).status, 201);
  assert.equal((await owner.post('/api/v1/shop/attendance').set(H).send(attendancePayload)).status, 409);
  const halfDay = await owner.post('/api/v1/shop/attendance').set(H).send({ userId, date: '2026-02-02', status: 'half_day', checkIn: '09:00', checkOut: '13:00', workingHours: 4 });
  assert.equal(halfDay.status, 201);
  assert.equal((await owner.patch(`/api/v1/shop/attendance/${halfDay.body.record.id}`).set(H).send({ notes: 'Corrected record' })).status, 200);
  assert.equal((await otherOwner.get(`/api/v1/shop/attendance?userId=${userId}`)).body.items.length, 0);

  const salary = await owner.post('/api/v1/shop/salary').set(H).send({ userId, salaryType: 'monthly', baseSalary: '2800.00', allowances: '100.00', deductions: '20.00', effectiveDate: '2026-02-01' });
  assert.equal(salary.status, 201);
  assert.equal((await owner.post('/api/v1/shop/salary').set(H).send({ userId, salaryType: 'monthly', baseSalary: '-1', allowances: 0, deductions: 0, effectiveDate: '2026-02-01' })).status, 422);
  assert.equal((await otherOwner.post('/api/v1/shop/salary').set(H).send({ userId, salaryType: 'monthly', baseSalary: 1, allowances: 0, deductions: 0, effectiveDate: '2026-02-01' })).status, 404);
  const payroll = await owner.post('/api/v1/shop/payroll').set(H).send({ payPeriod: '2026-02' });
  assert.equal(payroll.status, 201);
  assert.equal(payroll.body.run.status, 'draft');
  const line = payroll.body.run.items.find((item) => item.userId === userId);
  assert.equal(Number(line.attendanceDeduction), 150);
  assert.equal(Number(line.grossAmount), 2750);
  assert.equal(Number(line.netAmount), 2580);
  assert.equal(line.paymentStatus, 'pending');
  assert.equal((await owner.post('/api/v1/shop/payroll').set(H).send({ payPeriod: '2026-02' })).status, 409);
  assert.equal((await otherOwner.get(`/api/v1/shop/payroll/${payroll.body.run.id}`)).status, 404);

  assert.equal((await owner.post(`/api/v1/shop/payroll/${payroll.body.run.id}/items/${line.id}/payment`).set(H).send({ paymentDate: '2026-03-01', paymentMethod: 'cash' })).status, 409);
  assert.equal((await owner.patch(`/api/v1/shop/payroll/${payroll.body.run.id}/items/${line.id}`).set(H).send({ allowances: '110.00' })).status, 200);
  assert.equal((await owner.post(`/api/v1/shop/payroll/${payroll.body.run.id}/finalize`).set(H).send({})).status, 200);
  assert.equal((await owner.post(`/api/v1/shop/payroll/${payroll.body.run.id}/finalize`).set(H).send({})).status, 409);
  assert.equal((await owner.post('/api/v1/shop/salary').set(H).send({ userId, salaryType: 'monthly', baseSalary: '3500.00', allowances: '0.00', deductions: '0.00', effectiveDate: '2026-03-01' })).status, 201);
  let detail = await owner.get(`/api/v1/shop/payroll/${payroll.body.run.id}`);
  const finalizedLine = detail.body.run.items.find((item) => item.userId === userId);
  assert.equal(Number(finalizedLine.baseSalary), 2800);
  assert.equal(Number(finalizedLine.netAmount), 2590);
  assert.equal(finalizedLine.paymentStatus, 'pending');
  assert.equal((await owner.patch(`/api/v1/shop/payroll/${payroll.body.run.id}/items/${line.id}`).set(H).send({ allowances: '120.00' })).status, 409);

  const paid = await owner.post(`/api/v1/shop/payroll/${payroll.body.run.id}/items/${line.id}/payment`).set(H).send({ paymentDate: '2026-03-02', paymentMethod: 'bank_transfer' });
  assert.equal(paid.status, 200);
  assert.equal(paid.body.item.paymentStatus, 'paid');
  assert.equal((await owner.post(`/api/v1/shop/payroll/${payroll.body.run.id}/items/${line.id}/payment`).set(H).send({ paymentDate: '2026-03-02', paymentMethod: 'bank_transfer' })).status, 409);
  detail = await owner.get(`/api/v1/shop/payroll/${payroll.body.run.id}`);
  assert.equal(detail.body.run.items.find((item) => item.userId === userId).paymentStatus, 'paid');
});

test('duplicate owner email is rejected and creates no shop', async () => {
  const before = await Shop.count();
  const res = await admin.post('/api/v1/admin/shops').set(H).send(shopPayload(`Shop C ${run}`, ownerA));
  assert.equal(res.status, 409);
  assert.equal(await Shop.count(), before);
});

test('duplicate shop name is rejected and leaves no orphan owner', async () => {
  const email = `orphan-${run}@test.local`;
  const res = await admin.post('/api/v1/admin/shops').set(H).send(shopPayload(`shop a ${run}`, email));
  assert.equal(res.status, 409);
  assert.equal(await User.unscoped().count({ where: { email } }), 0);
});

test('owner insert failing AFTER the shop insert rolls the shop back', async () => {
  const { createShopWithOwner } = require('../src/services/shopService');
  const name = `Rollback Shop ${run}`;
  const payload = shopPayload(name, `rollback-${run}@test.local`);
  payload.owner.name = 'x'.repeat(500); // exceeds VARCHAR(120): MySQL strict mode rejects it at user insert
  const actor = await User.findOne({ where: { email: adminEmail } });
  await assert.rejects(() => createShopWithOwner(payload, actor, '127.0.0.1'));
  assert.equal(await Shop.count({ where: { name } }), 0);
  assert.equal(await User.unscoped().count({ where: { email: payload.owner.email } }), 0);
});

test('validation errors are reported per field', async () => {
  const res = await admin.post('/api/v1/admin/shops').set(H).send({ shop: { name: 'x' }, owner: { email: 'nope' } });
  assert.equal(res.status, 422);
  assert.ok(res.body.details['shop.name']);
  assert.ok(res.body.details['owner.email']);
});

test('non-admins cannot use admin endpoints; anonymous gets 401', async () => {
  const { agent } = await login(ownerA);
  assert.equal((await agent.get('/api/v1/admin/shops')).status, 403);
  assert.equal((await request(app).get('/api/v1/admin/shops')).status, 401);
});

test('mutating requests without the CSRF header are rejected', async () => {
  const res = await admin.post('/api/v1/admin/shop-categories').send({ name: `NoHeader ${run}` });
  assert.equal(res.status, 403);
});

test('shops only see wholesalers they are authorized for (A:{A,B}, B:{B,C})', async () => {
  const mk = async (n) => (await Wholesaler.create({ name: `W${n} ${run}` })).id;
  const [wA, wB, wC] = [await mk('A'), await mk('B'), await mk('C')];
  Object.assign(state, { wA, wB, wC });

  let r = await admin.put(`/api/v1/admin/shops/${state.shopA}/wholesalers`).set(H).send({ wholesalerIds: [wA, wB] });
  assert.equal(r.status, 200);
  r = await admin.put(`/api/v1/admin/shops/${state.shopB}/wholesalers`).set(H).send({ wholesalerIds: [wB, wC] });
  assert.equal(r.status, 200);

  const a = (await login(ownerA)).agent;
  const b = (await login(ownerB)).agent;

  const listA = (await a.get('/api/v1/shop/wholesalers')).body.items.map((w) => w.id).sort();
  const listB = (await b.get('/api/v1/shop/wholesalers')).body.items.map((w) => w.id).sort();
  assert.deepEqual(listA, [wA, wB].sort());
  assert.deepEqual(listB, [wB, wC].sort());

  // Direct ID access to a non-authorized wholesaler looks like "not found".
  assert.equal((await a.get(`/api/v1/shop/wholesalers/${wC}`)).status, 404);
  assert.equal((await b.get(`/api/v1/shop/wholesalers/${wA}`)).status, 404);
  assert.equal((await a.get(`/api/v1/shop/wholesalers/${wB}`)).status, 200);
});

test('client-supplied shopId is ignored: dashboard always shows the caller\'s own shop', async () => {
  const a = (await login(ownerA)).agent;
  const res = await a.get(`/api/v1/shop/dashboard?shopId=${state.shopB}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.shop.id, state.shopA);
  assert.equal(typeof res.body.stats.totalOrders, 'number');
  assert.equal(typeof res.body.stats.deliveredOrders, 'number');
  assert.equal(typeof res.body.stats.totalRevenue, 'number');
  assert.equal(typeof res.body.stats.pendingReturns, 'number');
  assert.equal(typeof res.body.stats.pendingRefunds, 'number');
  assert.equal(typeof res.body.stats.lowStockProducts, 'number');
  assert.deepEqual(res.body.salesOverview, {
    today: 0,
    last7Days: 0,
    thisMonth: 0,
  });
  assert.deepEqual(res.body.recentOrders, []);
  assert.deepEqual(res.body.lowStockAlerts, []);
  assert.deepEqual(res.body.returnOverview.pendingRequests, []);
  assert.deepEqual(res.body.returnOverview.pendingRefunds, []);

  const b = (await login(ownerB)).agent;
  const otherShopDashboard = await b.get(`/api/v1/shop/dashboard?shopId=${state.shopA}`);
  assert.equal(otherShopDashboard.status, 200);
  assert.equal(otherShopDashboard.body.shop.id, state.shopB);
  assert.notEqual(otherShopDashboard.body.shop.id, res.body.shop.id);
});

test('suspended shop blocks its owner immediately', async () => {
  const a = (await login(ownerA)).agent;
  assert.equal((await a.get('/api/v1/shop/dashboard')).status, 200);
  const p = await admin.patch(`/api/v1/admin/shops/${state.shopA}`).set(H).send({ status: 'suspended' });
  assert.equal(p.status, 200);
  assert.equal((await a.get('/api/v1/shop/dashboard')).status, 403);
  assert.equal((await login(ownerA)).res.status, 403);
  await admin.patch(`/api/v1/admin/shops/${state.shopA}`).set(H).send({ status: 'active' });
  assert.equal((await a.get('/api/v1/shop/dashboard')).status, 200);
});

test('invite flow: owner without password sets one via the emailed token', async () => {
  const email = `invitee-${run}@test.local`;
  const payload = shopPayload(`Shop D ${run}`, email);
  delete payload.owner.initialPassword;
  const res = await admin.post('/api/v1/admin/shops').set(H).send(payload);
  assert.equal(res.status, 201);
  assert.equal(res.body.shop.owner.status, 'invited');
  // Cannot log in before setup
  assert.equal((await login(email)).res.status, 401);

  // Issue a fresh token the same way "resend invite" does, then use it.
  const { issueToken } = require('../src/services/tokens');
  const u = await User.findOne({ where: { email } });
  const raw = await issueToken(u.id, 'account_setup', 60000);
  const bad = await request(app).post('/api/v1/auth/reset-password').set(H).send({ token: 'a'.repeat(64), password: PASSWORD });
  assert.equal(bad.status, 400);
  const ok = await request(app).post('/api/v1/auth/reset-password').set(H).send({ token: raw, password: PASSWORD });
  assert.equal(ok.status, 200);
  // single use
  assert.equal((await request(app).post('/api/v1/auth/reset-password').set(H).send({ token: raw, password: PASSWORD })).status, 400);
  assert.equal((await login(email)).res.status, 200);
});
