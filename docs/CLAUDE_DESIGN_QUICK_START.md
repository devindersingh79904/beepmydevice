# 🎨 Claude Design - 3 Step Process

## Step 1: Go to Claude Design
```
URL: https://claude.ai/design?via=web_frame_sidebar
```

---

## Step 2: Copy the Prompt Below

```
⬇️ COPY EVERYTHING FROM HERE ⬇️

## BeepMyDevice - Complete App UI/UX Design

I need you to create high-fidelity UI mockups for **BeepMyDevice** - a WiFi-based device alert app for iOS, Android, Mac, and Windows.

### Design System (Use Exactly)

**Color Palette:**
- Primary Blue: #2563EB
- Success Green: #10B981
- Warning Amber: #F59E0B
- Error Red: #EF4444
- Text Dark: #000000
- Text Gray: #4B5563
- White: #FFFFFF
- Light Gray: #F3F4F6
- Medium Gray: #D1D5DB

**Typography:**
- Display: 32pt, bold
- Heading 1: 28pt, bold
- Heading 2: 20pt, semi-bold
- Body: 16pt, regular
- Small: 14pt, regular
- Caption: 12pt, regular

**Spacing:**
- Base unit: 4px (all spacing multiples of 4)
- Screen padding: 16px
- Card padding: 16px
- Border radius: Large 16px, Medium 8px, Small 4px

---

## 8 Screens to Design

### 1. Splash Screen
- Full screen with gradient background (light to dark blue)
- Centered app logo (120px × 120px)
- App name below logo (28pt, bold, white)
- Animated loading spinner (blue)

### 2. Login Screen
- Header: Logo (60px) + "Welcome Back" (28pt) + Subtitle (16pt, gray)
- Email input: 48px height, icon left, blue focus state
- Password input: 48px height, icon left, show/hide toggle
- Sign In button: Full width, 48px, brand blue, white text
- "Forgot password?" link: right-aligned, blue
- "Don't have account?" + "Sign up" link at bottom

### 3. Register Screen
- Similar to LoginScreen
- Header: "Create Account"
- Email input with real-time validation (✓ Available / ✗ Email already used)
- Password input with strength indicator (Weak/Medium/Strong)
- Confirm Password with matching indicator (✓ Match / ✗ Mismatch)
- Create Account button: Full width, 48px, brand blue
- Bottom: "Already have account?" + "Sign in" link

### 4. Dashboard Screen (Main)
- Fixed header (56px): WiFi info (left) + User avatar (40px, right)
- Scrollable device list
- Pull-to-refresh at top

**Device Card (for each device):**
- Full width minus 32px padding
- Min height: 100px
- Background: White, border: 1px light gray, radius: 12px, padding: 16px
- Row 1: Device name (16pt, bold) | Status badge (right)
  - Status badge: "● Online" (green) or "● Offline" (gray)
- Row 2: Device type (14pt, gray)
- Row 3: Battery icon + "Battery: 85%" (14pt)
- Row 4: "Last seen 2 min ago" (12pt, gray)
- Row 5: "Send Alert" button (full width, 40px, brand blue)
  - Disabled & gray when offline

**Empty State (no devices):**
- Large icon + "No Devices Found" + "Connect to same WiFi" + Refresh button
- Centered in middle

**Loading State:**
- Show 3 skeleton card loaders with pulse animation

### 5. Alert Confirmation Modal
- Modal with darkened overlay (50% opacity black)
- Dialog centered: width 80% (max 360px), radius 16px
- Slide up animation from bottom (300ms)

**Content:**
- Title: "Send Alert?" (20pt, bold)
- Device info card:
  - Device icon (32px)
  - "Samsung S24 Ultra" (16pt, bold)
  - "Android Phone" (14pt, gray)
  - "Home-WiFi ✓" (14pt, green)
  - Background: Light gray, radius 8px
- Message: "This device will beep and vibrate" (14pt, gray)

**Buttons:**
- Left: "Cancel" (light gray background, 44px height, 45% width)
- Right: "Send Alert" (brand blue background, 44px height, 45% width)
- Gap: 10px

**States:**
- Normal: Buttons ready
- Loading: Spinner in Send button, disable both
- Success: Modal fades out
- Error: Error message below device info

### 6. Device Detail Screen
- Header: Back button (left) | Device name (center, 20pt, bold) | Menu (right)
- Device card (expanded):
  - Device icon/image (80px × 80px)
  - "Samsung S24 Ultra" (20pt, bold)
  - "Android Phone" (16pt, gray)
  - "Android 14" (14pt, gray)

**Status Section:**
- "● Online" or "● Offline" badge
- "Connected at: Home-WiFi" (14pt, gray)
- "Last seen: 2 minutes ago" (14pt, gray)

**Battery Section:**
- Battery icon (animated, 32px)
- "Battery: 85%" (16pt, bold)
- Battery bar (full width, color-coded)
- "Fully charged in ~2 hours" (12pt, gray)

**Device Registration:**
- "Registered: Aug 30, 2024" (12pt, gray)
- "Device ID: abc123xyz789" (12pt, gray, copyable)

**Alert History Section:**
- Title: "Alert History" (18pt, bold)
- Empty: "No alerts sent yet" (14pt, gray)
- When populated: List items
  - Timestamp (12pt, gray)
  - Status: "✓ Delivered" (green) or "✗ Failed" (red)
  - 1px border between items
  - Max 5 visible, "See all" link if more

**Send Alert Button (Sticky at bottom):**
- Full width minus 16px padding
- 48px height
- "Send Alert" (16pt, bold, white)
- Brand blue background
- Margin: 16px bottom

**Remove Device Button:**
- Text only: "Remove Device" (14pt, red)
- Centered, margin top 32px
- Tap target: 44px height

### 7. Settings Screen
- Header: "Settings" (20pt, bold)

**Account Section:**
- Title: "Account" (gray background row, 14pt, semi-bold)
- User Profile: Avatar (48px) | Name (16pt, bold) | Email (14pt, gray) | Chevron
  - Tap: Go to edit profile
- Change Password: Lock icon | "Change Password" (16pt) | Chevron
- Email Address: Email icon | "Email: dev@example.com" (16pt) | Chevron
- Each row: 56px height, 16px padding, 1px bottom border

**Devices Section:**
- Title: "Devices" (14pt, semi-bold)
- Manage Devices: Device icon | "Manage Devices" (16pt) | Badge "5" (blue) | Chevron
- Help: Question icon | "How to register device?" (16pt) | Chevron

**Notifications Section:**
- Title: "Notifications" (14pt, semi-bold)
- Push Notifications: Bell icon | "Push Notifications" (16pt) | Toggle (right)
  - Description: "Receive alerts when devices found" (12pt, gray)
- Sound: Speaker icon | "Sound" (16pt) | Toggle (visible if push enabled)
- Vibration: Vibration icon | "Vibration" (16pt) | Toggle (visible if push enabled)

**App Section:**
- Title: "App" (14pt, semi-bold)
- Version: Info icon | "Version" (16pt) | "1.0.0" (14pt, gray, right)
- Check Updates: Download icon | "Check for Updates" (16pt) | Chevron

**About Section:**
- Title: "About" (14pt, semi-bold)
- Terms: "Terms of Service" (16pt) | Chevron
- Privacy: "Privacy Policy" (16pt) | Chevron

**Logout Section:**
- Button: Full width, 48px
- "Log Out" (16pt, bold, red)
- Background: Transparent with 1px red border
- Margin top: 32px
- Opens confirmation modal on tap

### 8. Error States & Alerts

**Error Banner (Top):**
- Red background (#EF4444)
- White text (14pt, semi-bold)
- X close button (white, 24px)
- Padding: 12px horizontal, 10px vertical
- Slide down animation (200ms)
- Auto-dismiss: 5 seconds
- Tap outside to close

**Field Error Messages:**
- Below input field
- Red text (#EF4444, 12pt)
- Margin top: 4px
- Icon: X or !

**Toast Notifications (Bottom):**
- Dark gray background (semi-transparent)
- White text (12pt)
- Padding: 12px horizontal, 8px vertical
- Radius: 8px
- Position: Above safe area
- Auto-dismiss: 3 seconds
- Success: Green checkmark + "Device alert sent!"
- Error: Red X + "Failed to send alert"
- Info: Info icon + "Device is offline"

**Skeleton Loader (Loading):**
- Gray background (#E5E7EB)
- Animated pulse (fade in/out, 1.5s cycle)
- Show 3 skeleton cards on initial load

---

## Reusable Components

**Buttons:**
- Variants: Primary (blue), Secondary (gray), Danger (red), Text-only
- Sizes: Large (48px), Medium (40px), Small (36px)
- States: Normal, Hover, Pressed (0.98 scale), Disabled, Loading

**Inputs:**
- Types: Text, Email, Password, Number
- States: Empty, Focused (blue border + shadow), Filled, Error, Success
- Icon support: Left & right icons
- Labels: Always visible above or inside

**Badge:**
- Variants: Success (green), Warning (amber), Error (red), Info (blue)
- Sizes: Small (12pt), Medium (14pt)
- With/without icons

**Card:**
- Padding: 16px
- Border: 1px light gray
- Radius: 12px
- Shadow: Subtle
- Full width on mobile

**Modal/Dialog:**
- Background: Darkened overlay (50% opacity)
- Dialog: Centered, width 80% (max 360px), radius 16px
- Animation: Slide up (300ms)

**List Item:**
- Height: 56px (minimum tap target)
- Padding: 16px horizontal, 8px vertical
- Border: 1px bottom light gray
- Layout: Icon | Text | Value | Chevron

---

## Animations

**Screen Transitions:**
- Push: Slide right to left (250ms, ease-out)
- Pop: Slide left to right (250ms, ease-out)
- Modal: Slide up (300ms, ease-out)
- Fade: Crossfade (200ms, ease-in-out)

**Tap Feedback:**
- Scale: 0.98 on press
- Duration: 100ms
- Haptic: Light impact (iOS), 50ms vibration (Android)

**Loading:**
- Spinner: Continuous rotation (1s per rotation)
- Skeleton: Pulse fade (1.5s cycle)
- Pull to refresh: Spinner + bounce

---

## Accessibility

**Contrast:**
- All text: 4.5:1 ratio (WCAG AA)
- Large text (18pt+): 3:1 ratio
- Focus: 2px blue outline on all interactive elements

**Touch Targets:**
- Minimum 48px × 48px
- 8px spacing between targets

**Color Independence:**
- Don't rely on color alone
- Use icon + text + color
- Example: Red icon + "✗" + "Error" text

---

## Responsive Design

**Mobile (320px - 480px):**
- Full-width components
- Single column layout
- 48px minimum buttons

**Tablet (481px - 768px, future):**
- Two-column layouts
- Larger cards
- Side navigation (optional)

**Desktop (769px+):**
- Multi-column layouts
- Keyboard support
- Mouse-friendly

---

## Design Deliverables

Create:
1. All 8 screen mockups (high-fidelity)
2. Component library
3. Design system documentation
4. Interaction specifications
5. Responsive layouts (mobile, tablet, desktop)

⬆️ COPY EVERYTHING ABOVE ⬆️
```

---

## Step 3: Paste into Claude Design

1. Click in Claude Design text input area
2. Paste the prompt (Ctrl+V or Cmd+V)
3. Press Enter or Submit
4. Wait 2-5 minutes
5. Claude Design will create all 8 screens + components

---

## Step 4: Review Mockups

After Claude Design generates:
- [ ] All 8 screens are present
- [ ] Colors match (#2563EB, #10B981, etc)
- [ ] Typography follows hierarchy (28pt titles, 16pt body, etc)
- [ ] Buttons are 48px minimum
- [ ] Components are consistent

---

## Step 5: Export

Ask Claude Design to:
```
"Export as Figma file"
or
"Export all screens as PNG images"
or
"Export design tokens as JSON"
```

---

## 🎁 What You Get

✅ 8 high-fidelity screen mockups  
✅ 15+ reusable components  
✅ Complete design system  
✅ Animation specifications  
✅ Accessibility guidelines  
✅ Responsive layouts  

---

## 💡 If Something's Wrong

Ask Claude Design to fix:
```
"Make buttons 56px instead of 48px"
"Use #2563EB for all primary buttons"
"Add drop shadow to cards"
"Change offline badge color to light blue"
"Increase padding to 20px on all screens"
```

---

**That's it! 3 steps to beautiful mockups! 🎨**

---

## All 10 Project Files You Have

1. BeepMyDevice_Complete_Documentation.md
2. BeepMyDevice_Repository_Setup.md
3. CODING_STANDARDS.md
4. WiFi_Alert_System_Specification.md
5. BeepMyDevice_GitHub_Setup.md
6. BeepMyDevice_TODAY_CHECKLIST.md
7. BeepMyDevice_Professional_Brief.md
8. BeepMyDevice_UI_UX_Design_Brief.md
9. Claude_Design_Prompt.md (this file)
10. How_to_Use_Claude_Design.md

**Everything is ready. Let's create! 🚀**
