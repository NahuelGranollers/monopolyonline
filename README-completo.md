# Monopoly Web - Versión Mejorada y Segura

## 🎲 Características Implementadas

### ✅ Mejoras de Seguridad
- **Dados generados 100% en servidor** - Imposible hacer trampa
- **Sanitización de entradas** - Protección contra XSS
- **Rate limiting** - Protección contra spam y DDoS
- **IDs de sala criptográficos** - Salas seguras
- **Validación exhaustiva** - Todas las acciones validadas en servidor

### ✅ Mejoras de Funcionalidad
- **Cartas automáticas** - Se aplican al caer en Suerte/Caja Común
- **Reconexión inteligente** - 60 segundos para reconectar sin perder progreso
- **Sistema de alertas** - Notificaciones visuales de eventos
- **Copiar ID de sala** - Compartir sala fácilmente
- **Contador de jugadores** - Ver cuántos están en la sala
- **Indicadores visuales** - Estados de jugadores (cárcel, bancarrota, desconectado)

### ✅ Mejoras de UX
- **Diseño mejorado** - Interfaz más moderna y pulida
- **Animaciones** - Dados con animación fluida
- **Responsive** - Funciona en móviles
- **LocalStorage** - Guarda tu nombre automáticamente
- **Log con timestamps** - Historial detallado de eventos

## 📁 Estructura de Archivos

```
monopoly-game/
├── public/
│   ├── index.html          (archivo HTML mejorado)
│   └── client.js           (archivo JS cliente mejorado)
├── server.js               (archivo JS servidor mejorado)
├── package.json
├── .env
└── README.md
```

## 🚀 Instalación

### 1. Instalar dependencias

```bash
npm init -y
npm install express socket.io compression dotenv
```

### 2. Crear archivo .env

```env
PORT=3000
MAX_PLAYERS=8
CORS_ORIGIN=*
```

### 3. Estructura de carpetas

```bash
mkdir public
# Coloca index.html en public/
# Coloca client.js en public/
# server.js en la raíz
```

### 4. Iniciar servidor

```bash
node server.js
```

O con nodemon para desarrollo:
```bash
npm install -g nodemon
nodemon server.js
```

## 🎮 Cómo Jugar

1. **Crear sala**: Ingresa tu nombre y haz clic en "Crear Sala"
2. **Compartir**: Copia el ID de sala y compártelo con amigos
3. **Unirse**: Otros jugadores ingresan el ID y hacen clic en "Unirse"
4. **Comenzar**: El host hace clic en "Comenzar" cuando todos estén listos
5. **Jugar**: Tira los dados, compra propiedades, construye casas, ¡gana!

## 🔧 Configuración Avanzada

### Variables de Entorno (.env)

```env
# Puerto del servidor
PORT=3000

# Máximo de jugadores por sala
MAX_PLAYERS=8

# CORS (para producción, especifica tu dominio)
CORS_ORIGIN=https://tu-dominio.com

# Timeout de reconexión (milisegundos)
RECONNECT_TIMEOUT=60000
```

### Rate Limiting

El servidor incluye rate limiting por defecto:
- **createRoom**: 3 peticiones cada 10 segundos
- **joinRoom**: 5 peticiones cada 5 segundos
- **rollDice**: 5 peticiones cada 2 segundos
- Otras acciones: 3 peticiones por segundo

## 🐛 Debugging

Abre la consola del navegador (F12) para ver logs detallados:
```javascript
[SOCKET] Conectado: socket_id
[ROLL] Solicitando tirada al servidor
[DICE] Servidor envió dados: 3 4 para Jugador1
```

En el servidor verás:
```bash
[CONNECT] socket_id
[ROOM_CREATED] A3F9C2E1 by Jugador1
[JOIN] Jugador2 joined A3F9C2E1
[GAME_START] A3F9C2E1
```

## 📊 Diferencias vs Versión Original

| Característica | Original | Mejorado |
|----------------|----------|----------|
| Generación de dados | Cliente | ✅ Servidor |
| Sanitización | ❌ No | ✅ Sí |
| Rate limiting | ❌ No | ✅ Sí |
| IDs de sala | Predecibles | ✅ Criptográficos |
| Reconexión | ❌ No | ✅ 60s timeout |
| Cartas | Manual | ✅ Automático |
| Validación | Básica | ✅ Exhaustiva |
| Alertas visuales | ❌ No | ✅ Sí |
| Responsive | Parcial | ✅ Completo |
| Compresión | ❌ No | ✅ Gzip |

## 🎨 Personalización

### Cambiar colores de jugadores

En `client.js`, modifica la función `colorFor`:

```javascript
function colorFor(i) {
  const cols = [
    '#d32f2f',  // Rojo
    '#1976d2',  // Azul
    '#388e3c',  // Verde
    // Añade más colores aquí
  ];
  return cols[i % cols.length];
}
```

### Cambiar dinero inicial

En `server.js`:

```javascript
const DEFAULT_MONEY = 1500; // Cambia este valor
```

### Añadir más cartas

En `server.js`, función `shuffleDecks`:

```javascript
room.deckChance.push({
  text: 'Tu carta personalizada',
  type: 'money',
  amount: 100
});
```

## 🚀 Deployment

### Render.com

1. Crea cuenta en Render.com
2. New > Web Service
3. Conecta tu repo de GitHub
4. Build: `npm install`
5. Start: `node server.js`
6. Añade variables de entorno

### Heroku

```bash
heroku create tu-monopoly
git push heroku main
heroku config:set PORT=3000
```

### Railway

1. Sube tu código a GitHub
2. Conecta con Railway
3. Despliega automáticamente

## 📝 Licencia

MIT

## 🤝 Contribuciones

¡Contribuciones bienvenidas! Abre un issue o pull request.

## 🐛 Problemas Conocidos

- Los jugadores desconectados se eliminan después de 60 segundos
- El juego se guarda solo en memoria (se pierde al reiniciar el servidor)
- No hay sistema de autenticación persistente

## 🔮 Próximas Mejoras

- [ ] Persistencia con Redis/MongoDB
- [ ] Sistema de cuentas y estadísticas
- [ ] Trading entre jugadores
- [ ] Subastas automáticas
- [ ] Sonidos y música
- [ ] Animaciones 3D de dados
- [ ] Chat en tiempo real
- [ ] Modo espectador

---

**¡Disfruta jugando Monopoly! 🎲🏠💰**