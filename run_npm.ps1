Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
# Přidání cesty k Node.js do PATH pro tuto session
$nodePath = "D:\OneDrive - SATRA, spol. s r.o\PRIV\VSC\Node.js\node-v22.16.0-win-x64"
$env:Path = "$nodePath;" + $env:Path

# Spuštění npm, které nyní najde node a další příkazy
npm run dev
