# Recetario y menú familiar

Dashboard familiar con recetario filtrable, menú mensual (familia + menú
infantil del cole), lista de la compra y control de congelados. Todo se lee
y se guarda en una Google Sheet compartida, así que tú y tu mujer podéis
entrar desde vuestros propios dispositivos y ver siempre los mismos datos.

## Cómo funciona

```
index.html  ──fetch/POST──>  Google Apps Script (Web App)  ──lee/escribe──>  Google Sheet
(GitHub Pages)                  apps-script/Code.gs
```

- **`index.html`** — toda la app (sin build, sin dependencias). El código
  fuente vive en [github.com/alehcoli/recetas](https://github.com/alehcoli/recetas)
  y se sirve gratis desde GitHub Pages (el repo es público).
- **`apps-script/Code.gs`** — backend, ya desplegado. Vive dentro de la
  Google Sheet (Extensiones → Apps Script) como Web App. Protocolo:
  `GET` devuelve todo el estado; `POST` recibe `{resource, action, ...}`
  para cada cambio (`recipe`, `day`, `frozen`, `shopStore`, `shopManual`,
  `shopHidden`, `importUrl`).
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

⚠️ Este cambio concreto (importar receta desde URL) sí toca
`apps-script/Code.gs` — para que funcione tienes que volver a pegar el
código actualizado en el editor de Apps Script y publicar una **Nueva
versión** siguiendo esos mismos pasos.

### 2. Frontend (GitHub Pages)

El repo es público, así que GitHub Pages es gratis y no hace falta ningún
hosting externo:

1. En GitHub → **Settings → Pages**.
2. En "Build and deployment" → Source: **Deploy from a branch**.
3. Branch: **`main`**, carpeta **`/ (root)`** → **Save**.
4. GitHub tarda uno o dos minutos en publicar. La URL será
   `https://alehcoli.github.io/recetas/`.

Cada `git push` a `main` vuelve a publicar automáticamente — no hay que
hacer nada más. Comparte esa URL con tu mujer, funciona bien como acceso
directo guardado en el móvil.

## Importar receta desde una URL

En el formulario "Añadir receta" hay un campo para pegar la URL de una
receta (blog, web de cocina...) y un botón **"Rellenar desde URL"**. Al
pulsarlo, el propio Web App de Apps Script descarga esa página en el
servidor (así se evita el bloqueo de CORS que tendría el navegador) y
busca los datos estructurados `schema.org/Recipe` que casi todos los
blogs de cocina incluyen para posicionar bien en Google: nombre,
descripción e ingredientes. Rellena esos campos automáticamente, pero
**no guarda nada todavía** — hay que revisar el resultado (sobre todo
tipo de comida, categoría y alérgenos, que no vienen en ese estándar) y
pulsar "Guardar receta" como con cualquier receta añadida a mano.

Si la página no tiene esos datos estructurados (algunas redes sociales,
o webs que los omiten), sale un aviso y no rellena nada — en ese caso
toca copiar los datos a mano como hasta ahora.

## Nota sobre las recetas existentes

`apps-script/Code.gs` es el script que ya tenías desplegado (no lo hemos
tocado) — ya sabe leer y escribir la pestaña `Recetas` en el formato real
que usáis.
