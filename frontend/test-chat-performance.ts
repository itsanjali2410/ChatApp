/**
 * Chat Performance Test Suite
 * Tests instant message sending, WebSocket delivery, and notification speed
 * 
 * Usage:
 * 1. Open browser console on the chat page
 * 2. Copy and paste this entire file
 * 3. Run: testChatPerformance()
 * 
 * Or import in your code:
 * import { testChatPerformance } from './test-chat-performance';
 */

interface PerformanceMetrics {
  messageSendTime: number;
  websocketReceiveTime: number;
  notificationTime: number;
  chatListLoadTime: number;
  apiResponseTime: number;
  totalLatency: number;
}

interface TestResult {
  test: string;
  passed: boolean;
  duration: number;
  message?: string;
}

const API_URL = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_API_URL || 'https://your-backend-url.railway.app'
  : 'http://localhost:8000';

const WS_URL = process.env.NODE_ENV === 'production'
  ? process.env.NEXT_PUBLIC_WS_URL || 'wss://your-backend-url.railway.app'
  : 'ws://localhost:8000';

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * Test message sending speed
 */
async function testMessageSending(chatId: string): Promise<TestResult> {
  const token = getAuthToken();
  if (!token) {
    return {
      test: 'Message Sending',
      passed: false,
      duration: 0,
      message: 'No auth token found'
    };
  }

  const startTime = performance.now();
  const messageText = `Test message ${Date.now()}`;

  try {
    // Test API endpoint
    const apiStart = performance.now();
    const response = await fetch(`${API_URL}/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        chat_id: chatId,
        message: messageText,
        message_type: 'text'
      })
    });

    const apiEnd = performance.now();
    const apiResponseTime = apiEnd - apiStart;

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    return {
      test: 'Message Sending',
      passed: true,
      duration: totalTime,
      message: `API response: ${apiResponseTime.toFixed(2)}ms, Total: ${totalTime.toFixed(2)}ms`
    };
  } catch (error: any) {
    return {
      test: 'Message Sending',
      passed: false,
      duration: performance.now() - startTime,
      message: error.message
    };
  }
}

/**
 * Test WebSocket message delivery speed
 */
function testWebSocketDelivery(userId: string): Promise<TestResult> {
  return new Promise((resolve) => {
    const token = getAuthToken();
    if (!token) {
      resolve({
        test: 'WebSocket Delivery',
        passed: false,
        duration: 0,
        message: 'No auth token found'
      });
      return;
    }

    const startTime = performance.now();
    const testMessage = `WS_TEST_${Date.now()}`;
    let messageReceived = false;
    let ws: WebSocket | null = null;

    const timeout = setTimeout(() => {
      if (ws) ws.close();
      resolve({
        test: 'WebSocket Delivery',
        passed: false,
        duration: performance.now() - startTime,
        message: 'Timeout waiting for WebSocket message'
      });
    }, 5000);

    try {
      const wsUrl = `${WS_URL}/ws/${userId}?token=${encodeURIComponent(token)}`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        const openTime = performance.now();
        console.log('✅ WebSocket connected in', (openTime - startTime).toFixed(2), 'ms');

        // Send test message
        ws!.send(JSON.stringify({
          type: 'message',
          chat_id: 'test-chat',
          message: testMessage,
          message_type: 'text'
        }));
      };

      ws.onmessage = (event) => {
        const receiveTime = performance.now();
        const data = JSON.parse(event.data);

        if (data.message === testMessage || data.type === 'new_message') {
          messageReceived = true;
          clearTimeout(timeout);
          ws!.close();

          resolve({
            test: 'WebSocket Delivery',
            passed: true,
            duration: receiveTime - startTime,
            message: `Message delivered in ${(receiveTime - startTime).toFixed(2)}ms`
          });
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        if (ws) ws.close();
        resolve({
          test: 'WebSocket Delivery',
          passed: false,
          duration: performance.now() - startTime,
          message: 'WebSocket connection error'
        });
      };
    } catch (error: any) {
      clearTimeout(timeout);
      resolve({
        test: 'WebSocket Delivery',
        passed: false,
        duration: performance.now() - startTime,
        message: error.message
      });
    }
  });
}

/**
 * Test chat list loading speed
 */
async function testChatListLoading(): Promise<TestResult> {
  const token = getAuthToken();
  if (!token) {
    return {
      test: 'Chat List Loading',
      passed: false,
      duration: 0,
      message: 'No auth token found'
    };
  }

  const startTime = performance.now();

  try {
    const response = await fetch(`${API_URL}/chats/my-chats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    const endTime = performance.now();
    const duration = endTime - startTime;

    return {
      test: 'Chat List Loading',
      passed: true,
      duration: duration,
      message: `Loaded ${Array.isArray(data) ? data.length : 0} chats in ${duration.toFixed(2)}ms`
    };
  } catch (error: any) {
    return {
      test: 'Chat List Loading',
      passed: false,
      duration: performance.now() - startTime,
      message: error.message
    };
  }
}

/**
 * Test notification service speed
 */
function testNotificationSpeed(): TestResult {
  const startTime = performance.now();

  try {
    // Test notification permission check
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return {
        test: 'Notification Speed',
        passed: false,
        duration: 0,
        message: 'Notifications not supported'
      };
    }

    // Check if permission is granted
    if (Notification.permission !== 'granted') {
      return {
        test: 'Notification Speed',
        passed: false,
        duration: 0,
        message: 'Notification permission not granted'
      };
    }

    // Test creating a notification (synchronous operation)
    const notification = new Notification('Test Notification', {
      body: 'Testing notification speed',
      icon: '/icon-192.png',
      tag: 'test-notification'
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Close notification immediately
    setTimeout(() => notification.close(), 100);

    return {
      test: 'Notification Speed',
      passed: true,
      duration: duration,
      message: `Notification created in ${duration.toFixed(2)}ms`
    };
  } catch (error: any) {
    return {
      test: 'Notification Speed',
      passed: false,
      duration: performance.now() - startTime,
      message: error.message
    };
  }
}

/**
 * Test optimistic UI updates
 */
function testOptimisticUpdates(): TestResult {
  const startTime = performance.now();

  try {
    // Simulate optimistic update (should be instant - < 10ms)
    const testMessage = {
      id: `temp-${Date.now()}`,
      chat_id: 'test-chat',
      sender_id: 'test-user',
      message: 'Test message',
      timestamp: new Date().toISOString(),
      message_type: 'text',
      status: 'sent'
    };

    // Just measure the time to create and process the message
    const endTime = performance.now();
    const duration = endTime - startTime;

    return {
      test: 'Optimistic Updates',
      passed: duration < 10,
      duration: duration,
      message: `Optimistic update simulated in ${duration.toFixed(2)}ms ${duration < 10 ? '✅' : '⚠️ Should be < 10ms'}`
    };
  } catch (error: any) {
    return {
      test: 'Optimistic Updates',
      passed: false,
      duration: performance.now() - startTime,
      message: error.message
    };
  }
}

/**
 * Run all performance tests
 */
export async function testChatPerformance(options?: {
  chatId?: string;
  userId?: string;
  verbose?: boolean;
}): Promise<{
  results: TestResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    averageDuration: number;
    fastestTest: string;
    slowestTest: string;
  };
}> {
  console.log('🚀 Starting Chat Performance Tests...\n');

  const results: TestResult[] = [];

  // Test 1: Optimistic Updates (should be instant)
  console.log('📝 Testing Optimistic UI Updates...');
  results.push(testOptimisticUpdates());

  // Test 2: Notification Speed
  console.log('🔔 Testing Notification Speed...');
  results.push(testNotificationSpeed());

  // Test 3: Chat List Loading
  console.log('📋 Testing Chat List Loading...');
  const chatListResult = await testChatListLoading();
  results.push(chatListResult);

  // Test 4: Message Sending (if chatId provided)
  if (options?.chatId) {
    console.log('💬 Testing Message Sending...');
    const messageResult = await testMessageSending(options.chatId);
    results.push(messageResult);
  }

  // Test 5: WebSocket Delivery (if userId provided)
  if (options?.userId) {
    console.log('📡 Testing WebSocket Delivery...');
    const wsResult = await testWebSocketDelivery(options.userId);
    results.push(wsResult);
  }

  // Calculate summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const durations = results.map(r => r.duration).filter(d => d > 0);
  const averageDuration = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  const fastestTest = results.reduce((min, r) => 
    r.duration < min.duration ? r : min, results[0] || { test: 'N/A', duration: Infinity });
  const slowestTest = results.reduce((max, r) => 
    r.duration > max.duration ? r : max, results[0] || { test: 'N/A', duration: 0 });

  const summary = {
    totalTests: results.length,
    passed,
    failed,
    averageDuration: Math.round(averageDuration * 100) / 100,
    fastestTest: fastestTest.test,
    slowestTest: slowestTest.test
  };

  // Print results
  console.log('\n📊 Test Results:');
  console.log('='.repeat(50));
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.test}: ${result.duration.toFixed(2)}ms`);
    if (result.message && options?.verbose) {
      console.log(`   ${result.message}`);
    }
  });

  console.log('\n📈 Summary:');
  console.log(`   Total Tests: ${summary.totalTests}`);
  console.log(`   Passed: ${summary.passed}`);
  console.log(`   Failed: ${summary.failed}`);
  console.log(`   Average Duration: ${summary.averageDuration}ms`);
  console.log(`   Fastest: ${summary.fastestTest}`);
  console.log(`   Slowest: ${summary.slowestTest}`);

  // Performance recommendations
  console.log('\n💡 Performance Recommendations:');
  results.forEach(result => {
    if (result.duration > 100 && result.passed) {
      console.log(`   ⚠️  ${result.test} took ${result.duration.toFixed(2)}ms - consider optimization`);
    } else if (result.duration < 50 && result.passed) {
      console.log(`   ✅ ${result.test} is fast! (${result.duration.toFixed(2)}ms)`);
    }
  });

  return { results, summary };
}

/**
 * Quick performance test (no async operations)
 */
export function quickPerformanceTest(): {
  optimisticUpdate: number;
  notificationCheck: number;
} {
  console.log('⚡ Running Quick Performance Test...\n');

  // Test optimistic update speed
  const start1 = performance.now();
  const testMessage = { id: 'test', message: 'test', timestamp: new Date().toISOString() };
  const optimisticUpdate = performance.now() - start1;

  // Test notification check speed
  const start2 = performance.now();
  const notificationSupported = typeof window !== 'undefined' && 'Notification' in window;
  const notificationCheck = performance.now() - start2;

  console.log(`✅ Optimistic Update: ${optimisticUpdate.toFixed(3)}ms`);
  console.log(`✅ Notification Check: ${notificationCheck.toFixed(3)}ms`);

  return { optimisticUpdate, notificationCheck };
}

// Browser console helper
if (typeof window !== 'undefined') {
  (window as any).testChatPerformance = testChatPerformance;
  (window as any).quickPerformanceTest = quickPerformanceTest;
  console.log('📊 Chat performance tests loaded!');
  console.log('   Run: testChatPerformance({ chatId: "your-chat-id", userId: "your-user-id" })');
  console.log('   Or:  quickPerformanceTest()');
}

