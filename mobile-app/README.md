# ChatApp Mobile - Cross-Platform React Native App

This is the mobile version of your ChatApp, built with React Native for both iOS and Android platforms.

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v18 or higher)
2. **React Native CLI**: `npm install -g @react-native-community/cli`
3. **Android Studio** (for Android development)
4. **Xcode** (for iOS development - Mac only)

### Installation

1. **Clone and setup**:
```bash
cd mobile-app
npm install
```

2. **iOS Setup** (Mac only):
```bash
cd ios
pod install
cd ..
```

3. **Android Setup**:
   - Open Android Studio
   - Install Android SDK (API level 33+)
   - Create Android Virtual Device (AVD)

### Running the App

**Android**:
```bash
npm run android
```

**iOS**:
```bash
npm run ios
```

## 📱 Features

- ✅ **Cross-platform** - Works on both iOS and Android
- ✅ **Real-time messaging** - WebSocket integration
- ✅ **File sharing** - Images, documents
- ✅ **Push notifications** - Firebase Cloud Messaging
- ✅ **User authentication** - Login/signup
- ✅ **Group chats** - Create and manage groups
- ✅ **Profile management** - User profiles and settings
- ✅ **Offline support** - AsyncStorage for data persistence

## 🏗️ Project Structure

```
mobile-app/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/            # Screen components
│   ├── services/           # API services
│   ├── navigation/         # Navigation configuration
│   ├── utils/              # Utility functions
│   └── types/              # TypeScript type definitions
├── android/                # Android-specific code
├── ios/                    # iOS-specific code
└── App.tsx                 # Main app component
```

## 🔧 Configuration

### Backend Integration

Update the API base URL in `src/services/authService.ts`:

```typescript
const API_BASE_URL = 'https://your-backend-url.com/api';
```

### Push Notifications

1. **Firebase Setup**:
   - Create Firebase project
   - Add Android/iOS apps
   - Download configuration files

2. **Android**: Add `google-services.json` to `android/app/`
3. **iOS**: Add `GoogleService-Info.plist` to `ios/ChatApp/`

### Environment Variables

Create `.env` file:
```env
API_BASE_URL=https://your-backend-url.com/api
FIREBASE_PROJECT_ID=your-project-id
```

## 📦 Building for Production

### Android

1. **Generate signed APK**:
```bash
cd android
./gradlew assembleRelease
```

2. **Generate AAB (recommended for Play Store)**:
```bash
cd android
./gradlew bundleRelease
```

### iOS

1. **Archive for App Store**:
```bash
cd ios
xcodebuild -workspace ChatApp.xcworkspace -scheme ChatApp -configuration Release -destination generic/platform=iOS -archivePath ChatApp.xcarchive archive
```

## 🚀 Deployment

### Google Play Store

1. **Create Play Console account** ($25 fee)
2. **Upload AAB file**
3. **Complete store listing**:
   - App name, description
   - Screenshots (2-8 per device)
   - App icon (512x512px)
   - Feature graphic (1024x500px)
   - Privacy policy

### iOS App Store

1. **Create Apple Developer account** ($99/year)
2. **Upload via Xcode or App Store Connect**
3. **Complete store listing**:
   - App name, description
   - Screenshots for all device sizes
   - App icon (1024x1024px)
   - Privacy policy

## 🔐 Security Considerations

- Store sensitive data in Keychain (iOS) / Keystore (Android)
- Use certificate pinning for API calls
- Implement proper token refresh
- Add biometric authentication

## 📊 Performance Optimization

- Use FlatList for message lists
- Implement image caching
- Optimize bundle size
- Add crash reporting (Crashlytics)

## 🧪 Testing

```bash
# Run tests
npm test

# Run on specific device
npm run android --deviceId=your-device-id
npm run ios --simulator="iPhone 15"
```

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler issues**:
```bash
npx react-native start --reset-cache
```

2. **Android build issues**:
```bash
cd android
./gradlew clean
cd ..
npm run android
```

3. **iOS build issues**:
```bash
cd ios
pod install
cd ..
npm run ios
```

## 📈 Analytics & Monitoring

Consider adding:
- Firebase Analytics
- Crashlytics
- Performance monitoring
- User behavior tracking

## 🔄 Updates & Maintenance

- Regular dependency updates
- Security patches
- Feature additions
- Performance improvements
- User feedback integration

## 📞 Support

For issues and questions:
1. Check this README
2. Review React Native documentation
3. Check GitHub issues
4. Contact development team

---

**Happy coding! 🚀**


