import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './database.js';

export const apiRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'roulez-jeunesse-local-secret';

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

// ============ AUTH ============

apiRouter.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    
    const stmt = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
    const result = stmt.run(email, passwordHash);
    
    const user = db.prepare('SELECT id, email, created_at FROM users WHERE rowid = ?').get(result.lastInsertRowid);
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    
    res.json({ user, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    
    res.json({ 
      user: { id: user.id, email: user.email, created_at: user.created_at },
      token 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ VEHICLES ============

apiRouter.get('/vehicles', authMiddleware, (req, res) => {
  const vehicles = db.prepare('SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json(vehicles);
});

apiRouter.post('/vehicles', authMiddleware, (req, res) => {
  const { brand, model, year, license_plate, vin, current_mileage, fuel_type, photo_url } = req.body;
  
  const stmt = db.prepare(`
    INSERT INTO vehicles (user_id, brand, model, year, license_plate, vin, current_mileage, fuel_type, photo_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(req.userId, brand, model, year, license_plate, vin, current_mileage || 0, fuel_type || 'essence', photo_url);
  
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE rowid = ?').get(result.lastInsertRowid);
  res.json(vehicle);
});

apiRouter.put('/vehicles/:id', authMiddleware, (req, res) => {
  const { brand, model, year, license_plate, vin, current_mileage, fuel_type, photo_url } = req.body;
  
  db.prepare(`
    UPDATE vehicles SET brand = ?, model = ?, year = ?, license_plate = ?, vin = ?, 
    current_mileage = ?, fuel_type = ?, photo_url = ?, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(brand, model, year, license_plate, vin, current_mileage, fuel_type, photo_url, req.params.id, req.userId);
  
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  res.json(vehicle);
});

apiRouter.delete('/vehicles/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM vehicles WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ============ MAINTENANCE RECORDS ============

apiRouter.get('/maintenance', authMiddleware, (req, res) => {
  const { vehicle_id } = req.query;
  let query = 'SELECT * FROM maintenance_records WHERE user_id = ?';
  const params = [req.userId];
  
  if (vehicle_id) {
    query += ' AND vehicle_id = ?';
    params.push(vehicle_id);
  }
  
  query += ' ORDER BY date DESC';
  const records = db.prepare(query).all(...params);
  res.json(records);
});

apiRouter.post('/maintenance', authMiddleware, (req, res) => {
  const { vehicle_id, type, description, date, mileage, cost, garage_name, notes } = req.body;
  
  const stmt = db.prepare(`
    INSERT INTO maintenance_records (vehicle_id, user_id, type, description, date, mileage, cost, garage_name, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(vehicle_id, req.userId, type, description, date, mileage, cost || 0, garage_name, notes);
  
  // Update vehicle mileage if higher
  if (mileage) {
    db.prepare('UPDATE vehicles SET current_mileage = MAX(current_mileage, ?) WHERE id = ?').run(mileage, vehicle_id);
  }
  
  const record = db.prepare('SELECT * FROM maintenance_records WHERE rowid = ?').get(result.lastInsertRowid);
  res.json(record);
});

apiRouter.delete('/maintenance/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM maintenance_records WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ============ FUEL LOGS ============

apiRouter.get('/fuel-logs', authMiddleware, (req, res) => {
  const { vehicle_id } = req.query;
  let query = 'SELECT * FROM fuel_logs WHERE user_id = ?';
  const params = [req.userId];
  
  if (vehicle_id) {
    query += ' AND vehicle_id = ?';
    params.push(vehicle_id);
  }
  
  query += ' ORDER BY date DESC';
  const logs = db.prepare(query).all(...params);
  res.json(logs);
});

apiRouter.post('/fuel-logs', authMiddleware, (req, res) => {
  const { vehicle_id, date, mileage, liters, price_per_liter, total_cost, full_tank, station_name, notes } = req.body;
  
  const stmt = db.prepare(`
    INSERT INTO fuel_logs (vehicle_id, user_id, date, mileage, liters, price_per_liter, total_cost, full_tank, station_name, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(vehicle_id, req.userId, date, mileage, liters, price_per_liter, total_cost, full_tank ? 1 : 0, station_name, notes);
  
  // Update vehicle mileage
  db.prepare('UPDATE vehicles SET current_mileage = MAX(current_mileage, ?) WHERE id = ?').run(mileage, vehicle_id);
  
  const log = db.prepare('SELECT * FROM fuel_logs WHERE rowid = ?').get(result.lastInsertRowid);
  res.json(log);
});

// ============ REMINDERS ============

apiRouter.get('/reminders', authMiddleware, (req, res) => {
  const { vehicle_id } = req.query;
  let query = 'SELECT * FROM reminders WHERE user_id = ?';
  const params = [req.userId];
  
  if (vehicle_id) {
    query += ' AND vehicle_id = ?';
    params.push(vehicle_id);
  }
  
  query += ' ORDER BY due_date ASC';
  const reminders = db.prepare(query).all(...params);
  res.json(reminders);
});

apiRouter.post('/reminders', authMiddleware, (req, res) => {
  const { vehicle_id, title, description, due_date, due_mileage } = req.body;
  
  const stmt = db.prepare(`
    INSERT INTO reminders (vehicle_id, user_id, title, description, due_date, due_mileage)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(vehicle_id, req.userId, title, description, due_date, due_mileage);
  
  const reminder = db.prepare('SELECT * FROM reminders WHERE rowid = ?').get(result.lastInsertRowid);
  res.json(reminder);
});

// ============ GARAGE VISITS ============

apiRouter.get('/garage-visits', authMiddleware, (req, res) => {
  const { vehicle_id } = req.query;
  let query = 'SELECT * FROM garage_visits WHERE user_id = ?';
  const params = [req.userId];
  
  if (vehicle_id) {
    query += ' AND vehicle_id = ?';
    params.push(vehicle_id);
  }
  
  query += ' ORDER BY date DESC';
  const visits = db.prepare(query).all(...params);
  res.json(visits.map(v => ({ ...v, prestations: v.prestations ? JSON.parse(v.prestations) : [] })));
});

apiRouter.post('/garage-visits', authMiddleware, (req, res) => {
  const { vehicle_id, title, garage_name, date, mileage, total_cost, notes, prestations } = req.body;
  
  const stmt = db.prepare(`
    INSERT INTO garage_visits (vehicle_id, user_id, title, garage_name, date, mileage, total_cost, notes, prestations)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(vehicle_id, req.userId, title, garage_name, date, mileage, total_cost || 0, notes, JSON.stringify(prestations || []));
  
  if (mileage) {
    db.prepare('UPDATE vehicles SET current_mileage = MAX(current_mileage, ?) WHERE id = ?').run(mileage, vehicle_id);
  }
  
  const visit = db.prepare('SELECT * FROM garage_visits WHERE rowid = ?').get(result.lastInsertRowid);
  res.json({ ...visit, prestations: visit.prestations ? JSON.parse(visit.prestations) : [] });
});

// ============ MAINTENANCE SCHEDULES ============

apiRouter.get('/maintenance-schedules', authMiddleware, (req, res) => {
  const { vehicle_id } = req.query;
  let query = 'SELECT * FROM maintenance_schedules WHERE user_id = ?';
  const params = [req.userId];
  
  if (vehicle_id) {
    query += ' AND vehicle_id = ?';
    params.push(vehicle_id);
  }
  
  const schedules = db.prepare(query).all(...params);
  res.json(schedules);
});

apiRouter.post('/maintenance-schedules', authMiddleware, (req, res) => {
  const { vehicle_id, name, interval_months, interval_km, last_done_date, last_done_mileage, notes } = req.body;
  
  const stmt = db.prepare(`
    INSERT INTO maintenance_schedules (vehicle_id, user_id, name, interval_months, interval_km, last_done_date, last_done_mileage, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(vehicle_id, req.userId, name, interval_months, interval_km, last_done_date, last_done_mileage, notes);
  
  const schedule = db.prepare('SELECT * FROM maintenance_schedules WHERE rowid = ?').get(result.lastInsertRowid);
  res.json(schedule);
});
