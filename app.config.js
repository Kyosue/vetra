module.exports = {
  expo: {
    name: "vetra",
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
        projectId: "6d5d5cb8-f544-4eb7-a748-daed7c78afb2"
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