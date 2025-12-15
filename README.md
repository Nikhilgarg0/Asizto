# Lifeline

A cross-platform **React Native app** built with **Expo**, featuring Firebase integration, modular components, and a scalable architecture.  

---

## 🚀 Features
- 📱 Cross-platform support: Android, iOS, and Web  
- 🔥 Firebase integration for authentication and backend services  
- 🎨 Reusable UI components under `components/`  
- 📂 Organized navigation using `RootNavigation.js`  
- ⚡ Modern React Context API for state management (`context/`)  
- 🔧 Utilities and helpers under `utils/`  

---

## 📂 Project Structure
```
Lifeline/
│── android/             # Android native files
│── assets/              # App assets (images, icons, etc.)
│── components/          # Reusable UI components
│── context/             # Context API providers
│── screens/             # App screens (views/pages)
│── utils/               # Helper functions
│── App.js               # Entry point
│── index.js             # Main index file
│── firebaseConfig.js    # Firebase configuration
│── RootNavigation.js    # Navigation setup
│── package.json         # Dependencies & scripts
│── app.json             # Expo app config
│── eas.json             # Expo Application Services config
```

---

## ⚙️ Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)  
- [Expo CLI](https://docs.expo.dev/get-started/installation/)  
- Android Studio / Xcode (for mobile development)  

### Steps
```bash
# Clone repository
git clone https://github.com/your-username/Lifeline.git
cd Lifeline

# Install dependencies
npm install
# or
yarn install

# Start development server
npm start
```

---

## ▶️ Running the App

- **Android:**  
  ```bash
  npm run android
  ```
- **iOS (Mac only):**  
  ```bash
  npm run ios
  ```
- **Web:**  
  ```bash
  npm run web
  ```

---

## 🔑 Environment Variables

The app uses Firebase. Make sure to configure your Firebase project:

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/).  
2. Add your Firebase credentials in `firebaseConfig.js`.  
3. (Optional) For API keys, update `apiKeys.js`.  

---

## 📦 Dependencies

Some key dependencies used in this project:
- **React Native**  
- **Expo**  
- **Firebase**  
- **React Navigation**  
- **Context API**  

*(Full list available in `package.json`)*  

---

## 🛠️ Development

### Linting & Formatting
```bash
npm run lint
```

### Build for production
```bash
expo build
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to fork this project and submit a pull request.  

---

## 📄 License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

