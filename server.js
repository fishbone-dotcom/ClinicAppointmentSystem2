// server.js

const express = require('express');
const cors = require('cors');
const db = require('./helpers/database')
const cookieParser = require('cookie-parser');
require('dotenv').config(); // For loading .env variables

const appointmentRoutes = require('./routes/appointments');
// const patientRoutes = require('./routes/patients');
// const userRoutes = require('./routes/users');
const clinicRoutes = require('./routes/clinics');
// const loginRoutes = require('./routes/login');
// const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware

app.use(cookieParser());
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3030', // frontend origin (Next.js dev server)
  credentials: true                // ✅ important so browser sends cookies
}));

app.use(express.urlencoded({ extended: true })); // for form-urlencoded body

// set to default database
const setToDefaultDB = async (req, res, next) => {
  let conn

  conn = await db.getClient()
  res.locals.conn = conn
  next()
}

app.use(setToDefaultDB)

// Routes
app.use('/api/appointments', appointmentRoutes);
// app.use('/api/patients', patientRoutes);
// app.use('/api/users', userRoutes);
app.use('/api/clinics', clinicRoutes);
// app.use('/api/', loginRoutes);
// app.use('/api/dashboard', dashboardRoutes);

// Root route
app.get('/', async (req, res) => {
  res.send('Appointment Reminder API is running 🚀');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
