# BeepMyDevice - Complete UI/UX Design Specification

## Project Context

**App Name:** BeepMyDevice  
**Type:** Cross-platform WiFi device finder (iOS, Android, Mac, Windows)  
**Purpose:** Find and alert devices on same home WiFi regardless of account  
**Tech:** React Native + TypeScript  
**Target Users:** Families, roommates, small offices  
**Design Approach:** Clean, modern, intuitive (minimal friction for finding lost devices)

---

## Design System & Theme

### Color Palette

**Primary Colors:**
- **Brand Blue:** `#2563EB` (primary actions, brand elements)
- **Success Green:** `#10B981` (online status, success states)
- **Warning Amber:** `#F59E0B` (battery warning, offline)
- **Error Red:** `#EF4444` (error states, failed operations)

**Neutral Colors:**
- **White:** `#FFFFFF` (backgrounds)
- **Light Gray:** `#F3F4F6` (secondary backgrounds, borders)
- **Medium Gray:** `#D1D5DB` (disabled states, borders)
- **Dark Gray:** `#4B5563` (text, secondary text)
- **Black:** `#000000` (primary text)

**Semantic Colors:**
- **Online:** `#10B981` (green badge)
- **Offline:** `#9CA3AF` (gray badge)
- **Unknown:** `#F59E0B` (amber badge - device left the network)
- **Charging:** `#3B82F6` (blue icon)
- **Low Battery:** `#F59E0B` (amber warning)
- **Guest:** `#64748B` on `#F1F5F9` (slate pill)
  - Neutral by design. A guest is a normal participant, not a warning, so it
    must not borrow the amber or red used for problems.

### Typography

**Font Family:** System fonts (SF Pro Display for iOS, Roboto for Android)

**Font Sizes:**
- **Extra Large (Display):** 32pt - Section titles
- **Large (Heading 1):** 28pt - Screen titles
- **Medium-Large (Heading 2):** 20pt - Section headers
- **Medium (Heading 3):** 18pt - Subsection headers
- **Regular (Body):** 16pt - Main text
- **Small (Body Small):** 14pt - Secondary text, labels
- **Extra Small (Caption):** 12pt - Helper text, timestamps

**Font Weights:**
- Bold (700) - Headings, CTA buttons
- Semi-bold (600) - Secondary headings, emphasis
- Regular (400) - Body text
- Light (300) - Tertiary text, disabled states

### Spacing & Layout

**Base Unit:** 4px (scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64)

**Common Spacing:**
- Screen padding: 16px
- Section gap: 20px
- Card padding: 16px
- Component spacing: 12px
- Icon spacing: 8px

**Breakpoints:**
- Mobile: 320px - 480px
- Tablet: 481px - 768px (future consideration)
- Desktop: 769px+ (Windows/Mac)

### Border Radius

- Large (modals, cards): 16px
- Medium (buttons, inputs): 8px
- Small (badges, icons): 4px

### Shadows

- Subtle: `0px 1px 2px rgba(0,0,0,0.05)`
- Small: `0px 1px 3px rgba(0,0,0,0.1)`
- Medium: `0px 4px 6px rgba(0,0,0,0.1)`
- Large: `0px 10px 15px rgba(0,0,0,0.1)`

---

## Screen Specifications

### 1. Splash Screen (Initial Load)

**Purpose:** Show app logo while checking authentication status

**Layout:**
- Full screen with brand color gradient (light to darker blue)
- Centered app logo (2x scale)
- Subtle loading indicator below logo
- App name below indicator

**Components:**
- Logo image (centered, 120px x 120px)
- Loading spinner (animated, blue)
- App name text (28pt, bold, white)

**States:**
- Loading (show spinner, lock interaction)
- Timeout (show retry button after 10s)

**Navigation:**
- If logged in → DashboardScreen
- If logged out → LoginScreen

**Transitions:**
- Fade in logo over 500ms
- Spinner starts after 300ms
- Smooth transition to next screen

---

### 2. Auth Stack - Login Screen

**Purpose:** Allow users to enter email and password

**Layout:**
- Safe area top padding
- Centered form with maximum 400px width
- Header with app logo and title
- Email input field
- Password input field
- Login button (full width)
- Forgot password link
- Sign up link at bottom

**Header Section:**
- Logo (60px x 60px, centered)
- Title: "Welcome Back" (28pt, bold)
- Subtitle: "Sign in to find your devices" (16pt, gray)
- Spacing: 32px from top

**Email Input:**
- Label: "Email" (12pt, semi-bold, dark gray)
- Placeholder: "you@example.com"
- Icon: Email icon (left side, 16px)
- Border: 1px, light gray
- Radius: 8px
- Padding: 12px (left/right), 14px (top/bottom)
- Height: 48px
- Focus state: Blue border (2px), brand blue shadow
- Error state: Red border (2px), error red text below
- Error message: 12pt, red, margin top 4px

**Password Input:**
- Label: "Password" (12pt, semi-bold, dark gray)
- Placeholder: "••••••••"
- Icon: Lock icon (left side, 16px)
- Show/hide toggle (right side, eye icon)
- Border: 1px, light gray
- Radius: 8px
- Padding: 12px (left/right), 14px (top/bottom)
- Height: 48px
- Focus state: Blue border (2px), brand blue shadow
- Error state: Red border (2px), error red text below

**Spacing Between Fields:** 16px

**Login Button:**
- Label: "Sign In" (16pt, bold, white)
- Background: Brand blue (`#2563EB`)
- Width: Full width (minus padding)
- Height: 48px
- Radius: 8px
- Margin top: 24px
- Normal state: Blue background
- Pressed state: Darker blue (0.8 opacity)
- Disabled state: Gray background, gray text
- Loading state: Show spinner inside button, disable interaction

**Forgot Password Link:**
- Text: "Forgot password?" (14pt, brand blue)
- Margin top: 12px
- Text alignment: right
- Tap target: 48px height (full width)

**Sign Up Section:**
- Text: "Don't have an account?" (14pt, dark gray)
- Link: "Sign up" (14pt, bold, brand blue)
- Alignment: Centered
- Margin top: 32px
- Border top: 1px, light gray
- Padding top: 24px

**Error States:**
- Show error banner at top (red background, white text) for network errors
- Field-level errors below each input (red text, 12pt)
- Auto-dismiss after 5 seconds (banner)
- Persist until user fixes (field errors)

**Success State:**
- Show brief success message before navigating
- Navigate to DashboardScreen

**Keyboard Behavior:**
- Next button (iOS): Move to password field
- Done button (iOS): Submit form
- Return key (Android): Submit form
- Safe area: Keyboard aware (shift content up)

---

### 3. Auth Stack - Register Screen

**Purpose:** Allow new users to create account

**Layout:**
- Similar to LoginScreen but with 3 input fields
- Header with title "Create Account"
- Email input
- Password input
- Confirm password input
- Register button
- Already have account link

**Header Section:**
- Logo (60px x 60px, centered)
- Title: "Create Account" (28pt, bold)
- Subtitle: "Start finding your devices" (16pt, gray)
- Spacing: 32px from top

**Email Input:**
- Same specs as LoginScreen email field
- Validation: Real-time check for existing account
- Show: "✓ Available" (green, 12pt) when unique
- Show: "✗ Email already used" (red, 12pt) when taken

**Password Input:**
- Same specs as LoginScreen password field
- Show password strength indicator:
  - Weak: Red "Weak password" (12pt, red)
  - Medium: Amber "Medium strength" (12pt, amber)
  - Strong: Green "Strong password" (12pt, green)
- Minimum 8 characters required

**Confirm Password Input:**
- Label: "Confirm Password" (12pt, semi-bold)
- Placeholder: "••••••••"
- Show matching indicator:
  - Match: Green "✓ Passwords match" (12pt, green)
  - Mismatch: Red "✗ Passwords don't match" (12pt, red)

**Register Button:**
- Label: "Create Account" (16pt, bold, white)
- Background: Brand blue
- Same specs as LoginScreen sign in button
- Loading state: Show spinner

**Login Link Section:**
- Text: "Already have an account?" (14pt, dark gray)
- Link: "Sign in" (14pt, bold, brand blue)
- Alignment: Centered
- Margin top: 32px
- Border top: 1px, light gray
- Padding top: 24px

**Terms Acceptance:**
- Small text below register button (12pt, gray)
- "By signing up, you agree to our Terms & Privacy"
- Links in blue (brand blue, underlined)

---

### 4. App Stack - Dashboard Screen (Main Screen)

**Purpose:** Show all connected devices and allow alert sending

**Layout:**
- Safe area with 16px padding
- Status bar with WiFi info and user profile
- Search/filter bar (optional, expandable)
- Device list with real-time updates
- Action sheets when device tapped

**Header Section (Fixed):**
- Row 1: WiFi info (left), User menu (right)
  - WiFi: WiFi icon + "Home WiFi" (16pt) + "Connected" (12pt, green)
  - User menu: User avatar (40px) + chevron down
  - Height: 56px
  - Background: White with subtle bottom shadow
  - Padding: 12px horizontal, 8px vertical

**Search/Filter Bar (Optional):**
- Magnifying glass icon (left)
- Placeholder: "Search devices..."
- Filter button (right) - future feature
- Sticky position (scrolls with content)
- Height: 44px
- Margin: 0 16px, vertical spacing 12px

**Device List:**
- Scrollable section
- Each device is a card (see DeviceCard component below)
- Vertical spacing: 12px between cards
- List refreshes real-time via WebSocket
- Pull-to-refresh gesture (refresh device list)

**DeviceCard Component:**
- Width: Full screen minus padding (100% - 32px)
- Height: Auto (minimum 100px)
- Background: White
- Border: 1px, light gray
- Radius: 12px
- Padding: 16px
- Margin bottom: 12px
- Shadow: Subtle (`0px 1px 3px rgba(0,0,0,0.1)`)

**Card Layout:**
- Row 1: Device info (left), Badges (right)
  - Device name (16pt, bold, black)
  - Device type (14pt, gray) - e.g., "iPhone 17 Pro"
  - Badges (right side, horizontal, 6px gap):
    - Status badge:
      - Online: Green badge with "●" + "Online" (12pt, green)
      - Offline: Gray badge with "●" + "Offline" (12pt, gray)
      - Unknown: Amber badge with "●" + "Unknown" (12pt, amber)
    - Guest badge (only when `is_guest`):
      - Text: "Guest" (11pt, medium)
      - Color: Slate `#64748B` on `#F1F5F9`
      - Radius: pill, padding 2px 8px
      - Deliberately neutral, not a warning color - a guest is a normal
        participant, not a problem
    - Both badges appear together. Guest-ness and reachability are independent:
      a guest is still online, offline or unknown like any other device.

- Row 2: Battery level (left)
  - Battery icon + percentage (14pt, dark gray)
  - Color changes based on level:
    - > 50%: Green
    - 20-50%: Amber
    - < 20%: Red
  - Icon: Battery icon that fills based on percentage

- Row 3: Timestamp (left)
  - "Last seen 2 min ago" (12pt, gray)
  - Updated real-time

- Row 4 (Spacer): 8px

- Row 5: Send Alert Button (full width)
  - Button: "Send Alert" (14pt, bold, white)
  - Background: Brand blue (when enabled), gray (when disabled)
  - Height: 40px
  - Radius: 6px
  - Disabled when the device is OFFLINE, UNKNOWN, **or a guest**
  - Guest devices: button reads "Send Alert" but greyed, with helper text
    below it (11pt, gray): "Guests receive alerts but cannot send them"
    - The helper text matters. A greyed button with no explanation reads as a
      bug; the label turns it into an understood rule.
  - Offline/unknown devices: greyed with no helper text - the status badge
    directly above already explains it
  - Border: None
  - Disabled: True when device offline
  - Press state: Darker blue with animation (scale down 0.98)
  - Tap feedback: Haptic feedback (light impact)

**Card States:**
- Normal: White background, gray border
- Online: Green status badge, blue button enabled
- Offline: Gray background (slight opacity), gray status badge, gray button disabled
- Loading: Show skeleton loader (gray animation)
- Error: Show error message overlay
- Low Battery: Battery icon turns red, show warning

**Empty State (No Devices):**
- Centered in middle of screen
- Icon: Smartphone icon (large, 64px, light gray)
- Title: "No Devices Found" (20pt, bold, dark gray)
- Subtitle: "Connect to same WiFi to see devices" (14pt, gray)
- Button: "Refresh" (blue, 14pt)
- Height: Full screen minus header

**Loading State (Initial Load):**
- Show 3 skeleton cards (gray animated placeholders)
- Each skeleton: 100px height, rounded corners
- Animate with fade in/out pulse

**Error State (Connection Failed):**
- Show error banner at top (red background)
- Message: "Failed to load devices" (14pt, white)
- Retry button (white text, 12pt)
- Dismiss button (X icon, white)

**Pull to Refresh:**
- Drag from top to refresh
- Show spinner while loading
- Animate back to top when complete

**Device List Behavior:**
- Real-time updates via WebSocket
- Smooth additions/removals (fade in/out)
- Sorting: By status (online first), then by name
- Grouping: Optional (future) - Family, Rooms, etc

---

### 5. Send Alert Modal/Dialog

**Purpose:** Confirm before sending alert

**Appearance:**
- Modal that appears when device card "Send Alert" button tapped
- Darkened background overlay (50% opacity black)
- Dialog centered on screen
- Width: 80% of screen (max 360px)
- Radius: 16px
- Animation: Slide up from bottom (300ms ease-out)

**Content:**
- Header
  - Title: "Send Alert?" (20pt, bold, black)
  - Padding: 20px bottom

- Device Info
  - Device icon (32px)
  - Device name: "Samsung S24 Ultra" (16pt, bold)
  - Device type: "Android Phone" (14pt, gray)
  - WiFi: "Home-WiFi" with checkmark (14pt, green)
  - Padding: 16px all sides
  - Background: Light gray
  - Radius: 8px
  - Margin bottom: 20px

- Message
  - "This device will beep and vibrate" (14pt, dark gray)
  - Margin bottom: 20px

- Buttons (2 columns)
  - Left button: "Cancel" (14pt, dark gray)
    - Background: Light gray
    - Height: 44px
    - Radius: 8px
    - Width: 45%
  
  - Right button: "Send Alert" (14pt, bold, white)
    - Background: Brand blue
    - Height: 44px
    - Radius: 8px
    - Width: 45%
  
  - Gap between buttons: 10px
  - Padding: 20px bottom

**States:**
- Normal: Buttons ready
- Loading: "Send Alert" button shows spinner, disable both buttons
- Success: Modal closes smoothly
- Error: Show error message below device info, keep modal open

**Dismiss Actions:**
- Tap Cancel button
- Tap overlay (outside dialog)
- Press back button (Android)
- Swipe down (iOS, optional)

---

### 6. Device Detail Screen

**Purpose:** Show detailed information about single device

**Layout:**
- Safe area with 16px padding
- Header with back button and device title
- Device card (larger version)
- Device info section
- Alert history section
- Remove device button

**Header:**
- Row 1: Back button (left), Device name (center), Menu (right)
  - Back button: Blue arrow, 24px
  - Device name: "Samsung S24 Ultra" (20pt, bold)
  - Menu button: Three dots, 24px (future feature)
  - Height: 56px

**Device Card (Expanded):**
- Device icon/image (if available, 80px x 80px)
- Device name: "Samsung S24 Ultra" (20pt, bold)
- Device type: "Android Phone" (16pt, gray)
- Device OS: "Android 14" (14pt, gray)

- Status Section:
  - Row 1: Status (Online/Offline/Unknown with colored badge)
    - Guest badge sits beside it when `is_guest` - same slate pill as the card
  - Row 2: "Connected at: Home-WiFi" (14pt, gray)
  - Row 3: "Last seen: 2 minutes ago" (14pt, gray)
  - Row 4 (guests only): Access line (14pt, gray)
    - "Access: Guest - receives alerts, cannot send them"
    - Explains the greyed button below before the user reaches it

- Battery Section:
  - Battery icon (animated, based on level)
  - "Battery: 85%" (16pt, bold)
  - Battery bar (full width, blue/green/amber/red based on level)
  - "Fully charged in ~2 hours" (12pt, gray)

- Device Registration:
  - "Registered: Aug 30, 2024" (12pt, gray)
  - "Device ID: abc123xyz789" (12pt, gray) - copyable
  - Owned devices: "Owner: dev@example.com" (12pt, gray)
  - Guest devices: "Owner: none (guest device)" (12pt, gray)
    - Never leave the owner row blank for a guest. An empty field reads as
      missing data; the explicit "none" reads as a fact.

**Alert History Section:**
- Title: "Alert History" (18pt, bold)
- Empty state: "No alerts sent yet" (14pt, gray)
- When populated:
  - List of alerts (see alert item below)
  - Scrollable within section (max 5 visible)
  - "See all" link if more than 5

**Alert Item:**
- Timestamp: "Aug 30, 2024 at 2:30 PM" (12pt, gray)
- Status: "✓ Delivered" (green, 12pt) or "✗ Failed" (red, 12pt)
- No padding, just 1px border between items

**Send Alert Button (Sticky):**
- Full width (minus padding)
- Height: 48px
- "Send Alert" (16pt, bold, white)
- Background: Brand blue
- Position: Fixed at bottom (above safe area)
- Margin: 16px
- Tap feedback: Haptic
- Disabled for guests, and for OFFLINE/UNKNOWN devices
  - Guests: greyed, with helper text above (12pt, gray):
    "Guests receive alerts but cannot send them"
  - Never hide the button entirely. A missing control is confusing; a disabled
    control with a reason teaches the rule.

**Remove Device Button:**
- Text only: "Remove Device" (14pt, red)
- Alignment: Center
- Margin top: 32px
- Margin bottom: 24px (above safe area)
- Available for guests too - removing an unrecognised guest is the admin's
  control over open registration, so it must be easy to reach
- Tap target: 44px height

**Remove Confirmation:**
- When tapped, show modal dialog
- Title: "Remove Device?"
- Message: "This device will no longer receive alerts from this WiFi"
- Buttons: Cancel (gray), Remove (red)

---

### 7. Settings Screen

**Purpose:** Manage account and app settings

**Layout:**
- Safe area with 16px padding
- Navigation header: "Settings" (20pt, bold)
- Settings sections in groups
- Each section has title, items, and spacing

**Account Section:**
- Title: "Account" (14pt, semi-bold, gray background row)

- User Profile Row:
  - Avatar: 48px circle
  - Name: "Devinder Singh" (16pt, bold)
  - Email: "dev@example.com" (14pt, gray)
  - Chevron: Right arrow
  - Tap: Go to EditProfileScreen (future)

- Change Password Row:
  - Icon: Lock icon (left)
  - Text: "Change Password" (16pt, black)
  - Chevron: Right arrow
  - Tap: Go to ChangePasswordScreen (future)

- Email Address Row:
  - Icon: Email icon (left)
  - Text: "Email: dev@example.com" (16pt, black)
  - Chevron: Right arrow
  - Tap: Go to EditEmailScreen (future)

**Devices Section:**
- Title: "Devices" (14pt, semi-bold, gray background row)

- Manage Devices Row:
  - Icon: Smartphone icon (left)
  - Text: "Manage Devices" (16pt, black)
  - Badge: "5" (blue badge, 12pt)
  - Chevron: Right arrow
  - Tap: Go to ManageDevicesScreen (future)

- Device Registration Help:
  - Icon: Question mark icon (left)
  - Text: "How to register device?" (16pt, black)
  - Chevron: Right arrow
  - Tap: Show help sheet

**Notifications Section:**
- Title: "Notifications" (14pt, semi-bold, gray background row)

- Push Notifications Toggle:
  - Icon: Bell icon (left)
  - Text: "Push Notifications" (16pt, black)
  - Toggle: Right side (on/off)
  - Description below: "Receive alerts when devices found" (12pt, gray)

- Sound Toggle:
  - Icon: Speaker icon (left)
  - Text: "Sound" (16pt, black)
  - Toggle: Right side (on/off)
  - Visible only if push is enabled

- Vibration Toggle:
  - Icon: Vibration icon (left)
  - Text: "Vibration" (16pt, black)
  - Toggle: Right side (on/off)
  - Visible only if push is enabled

**App Section:**
- Title: "App" (14pt, semi-bold, gray background row)

- App Version:
  - Icon: Info icon (left)
  - Text: "Version" (16pt, black)
  - Value: "1.0.0" (14pt, gray, right)

- Check for Updates:
  - Icon: Download icon (left)
  - Text: "Check for Updates" (16pt, black)
  - Chevron: Right arrow
  - Tap: Check app store

**About Section:**
- Title: "About" (14pt, semi-bold, gray background row)

- Terms of Service:
  - Text: "Terms of Service" (16pt, black)
  - Chevron: Right arrow
  - Tap: Open in browser

- Privacy Policy:
  - Text: "Privacy Policy" (16pt, black)
  - Chevron: Right arrow
  - Tap: Open in browser

**Logout Section:**
- Logout Button:
  - Full width
  - Height: 48px
  - Text: "Log Out" (16pt, bold, red)
  - Background: Light red / transparent
  - Border: 1px red
  - Margin top: 32px
  - Margin bottom: 24px

**Logout Confirmation:**
- Modal dialog
- Title: "Log Out?"
- Message: "Are you sure you want to log out?"
- Buttons: Cancel (gray), Log Out (red)

**Setting Item Structure (Reusable):**
- Height: 56px
- Horizontal padding: 16px
- Vertical padding: 8px
- Border bottom: 1px, light gray
- Flex layout: Icon | Text/Description | Value/Toggle | Chevron

---

### 8. Error States & Alerts

**Error Banner (Top of Screen):**
- Background: Error red (`#EF4444`)
- Text color: White (14pt, semi-bold)
- Close button: X icon (white)
- Padding: 12px horizontal, 10px vertical
- Animation: Slide down from top (200ms)
- Auto-dismiss: 5 seconds (if no interaction)
- Dismissible: Tap X or banner swipe up

**Common Errors:**
- "Failed to load devices. Please try again."
- "Unable to send alert. Device offline."
- "Network connection lost."
- "Authentication failed. Please log in again."
- "Push notification permission denied."

**Field Error Messages:**
- Below input field
- Color: Error red (`#EF4444`)
- Font size: 12pt
- Margin top: 4px
- Icon: X or ! (optional)

**Toast Notifications:**
- Bottom of screen (above safe area)
- Background: Dark gray (semi-transparent)
- Text: White (12pt)
- Padding: 12px horizontal, 8px vertical
- Radius: 8px
- Auto-dismiss: 3 seconds

**Toast Types:**
- Success: "Device alert sent!" (green checkmark)
- Error: "Failed to send alert" (red X)
- Info: "Device is offline" (info icon)

---

### 9. Loading States & Skeletons

**Skeleton Loader (Device Card):**
- Gray background (#E5E7EB)
- Animated pulse (fade in/out, 1.5s cycle)
- Shapes:
  - Device icon: 48px circle
  - Device name line: 100% width, 16px height
  - Device type line: 70% width, 14px height
  - Battery line: 80% width, 14px height
  - Button: Full width, 40px height

**Full Page Skeleton:**
- Show 3 skeleton cards
- Staggered animation (150ms between each)

**Inline Loading:**
- Small spinner (16px) next to button
- Button text changes to loading indicator
- Disable button interaction

---

### 10. Color & State Combinations

**Device Status Colors:**
- Online: Green badge + blue send button + normal text
- Offline: Gray badge + gray send button (disabled) + grayed out text
- Loading: Gray background with skeleton + no interaction
- Error: Red banner above + normal card below

**Battery Level Colors:**
- 80-100%: Green icon + text
- 50-80%: Teal icon + text
- 20-50%: Amber/yellow icon + text (warning)
- 0-20%: Red icon + text (critical)

**Button States:**
- Normal: Full color, cursor pointer
- Hover (desktop): Darker shade, cursor pointer
- Pressed: Scale 0.98, darker shade, haptic feedback
- Disabled: Gray background, gray text, cursor not-allowed
- Loading: Spinner inside, button disabled

**Input States:**
- Empty: Light gray border, placeholder text
- Focused: Brand blue border (2px), blue shadow
- Filled: Dark gray border, input value
- Error: Red border (2px), red error text below
- Success: Green border (1px), green checkmark icon

---

## Component Library (Reusable)

### Basic Components

**Button:**
- Variants: Primary (blue), Secondary (gray), Danger (red), Text-only
- Sizes: Large (48px), Medium (40px), Small (36px)
- States: Normal, Hover, Pressed, Disabled, Loading
- Always accessible (min 48px tap target)

**Input:**
- Variants: Text, Email, Password, Number
- States: Empty, Focused, Filled, Error, Success
- Icons: Left & right icon support
- Labels: Always visible above or inside

**Toggle:**
- Variants: On/Off switch
- Size: 48px width x 28px height
- Animation: Smooth slide (200ms)
- Accessible: Full keyboard support

**Badge:**
- Variants: Success (green), Warning (amber), Error (red), Info (blue),
  Neutral (slate - used for Guest)
- Sizes: Small (14pt), Medium (16pt)
- Optional icon + text
- Optional close button

**GuestBadge:**
- Text: "Guest" (11pt, medium)
- Color: `#64748B` on `#F1F5F9`, pill radius, 2px 8px padding
- Renders nothing when the device is not a guest
- Sits beside StatusBadge, never replacing it - a guest is still online,
  offline or unknown, so the card shows both facts

**Card:**
- Padding: 16px (customizable)
- Border: 1px, light gray
- Radius: 12px
- Shadow: Subtle
- Responsive: Full width on mobile

**Modal:**
- Background: Darkened overlay (50% opacity)
- Dialog: Centered, width 80% (max 360px)
- Radius: 16px
- Animation: Slide up (300ms)
- Dismissible: Tap overlay, close button

**List Item:**
- Height: 56px (minimum tap target)
- Padding: 16px horizontal, 8px vertical
- Border: 1px bottom, light gray
- Flex layout: Icon | Text | Value | Chevron

---

## Interaction Patterns

### Animations

**Screen Transitions:**
- Push (new screen): Slide right to left (250ms, ease-out)
- Pop (back): Slide left to right (250ms, ease-out)
- Modal: Slide up from bottom (300ms, ease-out)
- Fade: Crossfade (200ms, ease-in-out) for loading states

**Gesture Feedback:**
- Tap: Visual feedback (0.98 scale, haptic light impact)
- Long press: Scale 1.05, haptic medium impact (future)
- Swipe: Proportional translation
- Pull to refresh: Spinner rotation + bounce

**Loading Animations:**
- Spinner: Continuous rotation (1s per rotation)
- Skeleton: Pulse fade in/out (1.5s cycle)
- Progress: Smooth linear animation

### Haptic Feedback

**iOS:**
- Light: Tap actions, swipe gestures
- Medium: Send alert button, delete confirmation
- Heavy: Error states

**Android:**
- Vibration: 50ms for light, 100ms for medium
- Pattern: Single pulse for actions
- Long pattern for errors

### Keyboard Behavior

**iOS:**
- Auto dismiss: Tap outside, swipe down
- Next button: Move to next field
- Done button: Submit form
- Safe area: Content shifts up with keyboard

**Android:**
- Auto dismiss: Back button, tap outside
- Next IME action: Move to next field
- Done IME action: Submit form
- Safe area: Content shifts up with keyboard

---

## Accessibility

### Contrast & Readability

- All text: Minimum 4.5:1 contrast ratio (WCAG AA)
- Large text (18pt+): Minimum 3:1 contrast ratio
- Focus indicators: Blue outline (2px) on all interactive elements
- Font sizes: Minimum 14pt for body text (readable without zoom)

### Touch Targets

- Minimum 48px x 48px for all interactive elements
- Buttons, links, inputs: At least 48px height
- Spacing between targets: Minimum 8px

### Screen Reader Support

- All images: Alt text or hidden if decorative
- Buttons: Clear labels (not just icons)
- Forms: Labels associated with inputs
- Headings: Proper hierarchy (H1, H2, H3)
- Lists: Semantic markup
- Error messages: Associated with inputs

### Color Independence

- Don't rely on color alone (red = error)
- Use icons, text, patterns too
- Guest badge carries the word "Guest", never colour alone - the slate pill is
  close enough to the offline grey that colour by itself would not distinguish
  "not signed in" from "not reachable", which are unrelated facts
- A disabled alert button always pairs with a reason: helper text for guests,
  the status badge for offline and unknown devices
- Example: Red icon + "✗" symbol + "Error" text

### Dark Mode Support (Future)

- Define colors in light/dark pairs
- Example: Light gray (light) ↔ Dark gray (dark)
- Backgrounds: White (light) ↔ Near-black (dark)
- Text: Black (light) ↔ White (dark)

---

## Responsive Design

### Mobile-First Approach

- Design for 320px (smallest) to 480px (largest phone)
- Touch-friendly: Large buttons, spacious layout
- Single column layout
- Full-width components

### Tablet (Future Phase 2)

- 481px to 768px
- Two-column layouts where appropriate
- Larger card sizes
- Side navigation (optional)

### Desktop (Mac/Windows)

- 769px and above
- Multi-column layouts
- Keyboard shortcuts
- Mouse-friendly interactions

---

## Visual Hierarchy

**Primary Elements:**
- Screen titles: 28pt, bold, black
- Section headers: 20pt, semi-bold, black
- Interactive: Brand blue, 48px+ height
- Immediate action needed: Error red

**Secondary Elements:**
- Body text: 16pt, regular, dark gray
- Labels: 14pt, regular, dark gray
- Helper text: 12pt, regular, gray

**Tertiary Elements:**
- Captions: 12pt, light, gray
- Timestamps: 12pt, light, gray
- Disabled: Gray, reduced opacity

---

## Data Visualization

**Device Status:**
- Visual: Colored badge (●) + text
- Online: Green badge + "Online"
- Offline: Gray badge + "Offline"
- Loading: Pulsing gray + "Connecting..."

**Battery Level:**
- Visual: Battery icon + percentage
- Icon style: Fills based on percentage (0-100%)
- Color: Green (80%+), Amber (20-80%), Red (<20%)
- Text: "Battery: 85%"

**Real-Time Updates:**
- New device: Fade in from top with animation
- Device removed: Fade out with animation
- Status change: Update badge color instantly
- Battery change: Update icon/percentage smoothly

---

## Navigation Flow

```
SplashScreen
  ├─→ LoginScreen
  │    ├─→ RegisterScreen
  │    └─→ DashboardScreen (on success)
  │
  └─→ DashboardScreen (if already logged in)
       ├─→ Device Card → AlertModal
       ├─→ Device Card → DeviceDetailScreen
       ├─→ Settings Icon → SettingsScreen
       │    ├─→ Profile Edit (future)
       │    ├─→ Change Password (future)
       │    ├─→ Manage Devices (future)
       │    └─→ App Info
       │
       └─→ Logout → LoginScreen
```

---

## Design Tokens (Summary)

```
Colors:
  Primary: #2563EB
  Success: #10B981
  Warning: #F59E0B
  Error: #EF4444
  Text Dark: #000000
  Text Gray: #4B5563
  Background: #FFFFFF
  Surface: #F3F4F6
  Border: #D1D5DB

Typography:
  Display: 32pt, bold
  Heading1: 28pt, bold
  Heading2: 20pt, semi-bold
  Body: 16pt, regular
  Small: 14pt, regular
  Caption: 12pt, regular

Spacing:
  Base: 4px
  Common: 8, 12, 16, 20, 24, 32px

Radius:
  Large: 16px
  Medium: 8px
  Small: 4px

Shadows:
  Subtle: 0px 1px 2px rgba(0,0,0,0.05)
  Small: 0px 1px 3px rgba(0,0,0,0.1)
  Medium: 0px 4px 6px rgba(0,0,0,0.1)

Timing:
  Fast: 200ms
  Normal: 300ms
  Slow: 500ms
```

---

## Design Considerations

### Performance

- Minimize animations on low-end devices
- Lazy load device images (if added)
- Smooth 60fps animations
- Optimize image sizes

### Battery Life

- Avoid heavy animations
- Use native device capabilities efficiently
- Minimize background processes
- Test on real devices

### Network

- Graceful handling of slow connections
- Show loading states immediately
- Allow offline viewing (cached data)
- Retry mechanisms with backoff

### Usability

- Minimize taps to perform action
- Clear error messages (not tech jargon)
- Undo/confirmation for destructive actions
- Consistent interaction patterns

---

## Design Files & Assets

### Required Assets

- App icon (1024x1024px)
- Splash screen image
- Device icons (iPhone, Android, Mac, Windows, Tablet)
- Status icons (Online, Offline, Charging, Battery levels)
- Navigation icons (Settings, Profile, Back, Menu)
- System icons (WiFi, Lock, Eye, Search, etc)

### Color Specifications

- All colors in RGB format (not hex)
- Define light and dark variants
- Provide Figma/design file with components

---

## Success Criteria

After design implementation:

✅ All 8 main screens designed  
✅ All components specified  
✅ Responsive layouts defined  
✅ Accessibility standards met  
✅ Animation timings specified  
✅ Color palette defined  
✅ Typography hierarchy clear  
✅ Interaction patterns documented  
✅ Design tokens created  
✅ Asset list prepared  

---

## Guest Devices

A guest is someone who opened BeepMyDevice on the network without signing in.
They auto-register: no login, no approval, no setup. They appear in the admin's
list straight away and can be alerted like anyone else. What they cannot do is
send alerts.

### What the user sees

| Surface | Owned device | Guest device |
|---|---|---|
| Card badges | Status only | Status + "Guest" pill |
| Card alert button | Enabled when online | Always greyed, with helper text |
| Detail owner row | "Owner: dev@example.com" | "Owner: none (guest device)" |
| Detail access row | not shown | "Access: Guest - receives alerts, cannot send them" |
| Detail alert button | Enabled when online | Greyed, helper text above |
| Remove device | Available | Available |

### Design rules

**Never hide the disabled button.** A missing control confuses; a disabled
control with a stated reason teaches the rule. Every greyed alert button on a
guest card carries "Guests receive alerts but cannot send them".

**Guest is not a warning.** The slate palette is deliberate. Amber and red mean
something needs attention; a guest is a normal, expected participant. Styling it
as a problem would push admins toward removing devices that belong there.

**Both badges, always.** Guest-ness and reachability are independent. A guest
can be online, offline or unknown, and the card must show both - one badge
replacing the other loses real information.

**Explicit "none", never blank.** A guest has no owner. An empty owner field
reads as missing data; "none (guest device)" reads as a fact.

### The admin's control

Open registration means anyone on the WiFi can appear in the list. Removal is
the admin's answer to that, so "Remove Device" must stay easy to reach on a
guest's detail screen - it is the one action that makes the open model
acceptable.

---

## Next Steps

1. Create design mockups in Figma (or design tool)
2. Generate component library
3. Export design tokens
4. Export assets (SVG icons, images)
5. Share design file with development team
6. Iterate based on implementation feedback

---

**This is a complete design specification for a professional UI/UX.** All screens, components, colors, and interactions are defined. Ready for designer to create mockups or for developer to implement.

Version: 1.0  
Last Updated: 2024-08-30  
Status: Ready for Design Implementation
