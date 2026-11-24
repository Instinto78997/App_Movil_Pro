# Contrato del backend

Base REST: `https://clinicadental.aplicacionesweb2026.com`

Las rutas REST y sus modelos se tomaron de `APP1/app/src/main/java/com/example/app1/network/ApiService.kt`.

| Operación | Método y ruta | Solicitud |
| --- | --- | --- |
| Login | `POST /api/auth/login` | `{ "email": "correo", "password": "..." }` |
| Registro | `POST /api/users/register` | `nombre`, `apellidos`, `documento_personal`, `correo`, `fecha_nacimiento` (AAAA-MM-DD), `edad` (número), `telefono`, `direccion`, `password`, `rol` |
| Obtener perfil | `GET /api/users/profile/{id}` | ID en la ruta |
| Actualizar perfil | `PUT /api/users/profile/{id}` | `id`, `nombre`, `apellidos`, `documento_personal`, `edad`, `telefono`, `direccion`, `rol`; la app intenta `POST` si el servidor responde 404/405 |
| Foto de perfil | `POST /api/users/photo/{id}` | Multipart con el campo `foto`; si responde 404/405, se intenta `POST /api/users/{id}/photo` |

El login espera un objeto de usuario con al menos `id`; interpreta `nombre`/`nombres`, `apellidos`/`apellido`, `correo`/`email` y `rol`/`role`. También lee `token` si viene en la respuesta. El perfil puede estar en `user`, `perfil`, `data` o `body`. Para el registro, el servidor debe incluir el ID creado para que la app pueda subir inmediatamente la foto elegida.

## Amazon Rekognition Face Liveness

| Operación | Método y URL | Solicitud |
| --- | --- | --- |
| Crear sesión | `GET https://nd7y2nxc6jjr3qk7xvokvt72fa0srqlx.lambda-url.us-east-1.on.aws/` | Sin cuerpo; se espera un `sessionId` como texto o dentro de un objeto JSON |
| Consultar resultado | `POST https://j7ox5a3vryaornjffihgqf3wha0psckv.lambda-url.us-east-1.on.aws/` | `{ "sessionId": "...", "identifyAll": true }` para login facial; para verificar el perfil se envía además `profileImageBase64` y `identifyAll: false` |

El resultado usado por la app incluye `isMatch`, `similarity`, `livenessConfidence`, `livenessStatus`, `message` y, en login facial, `user` con `id`, nombre, apellidos, correo y rol.

En el modo de login, la Lambda de resultados hace la búsqueda facial 1:N en el backend (el código Android de referencia indica que consulta `/api/users/faces`); esa ruta no se invoca directamente desde la app.

El detector nativo obtiene credenciales temporales desde el Cognito Identity Pool configurado en `app.json`; el backend no debe devolver claves IAM permanentes. El rol no autenticado del Identity Pool debe tener únicamente el permiso `rekognition:StartFaceLivenessSession` necesario para completar el streaming de la sesión.

## Desarrollo y plataformas

`npx expo start` inicia Metro y permite abrir la vista web o Expo Go. La vista web usa un reemplazo informativo para Face Liveness y no importa el módulo nativo. Expo Go tampoco incluye ese módulo: para probar reconocimiento facial en el dispositivo se necesita un development build, por ejemplo `npx expo run:android`.
