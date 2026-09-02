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
