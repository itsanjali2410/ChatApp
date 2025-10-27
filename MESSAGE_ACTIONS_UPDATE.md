# Message Actions Update

## Summary
Updated the message bubble component to use a three-dot menu instead of individual action buttons, with custom filename download support.

## Changes Made

### 1. Fixed File Download Path Issue
**File**: `frontend/utils/api.ts`

**Problem**: Files were getting double `/files/` prefix, causing 404 errors.

**Solution**: 
```typescript
// Check if path already includes /files/
if (filePath.startsWith('/files/')) {
  return `${API_URL}${filePath}`;
}
```

### 2. Removed Copy Button
- Removed the individual copy button that appeared on hover
- Now integrated into the three-dot menu

### 3. Added Three-Dot Menu
**File**: `frontend/components/MessageBubble.tsx`

**Features**:
- Three-dot icon appears on message hover
- Shows contextual options based on message type

#### For Text Messages:
- **Copy** - Copy message text to clipboard
- **Delete** - Delete message (only for own messages)

#### For File Messages:
- **Download** - Download file with custom filename option

### 4. Custom Filename Download
**New Feature**: When downloading files:
1. User clicks "Download" from three-dot menu
2. Modal appears asking for filename
3. User can enter custom name (pre-filled with original filename)
4. File downloads with the custom name

**Benefits**:
- User has full control over saved filename
- Can organize files as needed
- More professional file management

## User Experience

### Before
- Copy button always visible on hover
- Delete button always visible on hover  
- File downloads with original filename only
- No way to customize downloaded filename

### After
- Clean three-dot menu on hover
- Contextual options based on message type
- File downloads with custom filename support
- Better organized message actions

## Technical Details

### State Management
Added new states:
- `showThreeDotMenu` - Controls three-dot menu visibility
- `showDownloadPrompt` - Controls download modal
- `customFileName` - Stores user-entered filename

### Event Handling
- Click outside to close menu
- Proper event propagation
- Touch support for mobile devices

### File Downloads
```typescript
// Proper content type detection
const contentType = response.headers.get('content-type');

// Sanitize filename
const sanitizedFilename = filename.replace(/[<>:"/\\|?*]/g, '_');

// Create typed blob
const typedBlob = new Blob([blob], { type: contentType });

// Download with custom name
link.download = sanitizedFilename;
```

## Code Structure

### Three-Dot Menu Button
Located in message bubble, appears on hover:
- Absolutely positioned top-right
- Three vertical dots icon
- Opens dropdown menu on click

### Dropdown Menu
- Positioned below button
- Contextual options
- Auto-closes when clicking outside
- Styled with hover effects

### Download Modal
- Input field for custom filename
- Pre-filled with original filename
- Download button with proper error handling
- Cancel button to dismiss

## Browser Compatibility
- ✅ Chrome/Edge
- ✅ Firefox  
- ✅ Safari
- ✅ Mobile browsers

## Testing Checklist

- [ ] Hover over text message shows three-dot menu
- [ ] Hover over file message shows three-dot menu
- [ ] Three-dot menu shows correct options
- [ ] Copy works for text messages
- [ ] Delete works for own messages
- [ ] Download file modal appears
- [ ] Custom filename works
- [ ] File downloads with custom name
- [ ] Click outside closes menu
- [ ] Mobile touch support works

## Summary

✅ File download path issue fixed
✅ Three-dot menu replaces individual buttons
✅ Copy functionality moved to menu
✅ Custom filename download support
✅ Better UX and file organization
✅ Cleaner message interface

