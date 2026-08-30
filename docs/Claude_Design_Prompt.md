# Claude Design - BeepMyDevice UI Mockups Prompt

**Copy this entire prompt and paste into Claude Design:**

---

## BeepMyDevice - Complete App UI/UX Design

I need you to create high-fidelity UI mockups for **BeepMyDevice** - a WiFi-based device alert app for iOS, Android, Mac, and Windows.

### Project Overview
- **App Name:** BeepMyDevice
- **Purpose:** Find and alert devices on the same home WiFi, across accounts
- **Platforms:** iOS, Android, Mac, Windows
- **Tech:** React Native + TypeScript
- **Design Approach:** Clean, modern, intuitive (minimal friction)

### Two kinds of device (this drives several screens)

- **Owned** - registered by a signed-in user. The network admin. Sends and
  receives alerts.
- **Guest** - opened the app on the WiFi without signing in. Auto-registers
  with no login and no approval, appears in the admin's list immediately,
  **receives** alerts, and can **never send** them.

Guests are a normal, expected part of the list, not an error state. Style them
neutrally (slate `#64748B` on `#F1F5F9`), never in amber or red. Every screen
that lists or details a device needs to show which kind it is.

### Design System (Use Exactly)

**Color Palette:**
- Primary Blue: `#2563EB` (buttons, links, focus states)
- Success Green: `#10B981` (online status, success)
- Warning Amber: `#F59E0B` (battery warning, offline)
- Error Red: `#EF4444` (errors, destructive actions)
- Text Dark: `#000000` (primary text)
- Text Gray: `#4B5563` (secondary text)
- White: `#FFFFFF` (backgrounds)
- Light Gray: `#F3F4F6` (secondary backgrounds)
- Medium Gray: `#D1D5DB` (borders, disabled)
- Guest Slate: `#64748B` on `#F1F5F9` (Guest badge - neutral, not a warning)

**Typography:**
- Display: 32pt, bold (section titles)
- Heading 1: 28pt, bold (screen titles)
- Heading 2: 20pt, semi-bold (section headers)
- Heading 3: 18pt, semi-bold (subsection headers)
- Body: 16pt, regular (main text)
- Small: 14pt, regular (labels, secondary text)
- Caption: 12pt, regular (helper text, timestamps)

**Spacing & Radius:**
- Base unit: 4px (all spacing multiples of 4: 8, 12, 16, 20, 24, 32px)
- Screen padding: 16px
- Card padding: 16px
- Border radius: Large 16px, Medium 8px, Small 4px
- Card shadow: `0px 4px 6px rgba(0,0,0,0.1)`

**Animation Timing:**
- Fast: 200ms
- Normal: 300ms
- Slow: 500ms
- Easing: ease-out (most animations)

---

## 8 Screens to Design

### 1. Splash Screen
- Full screen with gradient background (light to dark blue)
- Centered app logo (120px × 120px)
- App name below logo (28pt, bold, white)
- Animated loading spinner (blue)
- No navigation elements

### 2. Login Screen
- Safe area with 16px padding
- Header: Logo (60px) + Title "Welcome Back" (28pt) + Subtitle (16pt, gray)
- Email input: 48px height, icon (left), focus state = blue border + shadow
- Password input: 48px height, icon (left), show/hide toggle (right)
- Sign In button: Full width, 48px, brand blue, white text (16pt, bold)
- "Forgot password?" link: Right-aligned, 12pt, blue (14pt)
- Bottom section: "Don't have an account?" + "Sign up" link (blue)
- Spacing between elements: 16px
- Field errors shown below each input in red (12pt)
- Error banner at top for network errors (red background, white text)

### 3. Register Screen
- Similar layout to LoginScreen
- Header: "Create Account" (28pt) + Subtitle (16pt)
- Email input with validation:
  - Show "✓ Available" (green, 12pt) when unique
  - Show "✗ Email already used" (red, 12pt) when taken
- Password input with strength indicator:
  - Weak: Red "Weak password" (12pt)
  - Medium: Amber "Medium strength" (12pt)
  - Strong: Green "Strong password" (12pt)
- Confirm Password input with matching indicator:
  - Match: Green "✓ Passwords match" (12pt)
  - Mismatch: Red "✗ Passwords don't match" (12pt)
- Create Account button: Full width, 48px, brand blue
- Bottom: "Already have an account?" + "Sign in" link
- Small text: "By signing up, you agree to Terms & Privacy" (12pt, gray)

### 4. Dashboard Screen (Main Screen)
- **Header (Fixed, 56px):**
  - Left: WiFi icon + "Home WiFi" (16pt) + "Connected" (12pt, green)
  - Right: User avatar (40px circle) + chevron down
  - Background: White with subtle shadow
  - Padding: 12px horizontal, 8px vertical

- **Device List (Scrollable):**
  - Pull-to-refresh gesture at top
  - Empty state: Large icon + "No Devices Found" + "Connect to same WiFi" + Refresh button
  - Loading state: 3 skeleton card loaders with pulse animation

- **Device Card (Each Device):**
  - Full width minus 32px padding
  - Min height: 100px
  - Background: White
  - Border: 1px light gray
  - Radius: 12px
  - Padding: 16px
  - Margin bottom: 12px
  - Shadow: Subtle

  - **Card Layout:**
    - Row 1: Device name (16pt, bold) | Badges (right, 6px gap)
      - Status badge: Green "● Online", Gray "● Offline", Amber "● Unknown" (12pt)
      - Guest badge (guests only): "Guest" (11pt) slate #64748B on #F1F5F9, pill
      - Both badges show together - guest-ness and reachability are independent
    - Row 2: Device type (14pt, gray) - e.g., "iPhone 17 Pro"
    - Row 3: Battery icon + "Battery: 85%" (14pt)
      - Battery color: Green (80%+), Amber (20-80%), Red (<20%)
      - Omit this row entirely when the device reports no battery (desktops)
    - Row 4: "Last seen 2 min ago" (12pt, gray)
    - Row 5 (Spacer): 8px
    - Row 6: "Send Alert" button (full width, 40px)
      - Background: Brand blue (enabled) or gray (disabled)
      - Text: 14pt, bold, white
      - Disabled when offline, unknown, OR the device is a guest
      - Tap feedback: Scale down 0.98
    - Row 7 (guests only): Helper text (11pt, gray)
      - "Guests receive alerts but cannot send them"
      - Required. A greyed button with no explanation reads as a bug

  - **Card States:**
    - Online (owned): Green badge + enabled button + normal text
    - Online (guest): Green badge + Guest badge + disabled button + helper text
    - Offline: Gray badge + disabled gray button + grayed text
    - Unknown: Amber badge + disabled button (device left the network)
    - Loading: Show skeleton with pulse animation
    - Error: Show error overlay

  - **IMPORTANT - please show all of these:** the device list must include at
    least one guest device so the Guest badge, the disabled button and the
    helper text are all visible in the mockup. A realistic list is a mix:
    two owned devices (one online, one offline) and one online guest.

- **Refresh Button (if empty):**
  - Blue background, white text, 48px height
  - Centered in middle of screen

### 5. Alert Confirmation Modal
- **Appearance:**
  - Modal with darkened overlay (50% opacity black)
  - Dialog centered: width 80% (max 360px), radius 16px
  - Slide up animation from bottom (300ms)

- **Content:**
  - Title: "Send Alert?" (20pt, bold, black), padding 20px bottom
  - Device info card:
    - Device icon (32px)
    - Device name: "Samsung S24 Ultra" (16pt, bold)
    - Device type: "Android Phone" (14pt, gray)
    - WiFi: "Home-WiFi ✓" (14pt, green)
    - Background: Light gray, radius 8px, padding 16px
    - Margin bottom: 20px
  - Message: "This device will beep and vibrate" (14pt, dark gray)
  - Spacing: 20px bottom

- **Buttons (2 columns):**
  - Left: "Cancel" button (14pt, dark gray, light gray background, 44px height, radius 8px, width 45%)
  - Right: "Send Alert" button (14pt, bold, white, brand blue background, 44px height, radius 8px, width 45%)
  - Gap between: 10px
  - Padding bottom: 20px

- **States:**
  - Normal: Buttons ready to tap
  - Loading: Show spinner in Send button, disable both buttons
  - Success: Modal slides down (fade out), close
  - Error: Show error message below device info, keep modal open

### 6. Device Detail Screen
- **Header (56px):**
  - Back button (blue arrow, left, 24px)
  - Device name centered (20pt, bold)
  - Menu button (three dots, right, 24px)

- **Device Card (Expanded):**
  - Device icon/image if available (80px × 80px)
  - Device name: "Samsung S24 Ultra" (20pt, bold)
  - Device type: "Android Phone" (16pt, gray)
  - Device OS: "Android 14" (14pt, gray)
  - Spacing: 16px from top

- **Status Section:**
  - Status badge: "● Online" or "● Offline" (14pt)
  - Connected at: "Connected at: Home-WiFi" (14pt, gray)
  - Last seen: "Last seen: 2 minutes ago" (14pt, gray)
  - Margin bottom: 20px

- **Battery Section:**
  - Battery icon (animated, based on level, 32px)
  - "Battery: 85%" (16pt, bold)
  - Battery bar: Full width, color-coded (green/amber/red)
  - Estimate: "Fully charged in ~2 hours" (12pt, gray)
  - Margin bottom: 20px

- **Device Registration:**
  - "Registered: Aug 30, 2024" (12pt, gray)
  - "Device ID: abc123xyz789" (12pt, gray, copyable)
  - Margin bottom: 20px

- **Alert History Section:**
  - Title: "Alert History" (18pt, bold)
  - Empty state: "No alerts sent yet" (14pt, gray)
  - When populated: List items with timestamp + status
    - Timestamp: "Aug 30, 2024 at 2:30 PM" (12pt, gray)
    - Status: "✓ Delivered" (green, 12pt) or "✗ Failed" (red, 12pt)
    - Border between items: 1px, light gray
  - Max visible: 5 items (scroll if more)
  - "See all" link if more than 5
  - Margin top: 20px

- **Send Alert Button (Sticky at bottom):**
  - Full width (minus 16px padding)
  - 48px height
  - "Send Alert" (16pt, bold, white)
  - Brand blue background
  - Margin: 16px from bottom

- **Remove Device Button:**
  - Text only: "Remove Device" (14pt, red)
  - Centered, margin top 32px
  - Tap target: 44px height
  - Opens confirmation modal on tap

### 7. Settings Screen
- **Header (56px):** "Settings" (20pt, bold)
- **Account Section:**
  - Section title: "Account" (14pt, semi-bold, gray background row)
  - User Profile row: Avatar (48px) | Name (16pt, bold) | Email (14pt, gray) | Chevron
  - Change Password row: Lock icon | "Change Password" (16pt) | Chevron
  - Email Address row: Email icon | "Email: dev@example.com" (16pt) | Chevron
  - Each row: 56px height, 16px padding, 1px bottom border

- **Devices Section:**
  - Section title: "Devices" (14pt, semi-bold, gray background row)
  - Manage Devices row: Device icon | "Manage Devices" (16pt) | Badge "5" (blue) | Chevron
  - Help row: Question icon | "How to register device?" (16pt) | Chevron

- **Notifications Section:**
  - Section title: "Notifications" (14pt, semi-bold)
  - Push Notifications toggle: Bell icon | "Push Notifications" (16pt) | Toggle (right)
    - Description: "Receive alerts when devices found" (12pt, gray)
  - Sound toggle: Speaker icon | "Sound" (16pt) | Toggle (visible only if push enabled)
  - Vibration toggle: Vibration icon | "Vibration" (16pt) | Toggle (visible only if push enabled)

- **App Section:**
  - Section title: "App" (14pt, semi-bold)
  - Version row: Info icon | "Version" (16pt) | "1.0.0" (14pt, gray, right)
  - Check Updates row: Download icon | "Check for Updates" (16pt) | Chevron

- **About Section:**
  - Section title: "About" (14pt, semi-bold)
  - Terms row: "Terms of Service" (16pt) | Chevron
  - Privacy row: "Privacy Policy" (16pt) | Chevron

- **Logout Section:**
  - Button: Full width, 48px, "Log Out" (16pt, bold, red)
  - Background: Transparent with 1px red border
  - Margin top: 32px, margin bottom: 24px
  - Opens confirmation modal on tap

### 8. Error States & Alerts
- **Error Banner (Top):**
  - Red background (`#EF4444`)
  - White text (14pt, semi-bold)
  - X close button (white, 24px)
  - Padding: 12px horizontal, 10px vertical
  - Slide down animation (200ms)
  - Auto-dismiss: 5 seconds (or manual close)

- **Field Error Messages:**
  - Below input field
  - Red text (`#EF4444`, 12pt)
  - Margin top: 4px
  - Icon: X or !

- **Toast Notifications (Bottom):**
  - Dark gray background (semi-transparent)
  - White text (12pt)
  - Padding: 12px horizontal, 8px vertical
  - Radius: 8px
  - Position: Above safe area (bottom)
  - Auto-dismiss: 3 seconds
  - Types:
    - Success: Green checkmark + "Device alert sent!"
    - Error: Red X + "Failed to send alert"
    - Info: Info icon + "Device is offline"

- **Skeleton Loader (Loading State):**
  - Gray background (`#E5E7EB`)
  - Animated pulse (fade in/out, 1.5s cycle)
  - Shapes: Device icon circle (48px) + 3 text lines
  - Show 3 skeleton cards on initial load

---

## Reusable Components to Include

**Button Variants:**
- Primary (blue background, white text)
- Secondary (gray background, dark text)
- Danger (red background, white text)
- Text-only (no background, colored text)

**Button Sizes:**
- Large: 48px height
- Medium: 40px height
- Small: 36px height

**Button States:**
- Normal, Hover, Pressed (0.98 scale), Disabled, Loading

**Input Variants:**
- Text, Email, Password, Number
- States: Empty, Focused (blue border + shadow), Filled, Error, Success
- Icon support: Left & right icons
- Labels: Always visible above or inside

**Badge Variants:**
- Success (green): "● Online"
- Warning (amber): Battery warning
- Error (red): Error states
- Info (blue): Info states

**Card Component:**
- Padding: 16px (customizable)
- Border: 1px light gray
- Radius: 12px
- Shadow: Subtle
- Responsive: Full width on mobile

**Modal/Dialog:**
- Background: Darkened overlay (50% opacity)
- Dialog: Centered, width 80% (max 360px), radius 16px
- Animation: Slide up (300ms) / Fade out on close
- Dismissible: Tap overlay, close button, back button

**List Item:**
- Height: 56px (minimum tap target)
- Padding: 16px horizontal, 8px vertical
- Border: 1px bottom light gray
- Layout: Icon | Text | Value | Chevron

---

## Animation Requirements

**Screen Transitions:**
- Push (new screen): Slide right to left (250ms, ease-out)
- Pop (back): Slide left to right (250ms, ease-out)
- Modal: Slide up from bottom (300ms, ease-out)
- Fade: Crossfade (200ms, ease-in-out)

**Tap Feedback:**
- Scale: 0.98 on press
- Duration: 100ms
- Haptic: Light impact (iOS), 50ms vibration (Android)

**Loading Animations:**
- Spinner: Continuous rotation (1s per rotation)
- Skeleton: Pulse fade in/out (1.5s cycle)
- Pull to refresh: Spinner + bounce animation

**Gesture Feedback:**
- Tap: Visual feedback (scale down 0.98)
- Long press: Scale 1.05
- Swipe: Proportional translation
- Pull to refresh: Spinner rotation + bounce

---

## Accessibility Requirements

**Contrast Ratios:**
- All text: Minimum 4.5:1 contrast (WCAG AA)
- Large text (18pt+): Minimum 3:1 contrast
- Focus indicators: 2px blue outline on all interactive elements

**Touch Targets:**
- Minimum 48px × 48px for all interactive elements
- 8px spacing between targets

**Color Independence:**
- Don't rely on color alone (e.g., red for error)
- Use icon + text + color
- Example: Red icon + "✗" symbol + "Error" text

---

## Responsive Design

**Mobile-First (320px - 480px):**
- Full-width components
- Single column layout
- Touch-friendly buttons (48px minimum)

**Tablet (481px - 768px - Future):**
- Two-column layouts where appropriate
- Larger card sizes
- Side navigation (optional)

**Desktop (769px+ - Mac/Windows):**
- Multi-column layouts
- Keyboard shortcuts
- Mouse-friendly interactions

---

## Design Deliverables

Please create:
1. ✅ All 8 screen mockups (high-fidelity)
2. ✅ Component library (button, input, badge, card, modal, etc)
3. ✅ Design system documentation (colors, typography, spacing)
4. ✅ Interaction specifications (hover states, animations, transitions)
5. ✅ Responsive layouts (mobile, tablet, desktop)
6. ✅ Dark mode variants (optional for Phase 2)
7. ✅ Design tokens exported for developers

---

## Success Criteria

After design is complete:
- ✅ All 8 screens fully designed & interactive
- ✅ Consistent use of design system
- ✅ All animations specified with timing
- ✅ Accessibility standards met (WCAG AA)
- ✅ Components reusable across screens
- ✅ Design tokens ready for development
- ✅ Responsive layouts for all screen sizes

---

## Notes

- Use the exact color codes provided (do not substitute)
- Follow typography hierarchy (no exceptions)
- Maintain 16px base padding on all screens
- All interactive elements: minimum 48px height
- Smooth animations: 60fps target
- Test for accessibility (contrast, touch targets, screen readers)

---

**End of Prompt**

This is a complete, production-ready design brief. Good luck creating! 🎨

