module.exports = {
  expo: {
    name: "Vetra POS",
    slug: "vetrapos",
    owner: "reymundabelgas",
    icon: "./assets/images/vetra-app-icon.png",
    splash: {
      image: "./assets/images/vetra.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    android: {
      package: "com.reymundabelgas.Vetra",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    extra: {
      expoPublicApiUrl: process.env.EXPO_PUBLIC_API_URL,
      eas: {
        projectId: "b96f60d1-891d-4a00-a6a4-a5c666859f80"
      }
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/vetra-app-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ]
    ]
  },
}; 