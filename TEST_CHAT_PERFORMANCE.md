# Chat Performance Test Suite

This test suite verifies that chat routes are working instantly with optimized performance.

## Files Created

1. **`frontend/test-chat-performance.ts`** - TypeScript test module with comprehensive test functions
2. **`test-chat-performance.html`** - Standalone HTML test page (can be opened directly in browser)

## Quick Start

### Option 1: Browser Console (Easiest)

1. Open your chat app in the browser
2. Open Developer Console (F12)
3. Navigate to the chat page
4. Copy and paste the contents of `frontend/test-chat-performance.ts` into the console
5. Run:
   ```javascript
   // Quick test
   quickPerformanceTest()

   // Full test (provide chatId and userId)
   testChatPerformance({
     chatId: "your-chat-id-here",
     userId: "your-user-id-here",
     verbose: true
   })
   ```

### Option 2: HTML Test Page

1. Open `test-chat-performance.html` in your browser
2. Log in to your chat app first (to get auth token)
3. Optionally enter Chat ID and User ID
4. Click "Run Full Test Suite" or "Run Quick Test"
5. View results in real-time

### Option 3: Import in Your Code

```typescript
import { testChatPerformance, quickPerformanceTest } from './test-chat-performance';

// Quick test
const quick = quickPerformanceTest();
console.log('Optimistic update:', quick.optimisticUpdate, 'ms');

// Full test
const results = await testChatPerformance({
  chatId: "chat-123",
  userId: "user-456",
  verbose: true
});

console.log('Tests passed:', results.summary.passed);
console.log('Average duration:', results.summary.averageDuration, 'ms');
```

## Tests Included

### 1. **Optimistic UI Updates** ⚡
- Tests instant message appearance (should be < 10ms)
- Verifies optimistic updates work correctly

### 2. **Notification Speed** 🔔
- Tests notification creation time
- Checks if notifications are non-blocking
- Verifies permission status

### 3. **Chat List Loading** 📋
- Tests API response time for `/chats/my-chats`
- Verifies data loading speed
- Should complete in < 200ms for good performance

### 4. **Message Sending** 💬
- Tests `/messages/send` API endpoint
- Measures response time
- Should complete in < 300ms for instant feel

### 5. **WebSocket Delivery** 📡
- Tests WebSocket message delivery speed
- Verifies real-time message propagation
- Should deliver in < 500ms for instant messaging

## Performance Benchmarks

| Test | Excellent | Good | Acceptable | Needs Optimization |
|------|-----------|------|------------|-------------------|
| Optimistic Update | < 1ms | < 5ms | < 10ms | > 10ms |
| Notification Creation | < 5ms | < 10ms | < 20ms | > 20ms |
| Chat List Loading | < 100ms | < 200ms | < 500ms | > 500ms |
| Message Sending | < 150ms | < 300ms | < 500ms | > 500ms |
| WebSocket Delivery | < 200ms | < 500ms | < 1000ms | > 1000ms |

## Expected Results

After the optimizations, you should see:

✅ **Optimistic Updates**: < 1ms (instant)  
✅ **Notifications**: < 5ms (instant)  
✅ **Chat List**: < 200ms (fast)  
✅ **Message Sending**: < 300ms (responsive)  
✅ **WebSocket**: < 500ms (real-time)

## Troubleshooting

### "No auth token found"
- Make sure you're logged in
- Token should be in `localStorage.getItem('token')`

### "WebSocket connection error"
- Check if WebSocket server is running
- Verify WebSocket URL in environment variables
- Check browser console for connection errors

### "Notification permission not granted"
- Grant notification permission in browser
- Check browser notification settings

### Tests taking too long
- Check network tab for slow API calls
- Verify backend server is running
- Check for console errors
- Review WebSocket connection status

## Continuous Testing

You can integrate this into your development workflow:

```javascript
// Add to your chat page component
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    // Auto-run quick test on page load
    setTimeout(() => {
      quickPerformanceTest();
    }, 2000);
  }
}, []);
```

## Manual Testing Checklist

- [ ] Open chat page
- [ ] Run `quickPerformanceTest()` - should show < 1ms
- [ ] Send a message - should appear instantly (< 10ms)
- [ ] Check if notification appears immediately
- [ ] Verify WebSocket messages arrive quickly
- [ ] Test on different network conditions (3G, 4G, WiFi)
- [ ] Test with multiple messages sent rapidly

## Notes

- All timings are in milliseconds
- Tests measure real-world performance
- Results may vary based on network conditions
- Optimistic updates should always be < 10ms
- API calls are measured end-to-end (network + processing)

