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

- **`index.html`** — toda la app (sin build, sin dependencias). Se despliega
  automáticamente vía GitHub Pages en cada `git push` a `main`:
  `https://alehcoli.github.io/recetas/`.
- **`apps-script/Code.gs`** — backend. Vive dentro de la Google Sheet
  (Extensiones → Apps Script) como Web App. Protocolo: `GET` devuelve todo
  el estado; `POST` recibe `{resource, action, ...}` para cada cambio
  (`recipe`, `day`, `frozen`, `shopStore`, `shopManual`, `shopHidden`,
  `importUrl`).
  - `importUrl`: botón "Importar" del modal de añadir receta. Descarga la
    URL en el propio servidor (sin líos de CORS) y busca datos
    schema.org/Recipe (`<script type="application/ld+json">`). Si la página
    marca varias recetas a la vez (poco común, pero algunos sitios lo
    hacen), crea una entrada por cada una directamente — sin tipo de
    comida/categoría, que hay que rellenar luego editándolas, porque ese
    dato no viene en la página. Funciona con blogs de recetas; no funciona
    con Instagram/redes sociales, ni con artículos sin ese marcado (p. ej.
    El Comidista), que no llevan datos estructurados — en esos casos hay
    que rellenar a mano o pedirle a Claude que lea el artículo y las añada.
  - `importMenuImage`: botón "✨ Extraer menú con IA" del modal "Subir /
    crear nuevo menú mensual". Envía la foto o PDF del menú del cole a la
    API de Gemini (Google), que devuelve día a día la comida de los niños
    (primero, segundo, guarnición, postre) y los festivos marcados en el
    documento; solo se actualizan esos campos, conservando desayuno, cena y
    comida de adultos si ya había algo guardado ese día. Requiere una
    variable `GEMINI_API_KEY` en las propiedades del script (ver más abajo)
    — gratis, sin coste real para este uso. Opcionalmente se puede fijar
    `GEMINI_MODEL` (por defecto `gemini-3.6-flash`).
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

### 1. Backend (Google Apps Script)

Cada vez que cambie `apps-script/Code.gs` (como con la función `importUrl`),
hay que pegarlo en el editor de verdad y publicar una nueva versión:

1. Abre tu Google Sheet → Extensiones → Apps Script.
2. Sustituye todo el contenido por el de `apps-script/Code.gs` de este repo.
3. Guarda. Implementar → Gestionar implementaciones → editar (lápiz) →
   **Nueva versión** → Implementar (no "nueva implementación", o la URL
   cambiaría y habría que actualizar `SHEET_API_URL` en `index.html`).

**Solo la primera vez**, para que funcione "✨ Extraer menú con IA":

1. Consigue una API key gratuita de Gemini en
   [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (con tu
   cuenta de Google; no hace falta tarjeta).
2. En el editor de Apps Script: icono de engranaje ⚙️ "Configuración del
   proyecto" → sección "Propiedades del script" → "Añadir propiedad de
   script".
3. Añade una propiedad `GEMINI_API_KEY` con el valor de tu clave. Guarda.

### 2. Frontend (GitHub Pages) — ya hecho

Se despliega solo en cada `git push` a `main`. Nada que hacer aquí.

## Nota sobre las recetas existentes

`apps-script/Code.gs` es el script que ya tenías desplegado (no lo hemos
tocado) — ya sabe leer y escribir la pestaña `Recetas` en el formato real
que usáis.
