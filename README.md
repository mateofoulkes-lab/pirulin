# Pirulín! PWA

PWA personal basada directamente en `mockup_pirulin_v51.html`.

## Estado actual

- UI v51 real como frontend, sin reimplementación en Compose.
- `index.html` carga e inyecta la v51 intacta.
- Manifest PWA configurado.
- Service Worker con shell offline.
- Iconos PWA básicos temporales.
- Datos mock por ahora.
- Firebase real se conectará después de validar esta versión instalada.
- Pingüé Split permanece fuera de este proyecto y read-only.

## Seguridad

No subir service accounts, claves privadas, exports de Firestore ni datos reales.

## Próximo paso

Publicar esta rama por HTTPS (GitHub Pages o Firebase Hosting), abrirla desde Android y validar instalación, fidelidad visual e interacciones de la v51 antes de conectar Firebase.
