/**
 * Recetario Menú Familiar — backend en Google Apps Script (v2)
 * ---------------------------------------------------------
 * Amplía la primera versión (que ya guardaba las Recetas) para guardar
 * también en esta misma Google Sheet: el menú mensual (incluido el menú
 * de los niños, que es parte del mismo día), la lista de la compra y los
 * congelados. Los "Productos de temporada" NO se guardan aquí: son datos
 * fijos que no cambian, así que se quedan como estaban dentro del propio
 * Recetario.
 *
 * CÓMO ACTUALIZAR (ya tienes el proyecto de Apps Script creado):
 * 1. Abre tu Google Sheet > Extensiones > Apps Script.
 * 2. Selecciona TODO el contenido de "Código.gs" (Ctrl/Cmd+A) y bórralo.
 * 3. Pega TODO el contenido de este archivo en su lugar. Guarda (icono de
 *    disquete o Ctrl/Cmd+S).
 * 4. En el desplegable de funciones (arriba), elige "verificarConfiguracion"
 *    y pulsa ▶ Ejecutar. Esto crea automáticamente las pestañas nuevas que
 *    falten (MenuDias, Congelados, CompraTiendas, CompraManual,
 *    CompraOculta) — no hace falta que las crees ni las importes a mano.
 *    Mira el resultado en el registro de ejecución (icono de reloj).
 * 5. MUY IMPORTANTE — esto es distinto de la vez anterior: como ya tenías
 *    un despliegue hecho, guardar el código NO actualiza la URL que ya
 *    usa el Recetario. Tienes que publicar una nueva versión:
 *    Implementar > Gestionar implementaciones > pulsa el icono del lápiz
 *    (✎) en tu implementación activa > en "Versión" elige "Nueva versión"
 *    > Implementar. La URL (termina en /exec) se mantiene igual, solo se
 *    actualiza el código que hay detrás.
 * 6. Avísame cuando lo hayas hecho y seguimos con el Recetario actualizado.
 */

const SHEETS = {
  recipes: {
    name: "Recetas",
    headers: ["id", "name", "short", "meals", "cats", "desc", "ingredients", "allergens", "source", "url", "custom"],
    arrayFields: ["meals", "cats", "ingredients", "allergens"],
    boolFields: ["custom"],
  },
  days: {
    name: "MenuDias",
    headers: ["monthKey", "day", "holiday", "holidayName", "desayuno",
      "ninosPrimero", "ninosSegundo", "ninosGuarnicion", "ninosPostre",
      "adultosPrimero", "adultosSegundo", "adultosGuarnicion", "adultosPostre", "cena"],
    arrayFields: [],
    boolFields: ["holiday"],
  },
  frozen: {
    name: "Congelados",
    headers: ["id", "name", "qty", "date"],
    arrayFields: [],
    boolFields: [],
  },
  shopStores: {
    name: "CompraTiendas",
    headers: ["ingrediente", "tienda"],
    arrayFields: [],
    boolFields: [],
  },
  shopManual: {
    name: "CompraManual",
    headers: ["id", "weekKey", "name", "qty"],
    arrayFields: [],
    boolFields: [],
  },
  shopHidden: {
    name: "CompraOculta",
    headers: ["weekKey", "ingrediente"],
    arrayFields: [],
    boolFields: [],
  },
};

/**
 * Ejecuta esto después de pegar el código, para comprobar que todo está
 * en orden y crear las pestañas nuevas que falten. No borra ni modifica
 * datos existentes (la pestaña "Recetas" se deja tal cual está).
 */
function verificarConfiguracion() {
  const report = [];
  Object.keys(SHEETS).forEach(key => {
    const cfg = SHEETS[key];
    const sheet = getOrCreateSheet_(key);
    const lastRow = sheet.getLastRow();
    report.push("- " + cfg.name + ": " + (lastRow > 1 ? (lastRow - 1) + " fila(s) de datos" : "vacía / recién creada"));
  });
  Logger.log("Comprobación completa:\n" + report.join("\n"));
  Logger.log("✅ Todas las hojas están listas. Ya puedes crear una nueva versión del despliegue si has cambiado el código.");
}

function getOrCreateSheet_(key) {
  const cfg = SHEETS[key];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(cfg.name);
  if (!sheet) {
    sheet = ss.insertSheet(cfg.name);
    sheet.appendRow(cfg.headers);
    sheet.setFrozenRows(1);
    return sheet;
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(cfg.headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function rowToObj_(cfg, headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    let v = row[i];
    if (cfg.arrayFields.indexOf(h) !== -1) {
      try { v = v ? JSON.parse(v) : []; } catch (e) { v = []; }
    } else if (cfg.boolFields.indexOf(h) !== -1) {
      v = (v === true || v === "true" || v === "TRUE");
    } else if (v === undefined || v === null) {
      v = "";
    }
    obj[h] = v;
  });
  return obj;
}

function objToRow_(cfg, obj) {
  return cfg.headers.map(h => {
    if (cfg.arrayFields.indexOf(h) !== -1) return JSON.stringify(obj[h] || []);
    if (cfg.boolFields.indexOf(h) !== -1) return !!obj[h];
    return (obj[h] !== undefined && obj[h] !== null) ? obj[h] : "";
  });
}

function readAll_(key) {
  const cfg = SHEETS[key];
  const sheet = getOrCreateSheet_(key);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .filter(row => row.some(c => c !== "" && c !== null))
    .map(row => rowToObj_(cfg, headers, row));
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Helpers genéricos de fila por clave ---------- */
function findRowIndexByKey_(sheet, headers, keyCols, keyVals) {
  const values = sheet.getDataRange().getValues();
  const idxs = keyCols.map(k => headers.indexOf(k));
  for (let i = 1; i < values.length; i++) {
    let match = true;
    for (let j = 0; j < idxs.length; j++) {
      if (String(values[i][idxs[j]]) !== String(keyVals[j])) { match = false; break; }
    }
    if (match) return i; // índice 0-based dentro de "values" (fila real = i+1)
  }
  return -1;
}

function upsertRow_(key, keyCols, obj) {
  const cfg = SHEETS[key];
  const sheet = getOrCreateSheet_(key);
  const headers = cfg.headers;
  const keyVals = keyCols.map(k => obj[k]);
  const idx = findRowIndexByKey_(sheet, headers, keyCols, keyVals);
  const rowArr = objToRow_(cfg, obj);
  if (idx > -1) {
    sheet.getRange(idx + 1, 1, 1, headers.length).setValues([rowArr]);
  } else {
    sheet.appendRow(rowArr);
  }
}

function deleteRowByKey_(key, keyCols, keyVals) {
  const cfg = SHEETS[key];
  const sheet = getOrCreateSheet_(key);
  const idx = findRowIndexByKey_(sheet, cfg.headers, keyCols, keyVals);
  if (idx > -1) sheet.deleteRow(idx + 1);
}

/** GET → devuelve todo el estado del recetario en una sola respuesta. */
function doGet(e) {
  return jsonOut_({
    recipes: readAll_("recipes"),
    days: readAll_("days"),
    frozen: readAll_("frozen"),
    shopStores: readAll_("shopStores"),
    shopManual: readAll_("shopManual"),
    shopHidden: readAll_("shopHidden"),
  });
}

/**
 * POST → recibe { resource, action, ... }. "resource" indica qué parte
 * del recetario se está modificando; si no viene (clientes antiguos),
 * se asume "recipe" para no romper compatibilidad.
 */
function doPost(e) {
  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut_({ ok: false, error: "JSON inválido: " + err });
  }
  const resource = payload.resource || "recipe";
  try {
    switch (resource) {
      case "recipe": return handleRecipe_(payload);
      case "day": return handleDay_(payload);
      case "frozen": return handleFrozen_(payload);
      case "shopStore": return handleShopStore_(payload);
      case "shopManual": return handleShopManual_(payload);
      case "shopHidden": return handleShopHidden_(payload);
      case "migrate": return handleMigrate_(payload);
      case "importUrl": return handleImportUrl_(payload);
      case "importMenuImage": return handleImportMenuImage_(payload);
      default: return jsonOut_({ ok: false, error: "Recurso desconocido: " + resource });
    }
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function handleRecipe_(payload) {
  const action = payload.action;
  if (action === "create" || action === "update") {
    const recipe = payload.recipe;
    if (!recipe.id) recipe.id = "custom-" + new Date().getTime();
    upsertRow_("recipes", ["id"], recipe);
    return jsonOut_({ ok: true, id: recipe.id });
  }
  if (action === "delete") {
    deleteRowByKey_("recipes", ["id"], [payload.id]);
    return jsonOut_({ ok: true });
  }
  return jsonOut_({ ok: false, error: "Acción desconocida: " + action });
}

function handleDay_(payload) {
  const action = payload.action;
  if (action === "set") {
    upsertRow_("days", ["monthKey", "day"], payload.day);
    return jsonOut_({ ok: true });
  }
  if (action === "bulkSet") {
    const cfg = SHEETS.days;
    const sheet = getOrCreateSheet_("days");
    const values = sheet.getDataRange().getValues();
    const headers = values.length ? values[0] : cfg.headers;
    const mkIdx = headers.indexOf("monthKey"), dIdx = headers.indexOf("day");
    const existing = {};
    for (let i = 1; i < values.length; i++) {
      existing[values[i][mkIdx] + "|" + values[i][dIdx]] = i + 1;
    }
    const toAppend = [];
    (payload.days || []).forEach(day => {
      const k = day.monthKey + "|" + day.day;
      const rowArr = objToRow_(cfg, day);
      if (existing[k]) {
        sheet.getRange(existing[k], 1, 1, headers.length).setValues([rowArr]);
      } else {
        toAppend.push(rowArr);
      }
    });
    if (toAppend.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, toAppend.length, headers.length).setValues(toAppend);
    }
    return jsonOut_({ ok: true, count: (payload.days || []).length });
  }
  if (action === "clearMonth") {
    const sheet = getOrCreateSheet_("days");
    const values = sheet.getDataRange().getValues();
    if (values.length > 1) {
      const headers = values[0];
      const mkIdx = headers.indexOf("monthKey");
      for (let i = values.length - 1; i >= 1; i--) {
        if (String(values[i][mkIdx]) === String(payload.monthKey)) sheet.deleteRow(i + 1);
      }
    }
    return jsonOut_({ ok: true });
  }
  return jsonOut_({ ok: false, error: "Acción desconocida: " + action });
}

function handleFrozen_(payload) {
  const action = payload.action;
  if (action === "create") {
    const item = payload.item;
    if (!item.id) item.id = "frozen-" + new Date().getTime();
    upsertRow_("frozen", ["id"], item);
    return jsonOut_({ ok: true, id: item.id });
  }
  if (action === "delete") {
    deleteRowByKey_("frozen", ["id"], [payload.id]);
    return jsonOut_({ ok: true });
  }
  return jsonOut_({ ok: false, error: "Acción desconocida: " + action });
}

function handleShopStore_(payload) {
  const action = payload.action;
  if (action === "set") {
    upsertRow_("shopStores", ["ingrediente"], { ingrediente: payload.ingrediente, tienda: payload.tienda });
    return jsonOut_({ ok: true });
  }
  if (action === "delete") {
    deleteRowByKey_("shopStores", ["ingrediente"], [payload.ingrediente]);
    return jsonOut_({ ok: true });
  }
  return jsonOut_({ ok: false, error: "Acción desconocida: " + action });
}

function handleShopManual_(payload) {
  const action = payload.action;
  if (action === "create" || action === "update") {
    const item = payload.item;
    if (!item.id) item.id = "shopitem-" + new Date().getTime();
    upsertRow_("shopManual", ["id"], item);
    return jsonOut_({ ok: true, id: item.id });
  }
  if (action === "delete") {
    deleteRowByKey_("shopManual", ["id"], [payload.id]);
    return jsonOut_({ ok: true });
  }
  return jsonOut_({ ok: false, error: "Acción desconocida: " + action });
}

function handleShopHidden_(payload) {
  const action = payload.action;
  if (action === "add") {
    upsertRow_("shopHidden", ["weekKey", "ingrediente"], { weekKey: payload.weekKey, ingrediente: payload.ingrediente });
    return jsonOut_({ ok: true });
  }
  if (action === "remove") {
    deleteRowByKey_("shopHidden", ["weekKey", "ingrediente"], [payload.weekKey, payload.ingrediente]);
    return jsonOut_({ ok: true });
  }
  return jsonOut_({ ok: false, error: "Acción desconocida: " + action });
}

/**
 * Migración única: la primera vez que el Recetario actualizado se conecta
 * y ve estas hojas vacías, sube de golpe lo que ya tenías guardado en el
 * navegador (menú, congelados, compra), para no perder nada.
 */
function handleMigrate_(payload) {
  const results = {};
  ["days", "frozen", "shopStores", "shopManual", "shopHidden"].forEach(key => {
    const items = payload[key] || [];
    if (!items.length) { results[key] = 0; return; }
    const cfg = SHEETS[key];
    const sheet = getOrCreateSheet_(key);
    const rows = items.map(obj => objToRow_(cfg, obj));
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, cfg.headers.length).setValues(rows);
    results[key] = rows.length;
  });
  return jsonOut_({ ok: true, migrated: results });
}

/**
 * Importar receta desde una URL — botón "Importar" del modal "Añadir receta".
 * Descarga la página en el propio servidor (Apps Script no tiene problemas
 * de CORS) y busca datos estructurados schema.org/Recipe en bloques
 * <script type="application/ld+json">, que llevan muchos blogs de recetas.
 * No funciona con Instagram u otras redes sociales, que no incluyen ese
 * marcado — en ese caso se avisa al usuario para que rellene a mano.
 */
function handleImportUrl_(payload) {
  const url = payload.url;
  if (!url) return jsonOut_({ ok: false, error: "Falta la URL." });

  let html;
  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() >= 400) {
      return jsonOut_({ ok: false, error: "La página respondió con un error (" + res.getResponseCode() + ")." });
    }
    html = res.getContentText();
  } catch (err) {
    return jsonOut_({ ok: false, error: "No se ha podido descargar esa URL: " + err });
  }

  const recipes = extractRecipesFromHtml_(html);
  if (!recipes.length) {
    return jsonOut_({ ok: false, error: "No he encontrado datos de receta estructurados en esa página." });
  }
  // Una sola receta: se devuelve para que se revise en el formulario antes de guardar.
  // Varias (p. ej. un artículo con varias recetas marcadas): se devuelven todas, para
  // crear una entrada por cada una directamente.
  if (recipes.length === 1) return jsonOut_({ ok: true, recipe: recipes[0] });
  return jsonOut_({ ok: true, recipes: recipes });
}

function extractRecipesFromHtml_(html) {
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const nodes = [];
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    let data;
    try {
      data = JSON.parse(match[1].trim());
    } catch (e) {
      continue; // bloque JSON-LD mal formado; probamos el siguiente
    }
    findAllRecipeNodes_(data, nodes);
  }
  return nodes.map(normalizeRecipe_);
}

/** Busca recursivamente TODOS los nodos cuyo @type incluya "Recipe" (schema.org puede anidarlo en @graph, arrays, o traer varias recetas en una misma página). */
function findAllRecipeNodes_(node, results) {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach(n => findAllRecipeNodes_(n, results));
    return;
  }
  if (typeof node !== "object") return;
  const type = node["@type"];
  const isRecipe = type === "Recipe" || (Array.isArray(type) && type.indexOf("Recipe") !== -1);
  if (isRecipe) results.push(node);
  if (node["@graph"]) findAllRecipeNodes_(node["@graph"], results);
}

function normalizeRecipe_(node) {
  const name = plainText_(node.name);
  const ingredients = (node.recipeIngredient || node.ingredients || []).map(plainText_).filter(Boolean);
  const desc = plainText_(node.description) || instructionsToText_(node.recipeInstructions);
  return { name: name, desc: desc, ingredients: ingredients };
}

function instructionsToText_(instructions) {
  if (!instructions) return "";
  if (typeof instructions === "string") return plainText_(instructions);
  if (Array.isArray(instructions)) {
    return instructions.map(step => {
      if (typeof step === "string") return plainText_(step);
      return plainText_(step.text || step.name || "");
    }).filter(Boolean).join(" ");
  }
  return "";
}

function plainText_(v) {
  if (!v) return "";
  return String(v).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Importar menú del cole desde una foto o PDF — botón "✨ Extraer menú con IA"
 * del modal "Subir / crear nuevo menú mensual". Envía el archivo a la API de
 * Gemini (Google) pidiéndole que devuelva, día a día, la comida de los niños
 * (primero/segundo/guarnición/postre) y los festivos marcados en el
 * documento. Solo toca esos campos: si el día ya tenía desayuno, cena o
 * comida de adultos guardados, se conservan tal cual.
 *
 * Requiere una API key gratuita de Google AI Studio (https://aistudio.google.com/apikey)
 * guardada como propiedad del script: Apps Script → ⚙️ Configuración del
 * proyecto → Propiedades del script → añade GEMINI_API_KEY con tu clave.
 * Opcionalmente se puede fijar también GEMINI_MODEL (por defecto "gemini-2.5-flash").
 */
function handleImportMenuImage_(payload) {
  const action = payload.action;
  if (action !== "extract") return jsonOut_({ ok: false, error: "Acción desconocida: " + action });

  const monthKey = payload.monthKey;
  const year = Number(payload.year);
  const month = Number(payload.month); // 0-indexado
  const imageBase64 = payload.image;
  const mimeType = payload.mimeType || "image/jpeg";
  if (!monthKey || !imageBase64) return jsonOut_({ ok: false, error: "Faltan datos (mes o archivo)." });

  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty("GEMINI_API_KEY");
  if (!apiKey) {
    return jsonOut_({ ok: false, error: "No hay ninguna clave de Gemini configurada en el servidor. Ve a Apps Script → Configuración del proyecto → Propiedades del script y añade GEMINI_API_KEY (gratis en aistudio.google.com/apikey)." });
  }
  const model = props.getProperty("GEMINI_MODEL") || "gemini-2.5-flash";

  const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const monthName = monthNames[month] || "";
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prompt = "Esta imagen o documento es el menú escolar mensual de un colegio en España, para " + monthName + " de " + year +
    ". Extrae ÚNICAMENTE el menú de la COMIDA (almuerzo) de los niños, día a día del mes (el mes tiene " + daysInMonth + " días). " +
    "Para cada día del mes que aparezca en el documento con menú, devuelve un objeto con: " +
    "\"day\" (número del día, entero entre 1 y " + daysInMonth + "), \"holiday\" (true si ese día es festivo o no hay cole, false en caso contrario), " +
    "\"holidayName\" (nombre del festivo si el documento lo indica, si no cadena vacía), " +
    "\"primero\" (primer plato), \"segundo\" (segundo plato), \"guarnicion\" (guarnición del segundo, cadena vacía si no aplica), " +
    "\"postre\" (postre o fruta, cadena vacía si no aplica). " +
    "Si un día no aparece en el documento (por ejemplo fines de semana) NO lo incluyas en el resultado. " +
    "Responde EXCLUSIVAMENTE con el array JSON de esos objetos, sin ningún texto adicional.";

  const requestBody = {
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType: mimeType, data: imageBase64 } },
        { text: prompt }
      ]
    }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            day: { type: "INTEGER" },
            holiday: { type: "BOOLEAN" },
            holidayName: { type: "STRING" },
            primero: { type: "STRING" },
            segundo: { type: "STRING" },
            guarnicion: { type: "STRING" },
            postre: { type: "STRING" }
          },
          required: ["day"]
        }
      }
    }
  };

  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(apiKey);
  let res;
  try {
    res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(requestBody),
      muteHttpExceptions: true
    });
  } catch (err) {
    return jsonOut_({ ok: false, error: "No se ha podido contactar con Gemini: " + err });
  }
  const code = res.getResponseCode();
  if (code >= 400) {
    return jsonOut_({ ok: false, error: "Gemini devolvió un error (" + code + "): " + res.getContentText().slice(0, 300) });
  }

  let extracted;
  try {
    const data = JSON.parse(res.getContentText());
    const text = data.candidates[0].content.parts[0].text;
    extracted = JSON.parse(text);
  } catch (err) {
    return jsonOut_({ ok: false, error: "No se ha podido interpretar la respuesta de Gemini: " + err });
  }
  if (!Array.isArray(extracted) || !extracted.length) {
    return jsonOut_({ ok: false, error: "Gemini no ha encontrado ningún día con menú en ese documento." });
  }

  // Fusiona con los días ya existentes del mes: solo se actualiza la comida
  // de los niños y el festivo, conservando desayuno/cena/adultos si ya había algo.
  const cfg = SHEETS.days;
  const sheet = getOrCreateSheet_("days");
  const values = sheet.getDataRange().getValues();
  const headers = values.length ? values[0] : cfg.headers;
  const mkIdx = headers.indexOf("monthKey"), dIdx = headers.indexOf("day");
  const existingRows = {};
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][mkIdx]) === String(monthKey)) {
      existingRows[Number(values[i][dIdx])] = rowToObj_(cfg, headers, values[i]);
    }
  }

  const resultDays = [];
  extracted.forEach(item => {
    const dayNum = Number(item.day);
    if (!dayNum || dayNum < 1 || dayNum > daysInMonth) return;
    const base = existingRows[dayNum] || {
      monthKey: monthKey, day: dayNum, holiday: false, holidayName: "", desayuno: "",
      ninosPrimero: "", ninosSegundo: "", ninosGuarnicion: "", ninosPostre: "",
      adultosPrimero: "", adultosSegundo: "", adultosGuarnicion: "", adultosPostre: "", cena: ""
    };
    base.monthKey = monthKey;
    base.day = dayNum;
    base.holiday = !!item.holiday;
    base.holidayName = item.holidayName || "";
    base.ninosPrimero = item.primero || "";
    base.ninosSegundo = item.segundo || "";
    base.ninosGuarnicion = item.guarnicion || "";
    base.ninosPostre = item.postre || "";
    resultDays.push(base);
  });

  if (!resultDays.length) {
    return jsonOut_({ ok: false, error: "Gemini no ha encontrado ningún día válido en ese documento." });
  }

  resultDays.forEach(day => upsertRow_("days", ["monthKey", "day"], day));

  return jsonOut_({ ok: true, days: resultDays });
}
