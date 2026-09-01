# BeepMyDevice - Phase 1 Web Implementation Prompt
## Web Dashboard + React Native Web

**Copy this entire prompt and paste into Claude Code:**

---

## 🎯 SCOPE

Build 2 web experiences from same codebase:

1. **Web Dashboard** (Admin interface at `beepmydevice.com`)
   - Manage devices, send alerts, view activity
   - Desktop-optimized (sidebar, tables, charts)
   - React app (separate from mobile)

2. **React Native Web** (Mobile app on web at `beepmydevice.com/app`)
   - Same iOS/Android screens rendered on web
   - Mobile-optimized viewport
   - Single codebase (share backend API)

Both use **same design system**, **same API**, different UIs.

---

## PROJECT STRUCTURE

```
beepmydevice/
├── backend/                      # (Already done)
│   ├── src/
│   ├── requirements.txt
│   └── .env
├── frontend/                     # Mobile (iOS/Android + web via react-native-web)
│   ├── src/
│   ├── package.json
│   └── .env
├── web/                          # NEW - Web dashboard (admin interface)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── _app.tsx
│   │   │   ├── index.tsx          # Dashboard
│   │   │   ├── devices.tsx        # Devices management
│   │   │   ├── alerts.tsx         # Alert history
│   │   │   ├── settings.tsx       # Settings
│   │   │   └── profile.tsx        # Profile
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── DeviceCard.tsx
│   │   │   ├── AlertTable.tsx
│   │   │   ├── Chart.tsx
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useDevices.ts
│   │   │   ├── useAlerts.ts
│   │   │   └── ...
│   │   ├── services/
│   │   │   └── api.ts             # Same API client as mobile
│   │   ├── styles/
│   │   │   ├── theme.ts           # SAME as mobile
│   │   │   ├── colors.ts          # SAME as mobile
│   │   │   ├── spacing.ts         # SAME as mobile
│   │   │   └── globals.css
│   │   └── utils/
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   └── .env.local
└── docs/                         # (Already done)
```

---

## PART 1: WEB DASHBOARD (Next.js + React)

### 1.1 Setup

**Create Next.js project:**
```bash
cd beepmydevice
npx create-next-app@latest web --typescript --tailwind --app
cd web
npm install axios react-icons chart.js react-chartjs-2
npm install --save-dev @types/react-chartjs-2
```

**Copy design system from mobile:**
```bash
cp ../frontend/src/styles/* src/styles/
```

### 1.2 Environment (.env.local)

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_URL=https://beepmydevice.com
```

### 1.3 Shared API Service (Same as mobile)

**web/src/services/api.ts:**
```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401s
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async login(email: string, password: string) {
    const response = await apiClient.post('/auth/login', { email, password });
    const { data } = response.data;
    localStorage.setItem('access_token', data.access_token);
    return data;
  },

  async logout() {
    await apiClient.post('/auth/logout');
    localStorage.removeItem('access_token');
  },

  async getUser() {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
      const response = await apiClient.get('/users/me');
      return response.data.data;
    } catch {
      return null;
    }
  },
};

export const deviceService = {
  async getDeviceList(page: number = 1) {
    const response = await apiClient.get('/devices/list', { params: { page } });
    return response.data.data;
  },

  async getDevice(device_id: string) {
    const response = await apiClient.get(`/devices/${device_id}`);
    return response.data.data;
  },

  async deleteDevice(device_id: string) {
    await apiClient.delete(`/devices/${device_id}`);
  },
};

export const alertService = {
  async sendAlert(device_ids: string[] = []) {
    const response = await apiClient.post('/alerts/send', { device_ids });
    return response.data.data;
  },

  async getAlertLogs(page: number = 1) {
    const response = await apiClient.get('/alerts/logs', { params: { page } });
    return response.data.data;
  },

  async getDeviceAlertLogs(device_id: string, page: number = 1) {
    const response = await apiClient.get(`/alerts/logs/device/${device_id}`, { params: { page } });
    return response.data.data;
  },
};

export default apiClient;
```

### 1.4 Layout (Sidebar + Header)

**web/src/components/Layout.tsx:**
```typescript
import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { colors, spacing } from '@/styles/theme';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.background }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />
        
        <main
          style={{
            flex: 1,
            padding: spacing.l,
            overflowY: 'auto',
            maxWidth: '1400px',
            margin: '0 auto',
            width: '100%',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
```

**web/src/components/Sidebar.tsx:**
```typescript
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { colors, spacing } from '@/styles/theme';

const navItems = [
  { label: 'Dashboard', href: '/', icon: '📊' },
  { label: 'Devices', href: '/devices', icon: '📱' },
  { label: 'Alerts', href: '/alerts', icon: '🔔' },
  { label: 'Settings', href: '/settings', icon: '⚙️' },
  { label: 'Profile', href: '/profile', icon: '👤' },
];

export default function Sidebar() {
  const router = useRouter();

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: colors.white,
        borderRight: `1px solid ${colors.border}`,
        padding: spacing.m,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: spacing.l }}>
        <h2 style={{ margin: 0, color: colors.primary }}>🔔 BeepMyDevice</h2>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1 }}>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.m,
                padding: `${spacing.sm}px ${spacing.m}px`,
                marginBottom: spacing.s,
                borderRadius: '8px',
                textDecoration: 'none',
                color: router.pathname === item.href ? colors.primary : colors.gray,
                backgroundColor: router.pathname === item.href ? `${colors.primary}10` : 'transparent',
                fontWeight: router.pathname === item.href ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 200ms',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          </Link>
        ))}
      </nav>

      {/* User Info */}
      <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: spacing.m }}>
        <p style={{ margin: 0, fontSize: '12px', color: colors.gray }}>Logged in as</p>
        <p style={{ margin: `${spacing.s}px 0 0`, fontWeight: '600' }}>Admin User</p>
      </div>
    </aside>
  );
}
```

**web/src/components/Header.tsx:**
```typescript
import React from 'react';
import { colors, spacing } from '@/styles/theme';

interface HeaderProps {
  title?: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header
      style={{
        height: '60px',
        backgroundColor: colors.white,
        borderBottom: `1px solid ${colors.border}`,
        padding: `0 ${spacing.m}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginLeft: '260px',
      }}
    >
      <h1 style={{ margin: 0, fontSize: '24px', color: colors.dark }}>{title || 'Dashboard'}</h1>
      
      <div style={{ display: 'flex', gap: spacing.m, alignItems: 'center' }}>
        <button
          style={{
            backgroundColor: colors.background,
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
```

### 1.5 Pages

**web/src/pages/index.tsx (Dashboard):**
```typescript
import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { deviceService, alertService } from '@/services/api';
import { colors, spacing, typography } from '@/styles/theme';

const Dashboard = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const devicesData = await deviceService.getDeviceList();
        const alertsData = await alertService.getAlertLogs();
        
        setDevices(devicesData.content);
        setAlerts(alertsData.content);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Layout>
      <div style={{ marginLeft: '260px' }}>
        <h1>Dashboard</h1>

        {/* Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: spacing.m,
            marginBottom: spacing.l,
          }}
        >
          {/* Card 1: Active Devices */}
          <div
            style={{
              backgroundColor: colors.white,
              padding: spacing.m,
              borderRadius: '16px',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <p style={{ ...typography.small, color: colors.gray, margin: 0 }}>Active Devices</p>
                <h2 style={{ ...typography.display, margin: `${spacing.s}px 0 0`, color: colors.primary }}>
                  {devices.filter((d) => d.status === 'ONLINE').length}
                </h2>
              </div>
              <span style={{ fontSize: '32px' }}>📱</span>
            </div>
          </div>

          {/* Card 2: Alerts Today */}
          <div
            style={{
              backgroundColor: colors.white,
              padding: spacing.m,
              borderRadius: '16px',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <p style={{ ...typography.small, color: colors.gray, margin: 0 }}>Alerts Today</p>
                <h2 style={{ ...typography.display, margin: `${spacing.s}px 0 0`, color: colors.success }}>
                  {alerts.length}
                </h2>
              </div>
              <span style={{ fontSize: '32px' }}>🔔</span>
            </div>
          </div>

          {/* Card 3: WiFi Status */}
          <div
            style={{
              backgroundColor: colors.white,
              padding: spacing.m,
              borderRadius: '16px',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <div>
              <p style={{ ...typography.small, color: colors.gray, margin: 0 }}>WiFi Status</p>
              <p style={{ ...typography.h2, margin: `${spacing.s}px 0 0`, color: colors.success }}>Connected</p>
              <p style={{ ...typography.caption, color: colors.gray, margin: '8px 0 0' }}>Home Network</p>
            </div>
          </div>
        </div>

        {/* Devices List */}
        <div
          style={{
            backgroundColor: colors.white,
            borderRadius: '16px',
            border: `1px solid ${colors.border}`,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: spacing.m, borderBottom: `1px solid ${colors.border}` }}>
            <h2 style={{ margin: 0 }}>Your Devices</h2>
          </div>
          
          {devices.length > 0 ? (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: colors.background }}>
                  <th style={{ padding: spacing.m, textAlign: 'left', fontWeight: '600' }}>Device</th>
                  <th style={{ padding: spacing.m, textAlign: 'left', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: spacing.m, textAlign: 'left', fontWeight: '600' }}>Battery</th>
                  <th style={{ padding: spacing.m, textAlign: 'left', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.device_id} style={{ borderTop: `1px solid ${colors.border}` }}>
                    <td style={{ padding: spacing.m }}>
                      <p style={{ margin: 0, fontWeight: '600' }}>{device.device_name}</p>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.gray }}>{device.device_type}</p>
                    </td>
                    <td style={{ padding: spacing.m }}>
                      <span style={{ color: device.status === 'ONLINE' ? colors.success : colors.offline }}>
                        {device.status === 'ONLINE' ? '🟢' : '🔴'} {device.status}
                      </span>
                    </td>
                    <td style={{ padding: spacing.m }}>
                      <div style={{ width: '80px', height: '8px', backgroundColor: colors.border, borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${device.battery_level}%`,
                            backgroundColor: device.battery_level > 30 ? colors.success : colors.warning,
                          }}
                        />
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.gray }}>{device.battery_level}%</p>
                    </td>
                    <td style={{ padding: spacing.m }}>
                      <button
                        style={{
                          padding: '8px 16px',
                          backgroundColor: colors.primary,
                          color: colors.white,
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                        }}
                      >
                        Send Alert
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: spacing.l, textAlign: 'center', color: colors.gray }}>
              No devices found. Install the mobile app to get started.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
```

### 1.6 Additional Pages

Create similar pages for:
- `pages/devices.tsx` - Device management
- `pages/alerts.tsx` - Alert history
- `pages/settings.tsx` - Settings
- `pages/profile.tsx` - User profile
- `pages/login.tsx` - Login page

---

## PART 2: REACT NATIVE WEB (Mobile app on web)

### 2.1 Add React Native Web to Mobile Project

**frontend/package.json:**
```json
{
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.72.7",
    "react-native-web": "^0.18.12",
    "react-dom": "^18.2.0"
  },
  "scripts": {
    "web": "expo start --web",
    "web:build": "expo export --platform web"
  }
}
```

**Install:**
```bash
cd frontend
npm install react-native-web react-dom expo-web-browser
```

### 2.2 Create Web Entry Point

**frontend/web/index.tsx:**
```typescript
import React from 'react';
import { AppRegistry } from 'react-native';
import App from '../src/App';

AppRegistry.registerComponent('BeepMyDevice', () => App);
AppRegistry.runApplication('BeepMyDevice', {
  rootTag: document.getElementById('root'),
});
```

### 2.3 Update App.tsx for Web Support

**frontend/src/App.tsx:**
```typescript
import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './navigation/RootNavigator';

const App = () => {
  // On web, add web-specific styling
  if (Platform.OS === 'web') {
    // Add viewport meta tag
    if (typeof document !== 'undefined') {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0';
      document.head.appendChild(meta);
    }
  }

  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
};

export default App;
```

### 2.4 Build Web Version

```bash
cd frontend
npm run web
# Runs at http://localhost:19006
```

**Or build for production:**
```bash
npm run web:build
# Creates ./web-build/
# Deploy to: beepmydevice.com/app
```

---

## PART 3: DEPLOYMENT

### 3.1 Structure on beepmydevice.com

```
https://beepmydevice.com/              → Web Dashboard (Next.js)
https://beepmydevice.com/app           → Mobile app on web (React Native Web)
https://beepmydevice.com/api/v1/*      → Backend API (already running)
```

### 3.2 Nginx Configuration

```nginx
server {
    listen 80;
    server_name beepmydevice.com;
    root /var/www/beepmydevice;

    # Dashboard (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Mobile app on web (React Native Web)
    location /app {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/v1 {
        proxy_pass http://localhost:8000/api/v1;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## PART 4: RUNNING EVERYTHING

### Local Development

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn src.main:app --reload --workers 1
# Runs on http://localhost:8000
```

**Terminal 2 - Web Dashboard:**
```bash
cd web
npm run dev
# Runs on http://localhost:3000
```

**Terminal 3 - Mobile app on web:**
```bash
cd frontend
npm run web
# Runs on http://localhost:19006
```

**Access:**
- Dashboard: `http://localhost:3000`
- Mobile app: `http://localhost:19006`
- API: `http://localhost:8000/health`

### Testing Flow

1. Login to dashboard (localhost:3000)
2. Manage devices
3. Send alerts
4. View activity logs
5. Switch to mobile app (localhost:19006) to see same app on web

---

## CHECKLIST

**Web Dashboard (Next.js):**
- [ ] Layout (Sidebar + Header)
- [ ] Dashboard page (summary cards, device list)
- [ ] Devices page (device management)
- [ ] Alerts page (alert history)
- [ ] Settings page (preferences)
- [ ] Profile page (account settings)
- [ ] Login page (authentication)
- [ ] Logout functionality
- [ ] API integration (all services)
- [ ] Loading states
- [ ] Error handling
- [ ] Responsive design

**React Native Web (Mobile on web):**
- [ ] Install react-native-web
- [ ] Web entry point
- [ ] Run npm run web
- [ ] All 8 screens render on web
- [ ] API integration works
- [ ] Touchable → Clickable on web
- [ ] Icons render properly

**Deployment:**
- [ ] Nginx config for routing
- [ ] Dashboard on /
- [ ] Mobile app on /app
- [ ] API on /api/v1
- [ ] SSL certificate (HTTPS)

---

End of Phase 1 Web Implementation Prompt
