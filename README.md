# Event Management System (EMS)

A modern, responsive web application for managing and registering for events. Built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Supabase**.

**Created by:** Vismay Hiteshbhai Rathod.
**Intern_Project**
---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Development](#development)
- [Building for Production](#building-for-production)
- [Deployment](#deployment)
- [Database Schema](#database-schema)
- [Contributing](#contributing)
- [License](#license)

---

## ✨ Features

### User Features
- 🎯 **Browse Events** - View all available events with detailed information
- 🔍 **Event Filters** - Filter events by category, date, and availability
- 📝 **Easy Registration** - Simple and intuitive event registration form
- ✅ **Confirmation** - Registration success notifications
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- 🎨 **Modern UI** - Clean, professional interface with smooth animations

### Admin Features
- 🔐 **Admin Dashboard** - Secure login system for administrators
- ➕ **Create Events** - Add new events with detailed information
- ✏️ **Edit Events** - Modify existing event details
- 🗑️ **Delete Events** - Remove events from the system
- 👥 **View Registrations** - See all registered attendees
- 🔑 **Change Password** - Secure password management

---

## 🛠 Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI Library | 18.3.1 |
| **TypeScript** | Type Safety | 5.5.3 |
| **Vite** | Build Tool & Dev Server | 5.4.21 |
| **Tailwind CSS** | Styling | 3.4.1 |
| **Supabase** | Backend/Database | 2.57.4 |
| **Lucide React** | Icons | 0.344.0 |
| **ESLint** | Code Quality | 9.9.1 |

---

## 📁 Project Structure

```
project/
├── src/
│   ├── components/
│   │   ├── AdminLogin.tsx           # Admin authentication
│   │   ├── ChangePassword.tsx       # Password management
│   │   ├── EventCard.tsx            # Event card component
│   │   ├── EventFilters.tsx         # Event filtering UI
│   │   ├── EventForm.tsx            # Event creation/editing form
│   │   ├── RegistrationForm.tsx     # User registration form
│   │   └── RegistrationSuccess.tsx  # Success confirmation page
│   ├── pages/
│   │   ├── AdminPage.tsx            # Admin dashboard
│   │   └── EventsPage.tsx           # Events listing page
│   ├── lib/
│   │   └── supabase.ts              # Supabase client setup
│   ├── App.tsx                      # Root component
│   ├── main.tsx                     # Application entry point
│   ├── index.css                    # Global styles
│   └── vite-env.d.ts                # Vite environment types
├── supabase/
│   └── migrations/
│       └── 20251101121309_create_events_and_registrations.sql
├── public/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── eslint.config.js
└── README.md
```

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** - Package manager (comes with Node.js)
- **Git** - Version control (optional)
- **Supabase Account** - [Create Free Account](https://supabase.com)

---

## 🚀 Installation

### 1. Clone or Download the Project

```bash
git clone <your-repo-url>
cd project
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Set Up Supabase Database

Run the migration SQL file to create tables:

```bash
# In Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Create a new query
# 3. Copy contents from: supabase/migrations/20251101121309_create_events_and_registrations.sql
# 4. Execute the query
```

Or if using Supabase CLI:

```bash
supabase db push
```

---

## ⚙️ Configuration

### Supabase Setup

1. **Create a Supabase Project**
   - Visit [supabase.com](https://supabase.com)
   - Create a new project
   - Note your Project URL and Anon Key

2. **Configure Database**
   - Create tables using the migration file
   - Set up Row Level Security (RLS) policies
   - Configure authentication settings

3. **Enable Authentication**
   - Enable Email/Password provider
   - Set up SMTP for email confirmations (optional)

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public anon key from Supabase | `eyJhbG...` |

---

## 📖 Usage

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Project Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Lint code for errors and style issues
npm run lint

# Type check TypeScript files
npm run typecheck
```

### Accessing the Application

- **Users**: Visit the homepage to browse and register for events
- **Admins**: Click "Admin Login" to access the admin dashboard

---

## 🎨 Development

### Key Features Explained

#### Events Page
- Displays all available events in a grid layout
- Filters events by category
- Shows event details: date, time, location, attendees count
- Click event to register

#### Admin Dashboard
- **Event Management**: Create, edit, or delete events
- **Registrations View**: See all attendees for each event
- **Profile**: Manage admin account and password

#### Registration Form
- Captures user information: name, email, phone, additional details
- Validates form inputs
- Prevents double registration
- Shows success confirmation

### TypeScript Benefits

All components are fully typed for better:
- Type safety during development
- Better IDE autocomplete
- Fewer runtime errors
- Self-documenting code

---

## 🏗️ Building for Production

### Build the Project

```bash
npm run build
```

This creates a `dist/` folder with optimized production files:
- Minified JavaScript
- Optimized CSS
- Compressed images
- Source maps for debugging

### Preview Production Build

```bash
npm run preview
```

---

## 🌐 Deployment

### Option 1: Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Connect to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set environment variables
   - Deploy!

### Option 2: Netlify

1. Connect your GitHub repository to Netlify
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Add environment variables
4. Deploy

### Option 3: Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

Build and run:

```bash
docker build -t event-registration .
docker run -p 3000:3000 event-registration
```

### Option 4: Traditional Server (AWS, Azure, Google Cloud, etc.)

1. Build the project: `npm run build`
2. Upload `dist/` folder to server
3. Configure web server to serve `dist/index.html` for all routes
4. Set environment variables on server

---

## 🗄️ Database Schema

### Events Table
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  title VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR,
  event_date DATE,
  event_time TIME,
  location VARCHAR,
  image_url VARCHAR,
  max_attendees INTEGER,
  current_attendees INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Registrations Table
```sql
CREATE TABLE registrations (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  phone VARCHAR,
  additional_details TEXT,
  registered_at TIMESTAMP,
  created_at TIMESTAMP
)
```

---

## 🐛 Troubleshooting

### Common Issues

**"Supabase connection error"**
- Check if `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Verify database migrations have been run
- Check Supabase project is active

**"Port 5173 already in use"**
```bash
npm run dev -- --port 3000
```

**"Build fails"**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**"TypeScript errors"**
```bash
npm run typecheck
# Fix any reported issues
```

---

## 📦 Dependencies Summary

### Production Dependencies
- `react`: UI library for building components
- `react-dom`: React rendering for the web
- `@supabase/supabase-js`: Backend and database integration
- `lucide-react`: Icon library for UI elements

### Development Dependencies
- `vite`: Lightning-fast build tool and dev server
- `typescript`: Static type checking for JavaScript
- `tailwindcss`: Utility-first CSS framework
- `eslint`: Code quality and style linting
- Various configuration tools for development

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is private and created for educational purposes at Navodita Infotech.

---

## 👤 Author

**Vismay Rathod**

---

## 📞 Support

For issues, questions, or suggestions:
- Create an issue in the repository
- Contact me

---

## 🔗 Useful Links

- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Lucide Icons](https://lucide.dev)

---

**Last Updated:** November 18 2025
**Version:** 1.0.0

# Final-Event-Management-System-for-Tech-Fest-2026
# Final-Event-Management-System-for-Tech-Fest-2026
# Final-Event-Management-System-for-Tech-Fest-2026
# Final-Event-Management-System-for-Tech-Fest-2026
# Tech-Fest-2026-
# Tech-Fest-2026.
# Tech-Fest-2026
# 2026-TechFest-Improvements
# Tech-Fest-Website-code
# Tech-Fest-2026-with-IST
