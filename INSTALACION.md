# 🚀 Guía de Instalación Rápida - Monopoly Web Mejorado

## Paso 1: Crear estructura de carpetas

```bash
mkdir monopoly-game
cd monopoly-game
mkdir public
```

## Paso 2: Crear archivos

Crea los siguientes archivos con el contenido proporcionado:

```
monopoly-game/
├── public/
│   ├── index.html      (index-mejorado.html)
│   └── client.js       (client-mejorado.js)
├── server.js           (server-mejorado.js)
├── package.json
├── .env
└── README.md
```

### Copiar archivos:
1. **index.html** → Copia el contenido de `index-mejorado.html` a `public/index.html`
2. **client.js** → Copia el contenido de `client-mejorado.js` a `public/client.js`
3. **server.js** → Copia el contenido de `server-mejorado.js` a `server.js` (raíz)
4. **package.json** → Copia el package.json proporcionado
5. **.env** → Copia `.env.example` y renómbralo a `.env`

## Paso 3: Instalar dependencias

```bash
npm install
```

Esto instalará:
- express
- socket.io
- compression
- dotenv

## Paso 4: Configurar .env (opcional)

Edita el archivo `.env` si quieres cambiar configuraciones:

```env
PORT=3000
MAX_PLAYERS=8
CORS_ORIGIN=*
```

## Paso 5: Iniciar servidor

### Modo producción:
```bash
npm start
```

### Modo desarrollo (con auto-reload):
```bash
npm install -g nodemon
npm run dev
```

## Paso 6: Abrir en navegador

Abre tu navegador en:
```
http://localhost:3000
```

## 🎮 Uso básico

1. **Jugador 1**: 
   - Ingresa tu nombre
   - Haz clic en "Crear Sala"
   - Copia el ID de sala (ejemplo: A3F9C2E1)

2. **Jugador 2+**:
   - Ingresa tu nombre
   - Pega el ID de sala
   - Haz clic en "Unirse"

3. **Iniciar juego**:
   - El host hace clic en "Comenzar" cuando todos estén listos

## 🔧 Troubleshooting

### Error: Cannot find module 'express'
```bash
npm install
```

### Puerto 3000 ya en uso
Cambia el puerto en `.env`:
```env
PORT=8080
```

### No se conecta Socket.io
Asegúrate que:
1. El servidor esté corriendo
2. No haya firewall bloqueando el puerto
3. La ruta de Socket.io sea correcta en index.html

### Página en blanco
1. Verifica que `index.html` esté en `public/`
2. Verifica que `client.js` esté en `public/`
3. Revisa la consola del navegador (F12)

## 📦 Deployment

### Render.com (Recomendado)
1. Sube tu código a GitHub
2. Conecta con Render
3. New Web Service
4. Build: `npm install`
5. Start: `npm start`

### Heroku
```bash
heroku create mi-monopoly
git push heroku main
```

### Railway
1. Conecta GitHub
2. Deploy automático

## ✅ Verificación

Si todo funciona correctamente, deberías ver:

**En el servidor:**
```
🎲 Monopoly Server v2.0
🚀 Servidor corriendo en puerto 3000
📊 Jugadores máximos por sala: 8
⏱️  Timeout de reconexión: 60000ms
```

**En el navegador:**
- Interfaz del juego cargada
- Mensaje "Conectado al servidor" (alerta verde)
- Consola sin errores

## 🆘 Soporte

Si tienes problemas:
1. Revisa la consola del navegador (F12)
2. Revisa los logs del servidor
3. Verifica que todas las dependencias estén instaladas
4. Comprueba que los archivos estén en las carpetas correctas

---

**¡Listo para jugar! 🎲**