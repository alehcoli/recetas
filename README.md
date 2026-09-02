# Recetario y menú familiar

Dashboard familiar con recetario filtrable, menú mensual (familia + menú
infantil del cole), lista de la compra y control de congelados. Todo se lee
y se guarda en una Google Sheet compartida, así que tú y tu mujer podéis
entrar desde vuestros propios dispositivos y ver siempre los mismos datos.

## Cómo funciona

```
index.html  ──fetch/POST──>  Google Apps Script (Web App)  ──lee/escribe──>  Google Sheet
   (GitHub Pages)                apps-script/Code.gs
```

- **`index.html`** — toda la app (sin build, sin dependencias). Se aloja en
  GitHub Pages para tener una URL fija que ambos podáis abrir.
- **`apps-script/Code.gs`** — backend. Vive dentro de tu Google Sheet
  (Extensiones → Apps Script) y se despliega como "Web App". Expone un único
  endpoint: `GET` para leer todo, `POST` con `{action, ...}` para cada
  cambio (crear/editar receta, guardar un mes de menú, añadir un producto a
  la compra, etc).
- **Pestañas de la Sheet**: `Recetas`, `Menu`, `Congelados`, `CompraExtra`,
  `CompraSupermercados`, `CompraOcultos`. Se pueden editar también a mano
  directamente en la hoja — la app las vuelve a leer en cada recarga.
- Si en algún momento no hay conexión con la Sheet, la app muestra la
  última copia guardada en `localStorage` del navegador (con un aviso) y no
  permite guardar cambios hasta que se recupere la conexión.

## Puesta en marcha

### 1. Backend (Google Apps Script)

1. Abre tu Google Sheet del recetario.
2. Extensiones → Apps Script.
3. Sustituye el contenido por el de [`apps-script/Code.gs`](apps-script/Code.gs)
   de este proyecto.
   - ⚠️ Antes de sustituir: si ya tienes recetas guardadas, revisa la
     sección "RECETAS" del script — puede que haya que ajustar las columnas
     al formato real de tu pestaña actual (ver nota al final de este README).
4. Guarda. Opcional: en el desplegable de funciones (▶) elige `setupSheets`
   y ejecútala una vez para crear de golpe las pestañas nuevas.
5. Implementar → Nueva implementación → tipo "Aplicación web".
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquiera** (así tu mujer no necesita iniciar
     sesión de Google para usar la app; los datos no son sensibles).
6. Autoriza los permisos que pida Google.
7. Copia la URL que te da (termina en `/exec`).
   - Si ya tenías un despliegue anterior (la URL ya usada en `index.html`),
     usa "Gestionar implementaciones" → editar (lápiz) → **Nueva versión**,
     para que la URL no cambie y no haga falta tocar `index.html`.
   - Si es la primera vez, pega esa URL en `index.html`, en la constante
     `SHEET_API_URL` (dentro de `<script>`).

### 2. Frontend (GitHub Pages)

1. Crea un repositorio en GitHub (puede ser privado) y sube este proyecto:
   ```bash
   git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
   git branch -M main
   git push -u origin main
   ```
2. En GitHub: Settings → Pages → Source: "Deploy from a branch" → rama
   `main`, carpeta `/ (root)`.
3. En un par de minutos la app estará en
   `https://<tu-usuario>.github.io/<tu-repo>/`. Comparte ese enlace con tu
   mujer (puede guardarlo como acceso directo en el móvil).

Cada vez que se haga `git push` a `main`, GitHub Pages actualiza la web
sola — no hace falta ningún paso extra.

## Nota sobre las recetas existentes

El backend de este proyecto (`apps-script/Code.gs`) asume que la pestaña
`Recetas` tiene una columna por campo (id, name, short, meals, cats, desc,
ingredients, allergens, source, url, custom). Si tu Google Apps Script
actual guarda las recetas con otras columnas o en otro formato, comparte
ese script (o la fila de cabecera de la pestaña `Recetas`) para adaptar
`RECIPE_HEADERS` / `rowToRecipe` / `recipeToRow` antes de desplegar, y así
no perder las recetas que ya tenéis guardadas.
