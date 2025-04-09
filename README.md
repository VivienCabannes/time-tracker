# Daily Activity Logger

A minimal, offline-first app for tracking daily activities, adding quick notes, and exporting your activity history — all with a clean UI that works on both **mobile** and **web**.
You can use it, e.g., to understand where you spend most of your time, or to bill your consulting activities.

## Features

- One-tap **activity logging**
- Add **comments** to latest logs
- **Dark / Light theme** toggle
-  YAML-based **custom activity buttons**
- Export logs as JSON
- Offline + local storage only

##  Built With

- [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/)
- `AsyncStorage` for logs, config, and theming
- `js-yaml` for user-editable activity config
- `expo-file-system` + `Share API` (mobile) and download (web) for exports
- React Navigation for screen transitions

## Navigation

- **Home**: Activity buttons + "➕ Add Comment" + hamburger menu  
- **Logs**: Reverse chronological log view  
- **Settings**: Edit YAML config & theme

## Data Format

```json
{
  "activity": "Work",
  "timestamp": "2025-04-09T15:00:00.000Z",
  "comments": ["Focused session", "Wrote report"]
}
```

## Building the Application

You can either build with Expo Go, which allow you to load your app in the Expo Go app, or with eas build.
To build the app with Expo Go, run the following command and follow the stdout instructions.
```shell
npx expo start
```
You can also test the web add by adding the option `--web`.

To build the app with eas build, run the following command.
```shell
eas build --profile development
```
This will work well for Android, and iOS if you have a developer account.
Otherwise, you can run the following command, before using XCode to image the build on a device (simulated or real).
```shell
npx expo prebuild
```