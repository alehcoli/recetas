# Recetario y menú familiar

Dashboard familiar con recetario filtrable, menú mensual (familia + menú
infantil del cole), lista de la compra y control de congelados. Todo se lee
y se guarda en una Google Sheet compartida, así que tú y tu mujer podéis
entrar desde vuestros propios dispositivos y ver siempre los mismos datos.

## Cómo funciona

```
index.html  ──fetch/POST──>  Google Apps Script (Web App)  ──lee/escribe──>  Google Sheet
 (Hostinger)                    apps-script/Code.gs
```

- **`index.html`** — toda la app (sin build, sin dependencias). El código
  fuente vive en [github.com/alehcoli/recetas](https://github.com/alehcoli/recetas)
  y se sirve desde tu hosting de Hostinger.
- **`apps-script/Code.gs`** — backend, ya desplegado. Vive dentro de la
  Google Sheet (Extensiones → Apps Script) como Web App. Protocolo:
  `GET` devuelve todo el estado; `POST` recibe `{resource, action, ...}`
  para cada cambio (`recipe`, `day`, `frozen`, `shopStore`, `shopManual`,
  `shopHidden`).
- **Pestañas de la Sheet**: `Recetas`, `MenuDias`, `Congelados`,
  `CompraTiendas`, `CompraManual`, `CompraOculta`. Se pueden editar también
  a mano directamente en la hoja — la app las vuelve a leer en cada recarga.
- Si en algún momento no hay conexión con la Sheet, la app muestra la
  última copia guardada en `localStorage` del navegador (con un aviso) y no
  permite guardar cambios hasta que se recupere la conexión.
- La página lleva `<meta name="robots" content="noindex,nofollow">` y un
  `robots.txt` que bloquea todo rastreo, para que no aparezca en buscadores
  — pero sigue siendo accesible para cualquiera que tenga el enlace directo.

## Puesta en marcha

### 1. Backend (Google Apps Script) — ya hecho

El Web App ya está desplegado y probado en vivo; `SHEET_API_URL` en
`index.html` ya apunta a él. Si en el futuro cambias el código del script,
recuerda: Implementar → Gestionar implementaciones → editar (lápiz) →
**Nueva versión** (no "nueva implementación", o la URL cambiaría).

### 2. Frontend (Hostinger)

Dos formas de subir `index.html` (+ `robots.txt`) a tu hosting:

**A. Manual (rápido, sin configurar nada extra)**
1. hPanel → Websites → tu sitio → **Administrador de archivos**.
2. Entra en `public_html` (o la subcarpeta/subdominio donde quieras
   colgarlo, p. ej. `public_html/recetas`).
3. Sube `index.html` y `robots.txt` de este proyecto.
4. Listo — la URL será la de tu dominio (o subdominio/subcarpeta elegida).

**B. Git (recomendado si vas a seguir pidiéndome cambios)**
1. hPanel → Websites → tu sitio → **Avanzado → Git**.
2. Repositorio: `https://github.com/alehcoli/recetas`, rama `main`,
   directorio de instalación: `public_html` (o la subcarpeta elegida).
3. Cada vez que yo haga `git push` a `main`, pulsa "Deploy" en esa misma
   pantalla de hPanel para publicar los cambios (o revisa si tu plan
   permite marcarlo como automático).

Con cualquiera de las dos, comparte la URL resultante con tu mujer —
funciona bien como acceso directo guardado en el móvil.

## Nota sobre las recetas existentes

`apps-script/Code.gs` es el script que ya tenías desplegado (no lo hemos
tocado) — ya sabe leer y escribir la pestaña `Recetas` en el formato real
que usáis.
