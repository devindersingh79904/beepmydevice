# How to Use Claude Design Prompt - Step by Step

## 🎨 Using Claude Design Tool

### Step 1: Open Claude Design
```
Go to: https://claude.ai/design?via=web_frame_sidebar
```

Or:
- Click on Claude.ai
- Look for "Design" tab or button
- Open Claude Design interface

---

### Step 2: Copy the Prompt

**Option A: Copy from this file**
1. Open `Claude_Design_Prompt.md`
2. Select all text (Ctrl+A or Cmd+A)
3. Copy (Ctrl+C or Cmd+C)

**Option B: Copy from the box below**
```
Everything from "## BeepMyDevice - Complete App UI/UX Design" 
to "**End of Prompt**"
```

---

### Step 3: Paste into Claude Design

1. Click in the text input area in Claude Design
2. Paste the prompt (Ctrl+V or Cmd+V)
3. Press Enter or click "Submit" button

---

### Step 4: Wait for Claude to Generate

Claude Design will:
- Create visual mockups for all 8 screens
- Apply the color scheme exactly
- Use the specified typography
- Add interactions and animations
- Generate design components
- Create responsive layouts

**Estimated time:** 2-5 minutes

---

### Step 5: Export or View

Once complete, you can:
- **View:** See all mockups in Claude Design interface
- **Edit:** Ask Claude to modify ("Make the button bigger", "Change this color to blue", etc)
- **Export:** Download as images, Figma file, or design system documentation
- **Share:** Share the design link with team

---

## 📋 What the Prompt Includes

The Claude Design prompt specifies:

✅ **8 Complete Screens:**
- Splash Screen
- Login Screen
- Register Screen
- Dashboard Screen (main)
- Alert Confirmation Modal
- Device Detail Screen
- Settings Screen
- Error States & Alerts

✅ **Complete Design System:**
- 10 colors (primary, secondary, status, text, backgrounds)
- 6 typography levels (display → caption)
- Spacing system (4px base unit)
- Border radius specifications
- Shadow definitions

✅ **15+ Components:**
- Buttons (4 variants, 3 sizes, 5 states)
- Input fields (4 types, 5 states)
- Cards (padding, borders, shadows)
- Badges (4 variants, 2 sizes)
- Modals (dialog specifications)
- List items (56px minimum tap target)

✅ **Interactions:**
- Animation timings (200ms, 300ms, 500ms)
- Tap feedback (scale 0.98)
- Haptic feedback (light, medium, heavy)
- Gesture support (tap, swipe, pull-to-refresh)

✅ **Accessibility:**
- WCAG AA contrast ratios (4.5:1)
- 48px minimum touch targets
- Color-independent design
- Screen reader support

✅ **Responsive Design:**
- Mobile (320px-480px): Full width, single column
- Tablet (481px-768px): Two columns, larger cards
- Desktop (769px+): Multi-column, keyboard support

---

## 🎯 Expected Output

After pasting the prompt, Claude Design will generate:

### Mockups (Screens)
```
Screen 1: Splash Screen
  - Gradient background
  - Centered logo (120x120px)
  - App name (28pt, bold, white)
  - Loading spinner (animated)

Screen 2: Login Screen
  - Header with logo + title
  - Email input (48px height, blue focus)
  - Password input (with show/hide toggle)
  - Sign In button (full width, blue)
  - Forgot password link
  - Sign up link at bottom

Screen 3: Register Screen
  - Similar to login but with 3 inputs
  - Real-time email validation
  - Password strength indicator
  - Confirm password with matching indicator
  - Terms acceptance text

Screen 4: Dashboard Screen (Main)
  - Fixed header (WiFi info + user avatar)
  - Scrollable device list
  - Device cards with:
    - Device name + type
    - Status badge (online/offline)
    - Battery level + icon
    - "Last seen" timestamp
    - "Send Alert" button
  - Pull-to-refresh gesture
  - Empty state (no devices)
  - Loading state (skeleton loaders)

Screen 5: Alert Modal
  - Darkened overlay
  - Dialog: "Send Alert?"
  - Device info display
  - Confirm buttons (Cancel, Send Alert)
  - Loading, error states

Screen 6: Device Detail Screen
  - Back button + device name header
  - Large device card with:
    - Device icon/image
    - Full device info
    - Status + WiFi info
    - Battery details + estimate
    - Alert history section
  - Send Alert button (sticky at bottom)
  - Remove Device button (red text)

Screen 7: Settings Screen
  - Account section (profile, password, email)
  - Devices section (manage, help)
  - Notifications section (toggles)
  - App section (version, updates)
  - About section (terms, privacy)
  - Logout button (red)

Screen 8: Error States
  - Error banners (red, top of screen)
  - Field errors (below inputs, red text)
  - Toast notifications (bottom, dark)
  - Skeleton loaders (gray pulse)
  - Loading spinners
```

### Component Library
```
Buttons:
  - Primary (blue)
  - Secondary (gray)
  - Danger (red)
  - Text-only
  - Sizes: Large (48px), Medium (40px), Small (36px)
  - States: Normal, Hover, Pressed, Disabled, Loading

Inputs:
  - Text, Email, Password, Number
  - States: Empty, Focused, Filled, Error, Success
  - Icons: Left & right support
  - Labels: Above or inside

Badges:
  - Success (green), Warning (amber), Error (red), Info (blue)
  - Sizes: Small, Medium
  - With/without icons

Cards:
  - Padding: 16px
  - Border: 1px light gray
  - Radius: 12px
  - Shadow: Subtle

Modals:
  - Overlay (50% opacity)
  - Centered dialog (80% width, max 360px)
  - Radius: 16px
  - Animations: Slide up (300ms), Fade out
```

### Design Tokens
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
  4px, 8px, 12px, 16px, 20px, 24px, 32px

Border Radius:
  Large: 16px
  Medium: 8px
  Small: 4px

Timing:
  Fast: 200ms
  Normal: 300ms
  Slow: 500ms
```

---

## ✅ Follow-up Prompts to Refine

After Claude Design generates the mockups, you can ask:

### Refinement Requests
```
"Make the device card background slightly darker"
"Increase the font size of the device name to 18pt"
"Change the offline device color from gray to light blue"
"Add a drop shadow to all cards"
"Make the buttons more rounded (increase border radius to 12px)"
```

### Addition Requests
```
"Add a pull-to-refresh indicator at the top"
"Show the loading skeleton animation"
"Add dark mode variants for all screens"
"Create a desktop layout for 1024px+ screens"
"Add landscape orientation layouts"
```

### Export Requests
```
"Export all screens as PNG images"
"Create a Figma design file from these mockups"
"Generate design tokens in JSON format"
"Export component specifications as CSS variables"
"Create an interactive prototype with screen links"
```

### Animation Requests
```
"Animate the tap effect on buttons (scale 0.98)"
"Show the screen transition animation (slide right to left)"
"Animate the skeleton loader pulse effect"
"Add haptic feedback indicators to buttons"
```

---

## 💡 Pro Tips

### Tip 1: Clear Instructions
If Claude Design produces something different than expected:
```
"I need the device status badge to show: green circle + 'Online' text
currently it's showing only text. Please fix."
```

### Tip 2: Use Specific Language
Instead of: "Make it better"  
Use: "Make the button 56px height instead of 48px"

### Tip 3: Reference Design System
```
"Please use the primary blue color (#2563EB) for all buttons"
"Apply the 16px screen padding to all mockups"
```

### Tip 4: Ask for Variations
```
"Show me 3 different layouts for the device card"
"Create dark mode versions of all screens"
"Show mobile and desktop versions side by side"
```

### Tip 5: Iterative Design
1. Generate initial mockups (1st prompt)
2. Ask for refinements (follow-up prompts)
3. Export when satisfied (export prompt)
4. Share with team (share link)

---

## 📱 What You Get After Export

### As PNG Images
- 8 high-resolution screen mockups
- Component library illustrations
- Each screen: 1080px width (mobile resolution)
- Can be uploaded to design tools, shared with team

### As Figma File
- Fully editable components
- Design system tokens
- Interactive links between screens
- Can be downloaded and modified
- Share link with team for collaboration

### As JSON Design Tokens
```json
{
  "colors": {
    "primary": "#2563EB",
    "success": "#10B981",
    ...
  },
  "typography": {
    "display": "32px, bold",
    ...
  },
  "spacing": [4, 8, 12, 16, 20, 24, 32]
}
```

### As CSS Variables
```css
--color-primary: #2563EB;
--color-success: #10B981;
--font-display: 32px, bold;
--spacing-4: 4px;
```

---

## 🚀 After Design is Complete

### Step 1: Review with Team
- Show mockups to team members
- Get feedback on layouts
- Discuss color choices
- Approve design direction

### Step 2: Handoff to Developers
- Share Figma file or design system
- Developers implement using design tokens
- Frontend team codes UI exactly as designed
- QA verifies implementation matches mockups

### Step 3: Save for Documentation
- Store design file in project repository
- Include in project documentation
- Reference during development
- Use for quality assurance

### Step 4: Future Reference
- Use as design guide for Phase 2
- Reference for dark mode implementation
- Basis for tablet/desktop layouts
- Consistency check for new features

---

## ❓ Troubleshooting

### Issue: Claude Design didn't generate all 8 screens

**Solution:**
```
"Please generate the remaining screens (Device Detail, Settings, Error States)"
```

### Issue: Colors don't match the specification

**Solution:**
```
"Please use exactly these colors:
- Primary: #2563EB
- Success: #10B981
- Error: #EF4444
All other colors should match the design system"
```

### Issue: Typography looks different than specified

**Solution:**
```
"Screen titles should be 28pt, bold, black
Section headers should be 20pt, semi-bold
Body text should be 16pt, regular
Please adjust"
```

### Issue: Components not sized correctly

**Solution:**
```
"All buttons should be minimum 48px height
All input fields should be 48px height
All tap targets should be at least 48x48px
Please adjust all components"
```

### Issue: Can't export in desired format

**Solution:**
```
"Please export as [PNG/Figma/JSON/CSS variables]"
or
"Can you provide this design system in Figma format for handoff?"
```

---

## 📊 Checklist Before Sharing

Before sharing mockups with team:

- [ ] All 8 screens are complete
- [ ] Colors match the design system (#2563EB, #10B981, etc)
- [ ] Typography follows hierarchy (28pt titles, 16pt body, etc)
- [ ] All components are consistent across screens
- [ ] Buttons are minimum 48px height
- [ ] Spacing is 16px base unit (4, 8, 12, 16, 20, 24, 32px)
- [ ] Focus states are visible (blue outline)
- [ ] Error states are shown (red color)
- [ ] Loading states are shown (spinner/skeleton)
- [ ] Responsive layouts work (mobile/tablet/desktop)
- [ ] Animations are specified (200-300ms, ease-out)
- [ ] Accessibility standards met (contrast, touch targets)

---

## 🎁 Final Deliverables

After Claude Design completes:

You will have:
1. ✅ 8 complete screen mockups
2. ✅ 15+ reusable components
3. ✅ Complete design system (colors, typography, spacing)
4. ✅ Animation & interaction specifications
5. ✅ Responsive layouts (mobile, tablet, desktop)
6. ✅ Accessibility guidelines
7. ✅ Design tokens (JSON, CSS variables, or Figma)
8. ✅ Handoff documentation for developers

---

## 🎯 Next Steps After Design

1. **Share with Team** → Get feedback
2. **Handoff to Developers** → Frontend implementation
3. **QA Testing** → Verify implementation
4. **Refinement** → Iterate based on feedback
5. **Phase 2 Design** → Start on next features

---

## 📞 Questions?

If Claude Design doesn't understand something:

1. Rephrase clearly: "I need [specific thing] in [specific location]"
2. Reference design system: "Use the primary blue (#2563EB)"
3. Give examples: "Like the buttons on the Dashboard screen"
4. Ask for export: "Please save this as a Figma file"

---

**Ready to create beautiful UI mockups! Let's go! 🎨✨**

Use the `Claude_Design_Prompt.md` file content in Claude Design tool now.
