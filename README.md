[Test fáze programu](https://ai-autoskola.onrender.com/)

# Favicon workflow
- `npm install`
- `npm run favicons`  # generates /public/favicons/*
- Zahrňte do `<head>` následující kód:

```html
<!-- Light mode -->
<link rel="icon" type="image/png"
      href="/favicons/ai_autoskola_wheel_light-32.png"
      media="(prefers-color-scheme: light)">
<!-- Dark mode -->
<link rel="icon" type="image/png"
      href="/favicons/ai_autoskola_wheel_dark-32.png"
      media="(prefers-color-scheme: dark)">
<!-- Fallback (ICO) -->
<link rel="icon" type="image/x-icon" href="/favicons/favicon.ico">
